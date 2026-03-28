import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import "./CreateRoom.css";

const CreateRoom = () => {
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);

  const createRoom = () => {
    const roomId = uuidv4();
    navigate(`/room/${roomId}`, { state: { roomId } });
  };

  const joinRoom = () => {
    const trimmed = joinRoomId.trim();
    if (trimmed) {
      navigate(`/room/${trimmed}`);
    }
  };

  return (
    <div className="create-room">
      <h2>Share Files Securely</h2>
      <p>Create a room or join an existing one to start sharing files</p>

      <div className="button-group">
        <button onClick={createRoom} className="create-button">
          Create New Room
        </button>
        {!showJoinInput ? (
          <button onClick={() => setShowJoinInput(true)} className="join-button">
            Join Existing Room
          </button>
        ) : (
          <div className="join-input-group">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              autoFocus
            />
            <button onClick={joinRoom} className="join-button" disabled={!joinRoomId.trim()}>
              Join
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateRoom;
