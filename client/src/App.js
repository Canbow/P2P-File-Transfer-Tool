import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import SimplePeer from "simple-peer";
import streamSaver from "streamsaver"; // Import placed at top
import { Home, Users, User, UploadCloud, File, CheckCircle, Clock } from 'lucide-react';
import './App.css';
import AuthModal from './AuthModal';
import { useAuth } from './AuthContext';

// --- Configuration & Global Variables ---
const BACKEND_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';
const socket = io.connect(BACKEND_URL || "/"); // Change to your IP if testing on LAN
const CHUNK_SIZE = 64 * 1024; // 64KB for WebRTC stability

// Required for StreamSaver to work in some environments
streamSaver.mitm = 'https://jimmywarting.github.io/StreamSaver.js/mitm.html?version=2.0.0';

function App() {
  const [yourID, setYourID] = useState("");
  const [status, setStatus] = useState("Idle");
  const [progress, setProgress] = useState(0);
  const [roomID, setRoomID] = useState("");
  const [joined, setJoined] = useState(false);

  const { user, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.user-menu')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const peerRef = useRef();

  // Refs for file receiving
  const fileWriterRef = useRef(null);
  const writerRef = useRef(null);
  const receivedBytesRef = useRef(0);
  const incomingMetaRef = useRef(null);

  useEffect(() => {
    socket.on("connect", () => {
        setYourID(socket.id);
    });

    socket.on("user-connected", (userID) => {
        console.log("User connected: " + userID);
        if (peerRef.current) {
            try { peerRef.current.destroy(); } catch (e) {}
        }
        const peer = createPeer(userID, socket.id, true);
        peerRef.current = peer;
    });

    socket.on("signal", (payload) => {
        if (peerRef.current) {
            // If we already have a peer, we just pass the new signal (Answer/ICE) to it.
            peerRef.current.signal(payload.signal);
        } else {
            // If we DON'T have a peer, we are the receiver getting the first Offer.
            const peer = addPeer(payload.signal, payload.callerID);
            peerRef.current = peer;
        }
    });
    return () => {
        socket.off("connect");
        socket.off("user-connected");
        socket.off("signal");
        if (peerRef.current) {
            try { peerRef.current.destroy(); } catch (e) {}
        }
    };
  }, []);

  const joinRoom = () => {
    if (roomID.trim() !== "") {
      socket.emit("join-room", roomID);
      setJoined(true);
      setStatus("Waiting for another person to join...");
    }
  };

  const generateAndJoinRoom = () => {
    const idToUse = roomID.trim() !== "" ? roomID : Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomID(idToUse);
    socket.emit("join-room", idToUse);
    setJoined(true);
    setStatus("Waiting for another person to join...");
  };

  // --- Disconnect Handler ---
  const handleDisconnect = () => {
      setStatus("User disconnected. Waiting for new connection...");
      setProgress(0);
      peerRef.current = null;
      
      // If a file was in the middle of downloading, cancel it safely
      if (writerRef.current) {
          try {
              writerRef.current.abort("Connection lost");
          } catch (e) {
              console.error("Stream abort error:", e);
          }
          writerRef.current = null;
      }
      incomingMetaRef.current = null;
      receivedBytesRef.current = 0;
  };


  function createPeer(userToSignal, callerID, initiator) {
    const peer = new SimplePeer({
        initiator: initiator,
        trickle: false,
    });

    peer.on("signal", signal => {
        socket.emit("signal", { target: userToSignal, callerID: socket.id, signal });
    });

    peer.on("connect", () => {
        setStatus("P2P Connection Established!");
    });

    peer.on("data", handleReceiveData);

    // --- NEW: Catch errors and disconnects ---
    peer.on("error", (err) => {
        console.warn("Peer error caught:", err);
        handleDisconnect();
    });
    peer.on("close", handleDisconnect);

    return peer;
  }

  function addPeer(incomingSignal, callerID) {
    const peer = new SimplePeer({
        initiator: false,
        trickle: false,
    });

    peer.on("signal", signal => {
       socket.emit("signal", { target: callerID, callerID: socket.id, signal });
    });

    peer.on("connect", () => {
        setStatus("P2P Connection Established!");
    });

    peer.on("data", handleReceiveData);

    // --- NEW: Catch errors and disconnects ---
    peer.on("error", (err) => {
        console.warn("Peer error caught:", err);
        handleDisconnect();
    });
    peer.on("close", handleDisconnect);

    peer.signal(incomingSignal);
    return peer;
  }

  // --- Large File Sending (With Backpressure) ---
  const sendFile = (file) => {
    if (!peerRef.current) return;
    setProgress(0);
    setStatus(`Sending ${file.name}...`);

    // 1. Send Metadata
    const metadata = {
        type: 'metadata',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
    };
    peerRef.current.send(JSON.stringify(metadata));

    let offset = 0;

    // 2. The Reading Loop
    const readSlice = () => {
        if (offset >= file.size) {
            setStatus("File Sent Successfully!");
            return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const reader = new FileReader();

        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            
            // "canWrite" will be false if the buffer is full (Backpressure)
            const canWrite = peerRef.current.send(arrayBuffer); 
            
            offset += arrayBuffer.byteLength;
            setProgress(Math.round((offset / file.size) * 100));

            if (canWrite) {
                // Buffer is empty, read next chunk immediately
                readSlice();
            } else {
                // Buffer is full! Wait for 'drain' or check buffer manually
                const checkBuffer = setInterval(() => {
                    // Check if buffer has cleared enough to send more
                    if (peerRef.current._channel.bufferedAmount < CHUNK_SIZE * 2) {
                        clearInterval(checkBuffer);
                        readSlice();
                    }
                }, 10); // Check every 10ms
            }
        };

        reader.readAsArrayBuffer(slice);
    };

    readSlice();
  };

  // --- Large File Receiving (Direct to Disk) ---
  const handleReceiveData = async (data) => {
      // A. Check if it's Metadata (JSON)
      // Only check small packets to avoid freezing on big binary chunks
      if (data.byteLength < 1000) {
          try {
              const text = new TextDecoder().decode(data);
              const meta = JSON.parse(text);
              if (meta.type === 'metadata') {
                  incomingMetaRef.current = meta;
                  receivedBytesRef.current = 0;
                  setProgress(0);
                  setStatus(`Receiving ${meta.fileName}...`);
                  
                  // Initialize StreamSaver
                  const fileStream = streamSaver.createWriteStream(meta.fileName, {
                      size: meta.fileSize
                  });
                  fileWriterRef.current = fileStream;
                  writerRef.current = fileStream.getWriter();
                  return;
              }
          } catch (e) {
              // Not JSON, assume binary
          }
      }

      // B. It's Binary Data
      if (writerRef.current) {
          await writerRef.current.write(new Uint8Array(data));
          receivedBytesRef.current += data.byteLength;
          
          if (incomingMetaRef.current) {
              setProgress(Math.round((receivedBytesRef.current / incomingMetaRef.current.fileSize) * 100));
              
              if (receivedBytesRef.current === incomingMetaRef.current.fileSize) {
                  setStatus("File Received & Saved!");
                  writerRef.current.close();
                  writerRef.current = null;
                  incomingMetaRef.current = null;
                  receivedBytesRef.current = 0;
              }
          }
      }
  };

  const canSendFile = status === "P2P Connection Established!" || 
                      status === "File Sent Successfully!" || 
                      status === "File Received & Saved!";

  return (
    <div className="app-container">
      <nav className="navbar">
        <h1>P2P File Transfer</h1>
        
        <div className="user-menu" style={{ position: 'relative' }}>
            {user ? (
                <div 
                    className="user-profile" 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                >
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                    ) : (
                        <div className="user-icon"><User size={20} color="currentColor" /></div>
                    )}
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{user.username}</span>
                </div>
            ) : (
                <div className="user-icon" style={{ cursor: 'pointer' }} onClick={() => setIsAuthModalOpen(true)}>
                    <User size={20} color="currentColor" />
                </div>
            )}
            
            {isDropdownOpen && user && (
                <div className="dropdown-menu" style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem',
                    background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '0.5rem', minWidth: '150px', zIndex: 10
                }}>
                    <button 
                        onClick={() => { logout(); setIsDropdownOpen(false); }}
                        style={{
                            width: '100%', padding: '0.5rem', background: 'transparent', border: 'none',
                            textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', color: '#ef4444', fontWeight: 500
                        }}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <main className="main-content">
        {!joined ? (
          <>
            <h2 className="dashboard-title">Dashboard</h2>
            
            <div className="input-group">
              <label className="input-label">Room ID</label>
              <div className="input-wrapper">
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="ABC123" 
                  value={roomID} 
                  onChange={(e) => setRoomID(e.target.value.toUpperCase())}
                />
                <button className="btn-join" onClick={joinRoom}>Join</button>
              </div>
            </div>

            <div className="cards-container">
              <div className="action-card">
                <Home size={40} className="card-icon" />
                <h3 className="card-title">Create a room</h3>
                <p className="card-subtitle">Generate a room ID</p>
                <button className="btn-card" onClick={generateAndJoinRoom}>Create Room</button>
              </div>

              <div className="action-card">
                <Users size={40} className="card-icon" />
                <h3 className="card-title">Join a room</h3>
                <p className="card-subtitle">Connect with a room ID</p>
                <button className="btn-card" onClick={() => {
                  if(roomID.trim() === '') {
                    document.querySelector('.input-field').focus();
                  } else {
                    joinRoom();
                  }
                }}>Apply room</button>
              </div>
            </div>
          </>
        ) : (
          <div className="room-view">
            <div className="room-header">
              <div>
                <h2 className="room-id-display">
                  Room: {roomID}
                </h2>
                <span className={`badge ${status === 'P2P Connection Established!' ? 'badge-connected' : 'badge-waiting'}`}>
                  {status === 'P2P Connection Established!' ? 'Connected' : 'Waiting...'}
                </span>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                ID: {yourID.substring(0, 5)}...
              </div>
            </div>
            
            <div className={`file-upload-section ${canSendFile ? 'active' : ''}`}>
              <UploadCloud size={48} className="upload-icon" />
              <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>Transfer Files Securely</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                {canSendFile 
                  ? "Connection established. You can now select a file to send directly to your peer."
                  : "Waiting for a peer to join this room before you can send files."}
              </p>
              
              <div className="file-input-wrapper">
                <button 
                  className="btn-primary" 
                  disabled={!canSendFile}
                >
                  <File size={18} />
                  Choose File to Send
                </button>
                <input 
                    type="file" 
                    onChange={(e) => {
                        if(e.target.files[0]) {
                            sendFile(e.target.files[0]);
                            e.target.value = null; // Clear to allow selecting the same file again
                        }
                    }} 
                    disabled={!canSendFile}
                />
              </div>
            </div>
            
            {(progress > 0 || status.includes("Sending") || status.includes("Receiving")) && (
              <div className="progress-container">
                <div className="progress-text" style={{ marginBottom: "0.5rem" }}>
                  <span>{status}</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
            
            {status === "File Received & Saved!" || status === "File Sent Successfully!" ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginTop: '1rem', fontWeight: '500' }}>
                <CheckCircle size={20} />
                <span>{status}</span>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
