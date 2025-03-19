const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
	cors: {
		origin: "http://localhost:3000", // Your React app's origin
		methods: ["GET", "POST"]
	}
});

app.use(cors());
app.use(express.json());

const files = {}; // In-memory metadata storage (replace with a database later)

app.post('/files', (req, res) => {
	const { fileId, fileName, fileSize } = req.body;
	files[fileId] = { fileName, fileSize };
	res.json({ message: 'File metadata stored' });
});

app.get('/files/:fileId', (req, res) => {
	const file = files[req.params.fileId];
	if (file) {
		res.json(file);
	} else {
		res.status(404).json({ message: 'File not found' });
	}
});

io.on('connection', (socket) => {
	console.log('A user connected');

	socket.on('signal', (data) => {
		io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
	});

	socket.on('disconnect', () => {
		console.log('A user disconnected');
	});
});

server.listen(3001, () => {
	console.log('Server listening on port 3001');
});
