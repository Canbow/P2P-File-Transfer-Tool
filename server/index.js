const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
	cors: {
		origin: "http://localhost:3000", // Allow your React client
		methods: ["GET", "POST"]
	}
});

io.on("connection", (socket) => {
	// User joins a "Room" (based on the URL link)
	socket.on("join-room", (roomId) => {
		socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // Notify others in room that a new peer is here
        // In a strict 2-person transfer, this triggers the "Initiator"
        socket.to(roomId).emit("user-connected", socket.id);
	});

    // Relay the WebRTC Signal (SDP/ICE) to the specific peer
    socket.on("signal", (payload) => {
        io.to(payload.target).emit("signal", {
            signal: payload.signal,
            callerID: payload.callerID
        });
    });

	socket.on("disconnect", () => {
		console.log("User disconnected");
	});
});

server.listen(5000, () => console.log("Signaling Server running on port 5000"));