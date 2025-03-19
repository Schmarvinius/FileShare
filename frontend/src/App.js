import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';

const socket = io('http://localhost:3001'); // Connect to the backend

function App() {
  const [file, setFile] = useState(null);
  const [fileId, setFileId] = useState('');
  const [downloadFileId, setDownloadFileId] = useState('');
  const [downloadedData, setDownloadedData] = useState(null);
  const peerRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    const fileId = Math.random().toString(36).substring(2, 15);
    setFileId(fileId);

    await fetch('http://localhost:3001/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, fileName: file.name, fileSize: file.size }),
    });
  };

  const handleDownload = async () => {
    const metadata = await fetch(`http://localhost:3001/files/${downloadFileId}`).then((res) => res.json());

    const peer = new SimplePeer({ initiator: true, trickle: false });
    peerRef.current = peer;

    socket.on('signal', (data) => {
      if (peerRef.current && data.from !== socket.id) {
        peerRef.current.signal(data.signal);
      }
    });

    peer.on('signal', (data) => {
      socket.emit('signal', { to: 'other-peer-id', signal: data }); // Replace 'other-peer-id'
    });

    peer.on('data', (data) => {
      setDownloadedData(data);
    });
  };

  return (
    <div>
      <h2>File Sharing App</h2>
      <div>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload}>Upload</button>
        {fileId && <p>File ID: {fileId}</p>}
      </div>
      <div>
        <input type="text" placeholder="File ID to download" onChange={(e) => setDownloadFileId(e.target.value)} />
        <button onClick={handleDownload}>Download</button>
        {downloadedData && (
          <a href={URL.createObjectURL(new Blob([downloadedData]))} download="downloadedFile">
            Download File
          </a>
        )}
      </div>
    </div>
  );
}

export default App;
