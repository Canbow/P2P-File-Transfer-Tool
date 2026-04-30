require('dotenv').config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const session = require("express-session");
const passport = require("./passport");
const bcrypt = require("bcryptjs");
const db = require("./db");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Use dynamic client URL for CORS and redirects
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Enable CORS with credentials for React frontend
const corsOptions = {
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
};
app.use(cors(corsOptions));
app.use(express.json());

// Session config
app.use(session({
    secret: process.env.SESSION_SECRET || 'super_secret_p2p_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

// --- AUTH ROUTES ---
app.post("/auth/register", (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: "Hashing error" });
        db.run(`INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`, 
            [username, email, hash], 
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "Username or email already exists" });
                    return res.status(500).json({ error: "DB Error" });
                }
                res.status(201).json({ message: "User registered successfully", userId: this.lastID });
            }
        );
    });
});

app.post("/auth/login", passport.authenticate('local'), (req, res) => {
    res.json({ message: "Logged in", user: req.user });
});

app.post("/auth/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.json({ message: "Logged out" });
    });
});

app.get("/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ error: "Not authenticated" });
    }
});

// Google OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: `${CLIENT_URL}/?error=auth_failed` }),
  (req, res) => {
    res.redirect(`${CLIENT_URL}/`);
  }
);

// GitHub OAuth
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: `${CLIENT_URL}/?error=auth_failed` }),
  (req, res) => {
    res.redirect(`${CLIENT_URL}/`);
  }
);

// --- STATIC FRONTEND SERVING (PRODUCTION) ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/auth')) {
            res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
        }
    });
}

// --- SIGNALING SERVER ---
const io = require("socket.io")(server, {
	cors: corsOptions
});

io.on("connection", (socket) => {
	socket.emit("me", socket.id);

	socket.on("disconnect", () => {
		socket.broadcast.emit("callEnded");
	});

	socket.on("join-room", (roomId) => {
		socket.join(roomId);
        socket.to(roomId).emit("user-connected", socket.id);
	});

    socket.on("signal", (payload) => {
        io.to(payload.target).emit("signal", {
            signal: payload.signal,
            callerID: payload.callerID
        });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Signaling Server running on port ${PORT}`));