import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import Peer from "simple-peer";
import "./Room.css";

const Room = () => {
  const [peers, setPeers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [files, setFiles] = useState([]);
  const [transferProgress, setTransferProgress] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [numConnections, setNumConnections] = useState(0); // Track number of active connections

  const socketRef = useRef();
  const peersRef = useRef([]);
  const dataChannelRef = useRef(null);

  const { roomID } = useParams();

  useEffect(() => {
    // Connect to the socket server
    socketRef.current = io.connect("http://localhost:8000");

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
      const peer = addPeer(payload.signal, payload.callerID);
      peersRef.current.push({
        peerID: payload.callerID,
        peer,
      });

      // Add the new peer to the state
      setPeers((users) => [...users, { peerID: payload.callerID, peer }]);
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
      alert("Room is full. Please try another room.");
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
    };
  }, [roomID]);

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
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
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
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
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
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Send the file data
  const sendFile = () => {
    if (!selectedFile || peers.length === 0 || !connected) return;

    // File metadata
    const metadata = {
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
      id: `file-${Date.now()}`,
    };

    // Set up progress tracking
    setTransferProgress((prev) => ({
      ...prev,
      [metadata.id]: { progress: 0, name: metadata.name, sending: true },
    }));

    // Send metadata first
    peersRef.current.forEach(({ peer }) => {
      if (peer.connected) {
        try {
          peer.send(JSON.stringify({ type: "metadata", metadata }));
        } catch (err) {
          console.error("Error sending metadata:", err);
        }
      }
    });

    // Read and send the file in chunks
    const chunkSize = 16 * 1024; // 16KB chunks
    const reader = new FileReader();
    let offset = 0;

    reader.onload = (e) => {
      const chunk = e.target.result;

      peersRef.current.forEach(({ peer }) => {
        if (peer.connected) {
          try {
            peer.send(
              JSON.stringify({
                type: "chunk",
                fileId: metadata.id,
                chunk: Array.from(new Uint8Array(chunk)),
              }),
            );
          } catch (err) {
            console.error("Error sending chunk:", err);
          }
        }
      });

      offset += chunk.byteLength;
      const progress = Math.min(
        100,
        Math.floor((offset / selectedFile.size) * 100),
      );

      setTransferProgress((prev) => ({
        ...prev,
        [metadata.id]: { ...prev[metadata.id], progress },
      }));

      // If not done, continue reading
      if (offset < selectedFile.size) {
        readSlice(offset);
      } else {
        // Done sending, notify peer
        peersRef.current.forEach(({ peer }) => {
          if (peer.connected) {
            try {
              peer.send(
                JSON.stringify({
                  type: "complete",
                  fileId: metadata.id,
                }),
              );
            } catch (err) {
              console.error("Error sending completion notice:", err);
            }
          }
        });

        setSelectedFile(null);
        // Reset the file input
        document.getElementById("file-input").value = "";
      }
    };

    const readSlice = (o) => {
      const slice = selectedFile.slice(o, o + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    readSlice(0);
  };

  // Receive file data logic
  const fileChunks = useRef({});

  function handleReceivingData(data) {
    try {
      const parsed = JSON.parse(data);

      // Handle different message types
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
          [metadata.id]: { progress: 0, name: metadata.name, sending: false },
        }));
      } else if (parsed.type === "chunk") {
        // Received a chunk, append it
        const { fileId, chunk } = parsed;
        const uint8Array = new Uint8Array(chunk);

        if (fileChunks.current[fileId]) {
          fileChunks.current[fileId].chunks.push(uint8Array);
          fileChunks.current[fileId].receivedSize += uint8Array.length;

          // Update progress
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
            [fileId]: { ...prev[fileId], progress },
          }));
        }
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
        }
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
  };

  // Format file size
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="room">
      <div className="room-info">
        <h2>Room: {roomID}</h2>
        <p>
          Status:{" "}
          {connected
            ? `Connected (${numConnections} peer${numConnections !== 1 ? "s" : ""})`
            : "Waiting for peers..."}
        </p>
        <p>Share this Room ID with others to let them join this room.</p>
      </div>

      <div className="file-transfer">
        <div className="file-select">
          <input
            id="file-input"
            type="file"
            onChange={handleFileChange}
            disabled={!connected || peers.length === 0}
          />
          <button
            onClick={sendFile}
            disabled={!selectedFile || !connected || peers.length === 0}
          >
            Send File
          </button>
          {selectedFile && (
            <p>
              Selected file: {selectedFile.name} (
              {formatBytes(selectedFile.size)})
            </p>
          )}
        </div>

        {/* Progress Bars */}
        {Object.entries(transferProgress).map(
          ([fileId, { progress, name, sending }]) => (
            <div key={fileId} className="progress-container">
              <p>
                {sending ? "Sending: " : "Receiving: "}
                {name} - {progress}%
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
                <span className="file-name">{file.name}</span>
                <span className="file-size">({formatBytes(file.size)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Room;
