import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Copy, Link, CheckCircle2 } from 'lucide-react';

export default function Lobby() {
  const { sessionId } = useParams();
  const { socket, gameState, userId } = useSocket();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const inviteLink = `${window.location.origin}/lobby/${sessionId}`;

  useEffect(() => {
    if (!socket || !userId) return;
    
    // Attempt to join the game (either as creator re-joining or guest joining)
    socket.emit('join_game', { sessionId, userId }, (res) => {
      if (res.error) {
        setError(res.error);
      }
    });
  }, [socket, sessionId]);

  useEffect(() => {
    // If game has started (both players present)
    if (gameState && (gameState.players.white && gameState.players.black)) {
      navigate(`/game/${sessionId}`);
    }
  }, [gameState, navigate, sessionId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="home-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="glass-panel text-center">
          <h2 style={{ color: 'var(--accent-red)' }}>Error</h2>
          <p>{error}</p>
          <button className="btn mt-4" onClick={() => navigate('/')}>Home</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div className="glass-panel text-center" style={{ maxWidth: '400px', width: '100%' }}>
        <h2>Lobby</h2>
        <p className="mb-8">Share this link with a friend to play.</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          <input 
            type="text" 
            className="input-field" 
            readOnly 
            value={inviteLink}
          />
          <button className="btn" style={{ padding: '0 1rem' }} onClick={handleCopy}>
            {copied ? <CheckCircle2 color="var(--accent-cyan)" /> : <Copy />}
          </button>
        </div>
        
        <div style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid var(--glass-border)',
            borderTopColor: 'var(--accent-purple)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>Waiting for opponent...</p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
