const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
	cors: {
		// IMPORTANT: This allows your Vercel frontend to connect
		origin: "*",
		methods: ["GET", "POST"]
	}
});

// Simple route to check if server is alive (useful for Render dashboard)
app.get("/", (req, res) => {
	res.send("Signaling Server is Running");
});

io.on("connection", (socket) => {
	socket.emit("me", socket.id);

	socket.on("disconnect", () => {
		socket.broadcast.emit("callEnded");
	});

	// 1. User joins a specific Room
	socket.on("join-room", (roomId) => {
		socket.join(roomId);
        // Notify others in the room that a new user (the Peer) has arrived
        // "socket.to(roomId)" sends it to everyone EXCEPT the sender
        socket.to(roomId).emit("user-connected", socket.id);
	});

    // 2. Relay the WebRTC Signal (Handshake data)
    // This passes the Offer/Answer/ICE candidates between peers
    socket.on("signal", (payload) => {
        io.to(payload.target).emit("signal", {
            signal: payload.signal,
            callerID: payload.callerID
        });
    });
});

// USE DYNAMIC PORT FOR DEPLOYMENT
// Render/Heroku will provide process.env.PORT
// Localhost will use 5000
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Signaling Server running on port ${PORT}`));