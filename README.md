# ⚡ P2P File Share Tool (WebRTC)
![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tech Stack](https://img.shields.io/badge/stack-React%20%7C%20Node.js%20%7C%20WebRTC%20%7C%20SQLite-orange)

> **A privacy-focused file sharing tool that allows users to send unlimited-size files directly between devices without uploading them to any cloud server. Now featuring a modern UI and full OAuth Authentication.**

---

## 🚀 Live Demo
**[Insert Your Live Link Here]** *(e.g., https://my-p2p-share.onrender.com)*

---

## 🧐 Why This Project?
Most file-sharing services (WhatsApp, Email, WeTransfer) have strict limits:
1.  **File Size Limits:** usually capped at 25MB or 2GB.
2.  **Privacy Risks:** Files reside on a third-party server.
3.  **Speed Bottlenecks:** Uploading to a server and then downloading creates double the bandwidth usage.

**This tool solves these problems by creating a direct peer-to-peer (P2P) pipe.** The file streams directly from User A's disk to User B's disk. **The server never touches the file.**

---

## 🌟 Key Features
* **Unlimited File Size:** Send 10GB+ files without crashing the browser via StreamSaver backpressure.
* **Zero-Knowledge Privacy:** Data is encrypted via WebRTC (DTLS) and never stored on any server.
* **Modern Interface:** Beautiful, Shadcn-inspired UI with smooth micro-animations and a premium dashboard.
* **Full Authentication:** Local Registration + OAuth (Google & GitHub) backed by an SQLite database.
* **Cross-Platform:** Works on Windows, Mac, Linux, Android, and iOS (via browser).

---

## 🛠️ Tech Stack
* **Frontend:** React.js, Lucide Icons, Vanilla CSS (Shadcn aesthetic)
* **Backend:** Node.js, Express, Socket.io
* **Auth & DB:** Passport.js, SQLite3, express-session
* **Core Protocol:** WebRTC (Simple-Peer), StreamSaver.js

---

## 📸 Architecture

1.  **Authentication:** Users log in securely via standard sessions.
2.  **Signaling Phase:** Peers exchange SDP (handshakes) via the Node.js WebSocket server using dynamic Room IDs.
3.  **Connection Phase:** A direct P2P connection is established.
4.  **Data Phase:** The server is completely bypassed; data flows directly between peers.

---

## 💻 Installation & Setup

### Prerequisites
* Node.js (v14+)
* npm or yarn

### 1. Clone the Repo
```bash
git clone https://github.com/Canbow/P2P-File-Transfer-Tool.git
cd P2P-File-Transfer-Tool
```

### 2. Setup Backend & Frontend (Unified Server)
This project is configured to run from a single Node server that serves both the API/Sockets and the compiled React frontend.

```bash
cd server
npm install

# Build the React Frontend
npm run build

# Set up your environment variables
# Create a .env file in the server/ directory:
# PORT=5000
# CLIENT_URL=http://localhost:3000
# SESSION_SECRET=your_secret_key
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# GITHUB_CLIENT_ID=...
# GITHUB_CLIENT_SECRET=...

# Start the server
npm start
```
*The server will run on localhost:5000 and automatically initialize the SQLite database (`server/database.sqlite`).*

### 3. Development Mode
If you want to run the React hot-reloading dev server:
Open a new terminal:
```bash
cd client
npm install
npm start
```
*Client runs on localhost:3000 and proxies API requests to localhost:5000.*

---

## ⚠️ Current Limitations
* **Mobile Background Tabs:** iOS/Android may freeze the connection if the browser is minimized during transfer.
* **Symmetric NATs:** Corporate or University firewalls may block P2P connections. (Future improvement: Add TURN server support).
* **Browser Compatibility:** StreamSaver.js works best on Chrome/Edge/Firefox. Safari has stricter limitations on service workers.

---

## 🗺️ Roadmap
- [ ] Add "Resumable Transfers" (if connection drops).
- [ ] Implement TURN server for bypassing strict firewalls.
- [ ] Add "Zip-on-the-fly" for sending folder structures.
- [x] Modernize UI with Shadcn-inspired design.
- [x] Add User Authentication & Database.

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or pull request for any bugs or improvements.

## 📄 License
This project is open source and available under the MIT License.