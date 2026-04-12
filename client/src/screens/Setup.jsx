import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { ArrowLeft, Play } from 'lucide-react';

export default function Setup() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'pvp';
  const navigate = useNavigate();
  const { socket, userId } = useSocket();

  const [timeControl, setTimeControl] = useState(10);
  const [difficulty, setDifficulty] = useState('Medium');

  const handleCreateGame = () => {
    if (!socket || !userId) return;
    
    socket.emit('create_game', { config: { mode, timeControl, difficulty }, userId }, (response) => {
      if (response && response.sessionId) {
        if (mode === 'pvp') {
          navigate(`/lobby/${response.sessionId}`);
        } else {
          navigate(`/game/${response.sessionId}`);
        }
      }
    });
  };

  const timeControls = [
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button className="btn" style={{ padding: '0.5rem' }} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ marginBottom: 0 }}>Game Settings</h2>
        </div>

        <div className="mb-4">
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Time Control</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {timeControls.map((tc) => (
              <button 
                key={tc.value}
                className={`btn ${timeControl === tc.value ? 'btn-primary' : ''}`} 
                style={{ flex: 1 }}
                onClick={() => setTimeControl(tc.value)}
              >
                {tc.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'pve' && (
          <div className="mb-8">
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>AI Difficulty</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['Easy', 'Medium', 'Hard'].map(diff => (
                <button 
                  key={diff}
                  className={`btn ${difficulty === diff ? 'btn-primary' : ''}`} 
                  style={{ flex: 1, padding: '0.5rem' }}
                  onClick={() => setDifficulty(diff)}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        )}

        <button 
          className="btn btn-primary"
          style={{ width: '100%', padding: '1rem', marginTop: mode === 'pve' ? '0' : '2rem' }}
          onClick={handleCreateGame}
        >
          <Play size={20} /> Create Game
        </button>
      </div>
    </div>
  );
}
