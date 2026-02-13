# ⚡ P2P File Share Tool (WebRTC)
![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tech Stack](https://img.shields.io/badge/stack-React%20%7C%20Node.js%20%7C%20WebRTC-orange)

> **A privacy-focused file sharing tool that allows users to send unlimited-size files directly between devices without uploading them to any cloud server.**

---

## 🚀 Live Demo
**[Insert Your Vercel Link Here]** *(e.g., https://my-p2p-share.vercel.app)*

---

## 🧐 Why This Project?
Most file-sharing services (WhatsApp, Email, WeTransfer) have strict limits:
1.  **File Size Limits:** usually capped at 25MB or 2GB.
2.  **Privacy Risks:** Files reside on a third-party server.
3.  **Speed Bottlenecks:** Uploading to a server and then downloading creates double the bandwidth usage.

**This tool solves these problems by creating a direct peer-to-peer (P2P) pipe.** The file streams directly from User A's disk to User B's disk. **The server never touches the file.**

---

## 🌟 Key Features
* **Unlimited File Size:** Send 10GB+ files without crashing the browser.
* **Zero-Knowledge Privacy:** Data is encrypted via WebRTC (DTLS) and never stored on any server.
* **Cross-Platform:** Works on Windows, Mac, Linux, Android, and iOS (via browser).
* **No Login Required:** Just share a link/Room ID.

---

## 🛠️ Tech Stack
* **Frontend:** React.js (Vite/CRA), StreamSaver.js
* **Backend (Signaling):** Node.js, Socket.io
* **Core Protocol:** WebRTC (Simple-Peer)

---

## 🧠 Technical Deep Dive (Challenges Solved)
### 1. The "1GB RAM Crash" Problem
Browsers cannot hold large files (e.g., 5GB videos) in memory. Attempting to read a whole file into a variable causes the tab to crash.
* **Solution:** I implemented **Chunking** and **Backpressure**. The app reads the file in 64KB chunks. Before reading the next chunk, it checks the WebRTC buffer status. If the network is slow, it pauses disk reading until the buffer drains.

### 2. Saving Large Files Client-Side
Browsers typically download files to RAM (Blob) before saving to disk. This limits downloads to available RAM (~2GB).
* **Solution:** Integrated `StreamSaver.js` to create a WritableStream directly to the user's hard drive. This allows receiving files larger than the device's physical RAM.

---

## 📸 Architecture

1.  **Signaling Phase:** Peers exchange SDP (handshakes) via the Node.js WebSocket server.
2.  **Connection Phase:** A direct P2P connection is established.
3.  **Data Phase:** The server is disconnected from the loop; data flows directly between peers.

---

## 💻 Installation & Setup

### Prerequisites
* Node.js (v14+)
* npm or yarn

### 1. Clone the Repo
```bash
git clone [https://github.com/YOUR_USERNAME/p2p-file-transfer.git](https://github.com/YOUR_USERNAME/p2p-file-transfer.git)
cd p2p-file-transfer

2. Setup Backend (Signaling Server)
Bash
cd server
npm install
# Create a .env file (optional for local, required for prod)
# PORT=5000
npm start
Server runs on localhost:5000

3. Setup Frontend (Client)
Open a new terminal:

Bash
cd client
npm install
# Note: Ensure React points to localhost:5000 in dev
npm start
Client runs on localhost:3000

⚠️ Current Limitations
Mobile Background Tabs: iOS/Android may freeze the connection if the browser is minimized during transfer.

Symmetric NATs: Corporate or University firewalls may block P2P connections. (Future improvement: Add TURN server support).

Browser Compatibility: StreamSaver.js works best on Chrome/Edge/Firefox. Safari has stricter limitations on service workers.

🗺️ Roadmap
[ ] Add "Resumable Transfers" (if connection drops).

[ ] Implement TURN server for bypassing strict firewalls.

[ ] Add "Zip-on-the-fly" for sending folder structures.

[ ] Dark Mode UI.

🤝 Contributing
Contributions are welcome! Please open an issue or pull request for any bugs or improvements.

📄 License
This project is open source and available under the MIT License.