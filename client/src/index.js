// 1. ALL IMPORTS MUST GO FIRST (No executable code above this!)
import * as processPolyfill from 'process';
import { Buffer as BufferPolyfill } from 'buffer';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './AuthContext';

// 2. POLYFILLS NEXT (Using our renamed import)
window.global = window;
window.process = processPolyfill;
window.Buffer = BufferPolyfill; 

// 3. REACT RENDERING LOGIC LAST
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);