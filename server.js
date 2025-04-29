const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Room management
const users = {};
const socketToRoom = {};
const MAX_USERS_PER_ROOM = 10; // Set a reasonable limit

io.on("connection", (socket) => {
  socket.on("join room", (roomID) => {
    // Initialize room if it doesn't exist
    if (!users[roomID]) {
      users[roomID] = [];
    }

    // Check if room is full
    if (users[roomID].length >= MAX_USERS_PER_ROOM) {
      socket.emit("room full");
      return;
    }

    // Add user to room
    users[roomID].push(socket.id);
    socketToRoom[socket.id] = roomID;

    // Send all existing users to the new user
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);
    socket.emit("all users", usersInThisRoom);

    console.log(
      `User ${socket.id} joined room ${roomID}, now has ${users[roomID].length} users`,
    );
  });

  // Handle signaling for WebRTC
  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
    console.log(
      `Signal sent from ${payload.callerID} to ${payload.userToSignal}`,
    );
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
    console.log(`Return signal sent from ${socket.id} to ${payload.callerID}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    if (roomID) {
      // Remove user from room
      users[roomID] = users[roomID].filter((id) => id !== socket.id);

      // Notify others in the room
      socket.broadcast.to(roomID).emit("user left", socket.id);

      console.log(
        `User ${socket.id} left room ${roomID}, ${users[roomID].length} users remaining`,
      );

      // Clean up empty rooms
      if (users[roomID].length === 0) {
        delete users[roomID];
        console.log(`Room ${roomID} deleted (empty)`);
      }
    }

    // Clean up socket mapping
    delete socketToRoom[socket.id];
  });
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
