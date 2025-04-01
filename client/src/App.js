import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import CreateRoom from './components/CreateRoom';
import Room from './components/Room';
import process from 'process';
window.process = process;

function App() {
  return (
    <Router>
      <div className="app">
        <header>
          <h1>WebRTC File Sharing</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<CreateRoom />} />
            <Route path="/room/:roomID" element={<Room />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
