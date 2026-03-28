import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import Peer from "simple-peer";
import "./Room.css";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

const Room = () => {
  const [peers, setPeers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [files, setFiles] = useState([]);
  const [transferProgress, setTransferProgress] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [numConnections, setNumConnections] = useState(0);
  const [roomFull, setRoomFull] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const navigate = useNavigate();

  const socketRef = useRef();
  const peersRef = useRef([]);

  const { roomID } = useParams();

  useEffect(() => {
    // Connect to the socket server with reconnection
    const serverUrl = process.env.REACT_APP_SERVER_URL || window.location.origin;
    socketRef.current = io.connect(serverUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current.on("connect", () => {
      setSocketConnected(true);
      // Re-join room on reconnect
      socketRef.current.emit("join room", roomID);
    });

    socketRef.current.on("disconnect", () => {
      setSocketConnected(false);
    });

    // Join the room immediately - no media required
    socketRef.current.emit("join room", roomID);

    // Handle when all existing users are received
    socketRef.current.on("all users", (users) => {
      console.log("Received all users:", users);
      const peers = [];
      users.forEach((userID) => {
        const peer = createPeer(userID, socketRef.current.id);
        peersRef.current.push({
          peerID: userID,
          peer,
        });
        peers.push({ peerID: userID, peer });
      });
      setPeers(peers);
    });

    socketRef.current.on("user joined", (payload) => {
      console.log("User joined:", payload.callerID);

      // Prevent duplicate peers on rapid reconnect
      const existing = peersRef.current.find((p) => p.peerID === payload.callerID);
      if (existing) {
        existing.peer.destroy();
        peersRef.current = peersRef.current.filter((p) => p.peerID !== payload.callerID);
      }

      const peer = addPeer(payload.signal, payload.callerID);
      peersRef.current.push({
        peerID: payload.callerID,
        peer,
      });

      // Add the new peer to the state
      setPeers((users) => [
        ...users.filter((p) => p.peerID !== payload.callerID),
        { peerID: payload.callerID, peer },
      ]);
    });

    // Critical fix: Handle receiving returned signal
    socketRef.current.on("receiving returned signal", (payload) => {
      console.log("Received returned signal from:", payload.id);
      const item = peersRef.current.find((p) => p.peerID === payload.id);
      if (item) {
        item.peer.signal(payload.signal);
      }
    });

    socketRef.current.on("user left", (id) => {
      console.log("User left:", id);
      const peerObj = peersRef.current.find((p) => p.peerID === id);
      if (peerObj) {
        peerObj.peer.destroy();
      }
      const remainingPeers = peersRef.current.filter((p) => p.peerID !== id);
      peersRef.current = remainingPeers;
      setPeers((peers) => peers.filter((p) => p.peerID !== id));

      // Update connection count
      setNumConnections((prev) => Math.max(0, prev - 1));
    });

    // Room full notification
    socketRef.current.on("room full", () => {
      setRoomFull(true);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      peersRef.current.forEach((peer) => {
        if (peer.peer) {
          peer.peer.destroy();
        }
      });
      // Revoke all object URLs to free memory
      setFiles((prevFiles) => {
        prevFiles.forEach((file) => URL.revokeObjectURL(file.url));
        return [];
      });
    };
  }, [roomID]);

  // Sync connected state with numConnections
  useEffect(() => {
    if (numConnections === 0) {
      setConnected(false);
    }
  }, [numConnections]);

  // Log connection status changes
  useEffect(() => {
    console.log(
      `Connected status changed: ${connected}, connections: ${numConnections}`,
    );
  }, [connected, numConnections]);

  // Create a peer as the initiator
  function createPeer(userToSignal, callerID) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: ICE_SERVERS,
    });

    // Set up data channel as initiator
    peer.on("signal", (signal) => {
      socketRef.current.emit("sending signal", {
        userToSignal,
        callerID,
        signal,
      });
    });

    peer.on("connect", () => {
      console.log("Peer connected (initiator)");
      setNumConnections((prev) => prev + 1);
      setConnected(true);
    });

    peer.on("error", (err) => {
      console.error("Peer error (initiator):", err);
    });

    peer.on("close", () => {
      console.log("Peer connection closed (initiator)");
      setNumConnections((prev) => Math.max(0, prev - 1));
    });

    // Handle data channel
    peer.on("data", handleReceivingData);

    return peer;
  }

  // Create a peer as the receiver
  function addPeer(incomingSignal, callerID) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      config: ICE_SERVERS,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("returning signal", { signal, callerID });
    });

    peer.on("connect", () => {
      console.log("Peer connected (receiver)");
      setNumConnections((prev) => prev + 1);
      setConnected(true);
    });

    peer.on("error", (err) => {
      console.error("Peer error (receiver):", err);
    });

    peer.on("close", () => {
      console.log("Peer connection closed (receiver)");
      setNumConnections((prev) => Math.max(0, prev - 1));
    });

    // Handle data channel
    peer.on("data", handleReceivingData);

    // Signal the peer with the incoming signal
    peer.signal(incomingSignal);
    return peer;
  }

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && connected && peers.length > 0) {
      setSelectedFiles(files);
    }
  };

  // Clean up a transfer progress entry after a delay
  const cleanupProgress = (fileId) => {
    setTimeout(() => {
      setTransferProgress((prev) => {
        const { [fileId]: _, ...rest } = prev;
        return rest;
      });
    }, 3000);
  };

  // Send a single file to all connected peers
  const sendSingleFile = (file) => {
    return new Promise((resolve) => {
      const metadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };

      setTransferProgress((prev) => ({
        ...prev,
        [metadata.id]: { progress: 0, name: metadata.name, sending: true, startTime: Date.now(), transferred: 0 },
      }));

      peersRef.current.forEach(({ peer }) => {
        if (peer.connected) {
          try {
            peer.send(JSON.stringify({ type: "metadata", metadata }));
          } catch (err) {
            console.error("Error sending metadata:", err);
          }
        }
      });

      const chunkSize = 16 * 1024;
      const BUFFER_THRESHOLD = 256 * 1024;
      const reader = new FileReader();
      let offset = 0;

      const waitForDrain = (peer) => {
        return new Promise((drainResolve) => {
          const check = () => {
            if (!peer._channel || peer._channel.bufferedAmount <= BUFFER_THRESHOLD) {
              drainResolve();
            } else {
              setTimeout(check, 50);
            }
          };
          check();
        });
      };

      reader.onload = async (e) => {
        const chunk = e.target.result;

        for (const { peer } of peersRef.current) {
          if (peer.connected) {
            try {
              await waitForDrain(peer);
              const fileIdBytes = new TextEncoder().encode(metadata.id);
              const header = new Uint8Array(4);
              new DataView(header.buffer).setUint32(0, fileIdBytes.length);
              const chunkData = new Uint8Array(chunk);
              const packet = new Uint8Array(4 + fileIdBytes.length + chunkData.length);
              packet.set(header, 0);
              packet.set(fileIdBytes, 4);
              packet.set(chunkData, 4 + fileIdBytes.length);
              peer.send(packet);
            } catch (err) {
              console.error("Error sending chunk:", err);
            }
          }
        }

        offset += chunk.byteLength;
        const progress = Math.min(100, Math.floor((offset / file.size) * 100));

        setTransferProgress((prev) => ({
          ...prev,
          [metadata.id]: { ...prev[metadata.id], progress, transferred: offset },
        }));

        if (offset < file.size) {
          readSlice(offset);
        } else {
          peersRef.current.forEach(({ peer }) => {
            if (peer.connected) {
              try {
                peer.send(JSON.stringify({ type: "complete", fileId: metadata.id }));
              } catch (err) {
                console.error("Error sending completion notice:", err);
              }
            }
          });
          cleanupProgress(metadata.id);
          resolve();
        }
      };

      const readSlice = (o) => {
        const slice = file.slice(o, o + chunkSize);
        reader.readAsArrayBuffer(slice);
      };

      readSlice(0);
    });
  };

  // Send all selected files sequentially
  const sendFiles = async () => {
    if (selectedFiles.length === 0 || peers.length === 0 || !connected) return;

    const filesToSend = [...selectedFiles];
    setSelectedFiles([]);
    document.getElementById("file-input").value = "";

    for (const file of filesToSend) {
      await sendSingleFile(file);
    }
  };

  // Receive file data logic
  const fileChunks = useRef({});

  function handleReceivingData(data) {
    try {
      // Binary data = chunk packet
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
        const fileIdLen = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0);
        const fileId = new TextDecoder().decode(bytes.slice(4, 4 + fileIdLen));
        const chunkData = bytes.slice(4 + fileIdLen);

        if (fileChunks.current[fileId]) {
          fileChunks.current[fileId].chunks.push(chunkData);
          fileChunks.current[fileId].receivedSize += chunkData.length;

          const progress = Math.min(
            100,
            Math.floor(
              (fileChunks.current[fileId].receivedSize /
                fileChunks.current[fileId].metadata.size) *
                100,
            ),
          );

          setTransferProgress((prev) => ({
            ...prev,
            [fileId]: { ...prev[fileId], progress, transferred: fileChunks.current[fileId].receivedSize },
          }));
        }
        return;
      }

      // String data = JSON control message (metadata or complete)
      const parsed = JSON.parse(data);

      if (parsed.type === "metadata") {
        // New file incoming, prepare to receive chunks
        const { metadata } = parsed;
        fileChunks.current[metadata.id] = {
          metadata,
          chunks: [],
          receivedSize: 0,
        };

        // Set progress state for UI
        setTransferProgress((prev) => ({
          ...prev,
          [metadata.id]: { progress: 0, name: metadata.name, sending: false, startTime: Date.now(), transferred: 0 },
        }));
      } else if (parsed.type === "complete") {
        // File transfer complete, assemble and save
        const { fileId } = parsed;
        const fileData = fileChunks.current[fileId];

        if (fileData) {
          // Combine all chunks
          let combinedArray = new Uint8Array(fileData.receivedSize);
          let offset = 0;

          fileData.chunks.forEach((chunk) => {
            combinedArray.set(chunk, offset);
            offset += chunk.length;
          });

          // Create blob and save
          const blob = new Blob([combinedArray], {
            type: fileData.metadata.type,
          });
          const url = URL.createObjectURL(blob);

          setFiles((prevFiles) => [
            ...prevFiles,
            {
              id: fileId,
              name: fileData.metadata.name,
              type: fileData.metadata.type,
              url,
              size: fileData.metadata.size,
            },
          ]);

          // Clean up
          delete fileChunks.current[fileId];
          cleanupProgress(fileId);
        }
      } else if (parsed.type === "chat") {
        setChatMessages((prev) => [
          ...prev,
          { text: parsed.text, sender: "peer", timestamp: Date.now() },
        ]);
      }
    } catch (e) {
      console.error("Error parsing received data", e);
    }
  }

  // Handle file download when user clicks on a received file
  const downloadFile = (file) => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(file.url);
  };

  // Send chat message
  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text || !connected) return;

    peersRef.current.forEach(({ peer }) => {
      if (peer.connected) {
        try {
          peer.send(JSON.stringify({ type: "chat", text }));
        } catch (err) {
          console.error("Error sending chat message:", err);
        }
      }
    });

    setChatMessages((prev) => [
      ...prev,
      { text, sender: "me", timestamp: Date.now() },
    ]);
    setChatInput("");
  };

  // Format transfer speed
  const formatSpeed = (transferred, startTime) => {
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed < 0.5) return "";
    const bytesPerSec = transferred / elapsed;
    return formatBytes(bytesPerSec) + "/s";
  };

  // Format file size
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (roomFull) {
    return (
      <div className="room">
        <div className="room-info">
          <h2>Room is Full</h2>
          <p>This room has reached its maximum capacity. Please try another room.</p>
          <button onClick={() => navigate("/")} className="copy-button">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="room">
      {!socketConnected && (
        <div className="connection-warning">
          Connection lost. Reconnecting...
        </div>
      )}
      <div className="room-info">
        <h2>Room: {roomID}</h2>
        <p>
          Status:{" "}
          {connected
            ? `Connected (${numConnections} peer${numConnections !== 1 ? "s" : ""})`
            : "Waiting for peers..."}
        </p>
        <p>Share this Room ID with others to let them join this room.</p>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="copy-button"
        >
          Copy Room Link
        </button>
      </div>

      <div
        className={`file-transfer${isDragging ? " drag-active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="file-select">
          <div className="drop-zone">
            <p className="drop-zone-text">
              {isDragging ? "Drop file here" : "Drag & drop a file here, or"}
            </p>
            <input
              id="file-input"
              type="file"
              multiple
              onChange={handleFileChange}
              disabled={!connected || peers.length === 0}
            />
          </div>
          <button
            onClick={sendFiles}
            disabled={selectedFiles.length === 0 || !connected || peers.length === 0}
          >
            Send {selectedFiles.length > 1 ? `${selectedFiles.length} Files` : "File"}
          </button>
          {selectedFiles.length > 0 && (
            <p>
              Selected: {selectedFiles.map((f) => f.name).join(", ")} (
              {formatBytes(selectedFiles.reduce((sum, f) => sum + f.size, 0))})
            </p>
          )}
        </div>

        {/* Progress Bars */}
        {Object.entries(transferProgress).map(
          ([fileId, { progress, name, sending, startTime, transferred }]) => (
            <div key={fileId} className="progress-container">
              <p>
                {sending ? "Sending: " : "Receiving: "}
                {name} - {progress}%
                {progress < 100 && transferred > 0 && (
                  <span className="transfer-speed"> ({formatSpeed(transferred, startTime)})</span>
                )}
              </p>
              <div className="progress-bar">
                <div
                  className="progress"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Received Files List */}
      {files.length > 0 && (
        <div className="received-files">
          <h3>Received Files</h3>
          <ul>
            {files.map((file) => (
              <li key={file.id} onClick={() => downloadFile(file)}>
                {file.type.startsWith("image/") && (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="file-preview"
                  />
                )}
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">({formatBytes(file.size)})</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Chat */}
      <div className="chat-section">
        <h3>Chat</h3>
        <div className="chat-messages">
          {chatMessages.length === 0 && (
            <p className="chat-empty">No messages yet</p>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.sender === "me" ? "chat-me" : "chat-peer"}`}>
              <span className="chat-sender">{msg.sender === "me" ? "You" : "Peer"}</span>
              <span className="chat-text">{msg.text}</span>
            </div>
          ))}
        </div>
        <div className="chat-input-group">
          <input
            type="text"
            placeholder={connected ? "Type a message..." : "Connect to chat"}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
            disabled={!connected}
          />
          <button onClick={sendChatMessage} disabled={!connected || !chatInput.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Room;
