import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { X } from 'lucide-react';
import './AuthModal.css';

const BACKEND_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

export default function AuthModal({ isOpen, onClose }) {
    const { login, register } = useAuth();
    const [isLoginTab, setIsLoginTab] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        let success = false;
        
        if (isLoginTab) {
            success = await login(username, password);
            if (!success) setError("Invalid credentials");
        } else {
            success = await register(username, email, password);
            if (!success) setError("Registration failed. Username or email might exist.");
        }

        if (success) onClose();
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}><X size={20} /></button>
                
                <div className="modal-header">
                    <h2>{isLoginTab ? 'Welcome back' : 'Create an account'}</h2>
                    <p>{isLoginTab ? 'Enter your details to sign in.' : 'Enter your details to get started.'}</p>
                </div>

                <div className="tabs">
                    <button 
                        className={`tab ${isLoginTab ? 'active' : ''}`} 
                        onClick={() => { setIsLoginTab(true); setError(''); }}
                    >Login</button>
                    <button 
                        className={`tab ${!isLoginTab ? 'active' : ''}`} 
                        onClick={() => { setIsLoginTab(false); setError(''); }}
                    >Register</button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                    {!isLoginTab && (
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                    )}
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    
                    {error && <p className="error-text">{error}</p>}
                    
                    <button type="submit" className="btn-submit">
                        {isLoginTab ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                <div className="divider">
                    <span>Or continue with</span>
                </div>

                <div className="oauth-buttons">
                    <a href={`${BACKEND_URL}/auth/google`} className="btn-oauth">
                        Google
                    </a>
                    <a href={`${BACKEND_URL}/auth/github`} className="btn-oauth">
                        GitHub
                    </a>
                </div>
            </div>
        </div>
    );
}
