import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import './CreateRoom.css';

const CreateRoom = () => {
  const navigate = useNavigate();

  const createRoom = () => {
    const roomId = uuidv4();
    navigate(`/room/${roomId}`);
  };

  const joinRoom = () => {
    const roomId = prompt('Enter Room ID:');
    if (roomId) {
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <div className="create-room">
      <h2>Share Files Securely</h2>
      <p>Create a room or join an existing one to start sharing files</p>

      <div className="button-group">
        <button onClick={createRoom} className="create-button">Create New Room</button>
        <button onClick={joinRoom} className="join-button">Join Existing Room</button>
      </div>
    </div>
  );
};

export default CreateRoom;
