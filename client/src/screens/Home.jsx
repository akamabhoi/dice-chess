import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dices, Users, Bot, Link, Info, X } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [showRules, setShowRules] = useState(false);

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      // allow either a full URL paste or just the alphanumeric code
      const code = joinCode.split('/').pop().trim();
      navigate('/lobby/' + code);
    }
  };

  return (
    <div className="home-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div className="glass-panel text-center" style={{ maxWidth: '500px', width: '100%' }}>
        <Dices size={64} color="#00f0ff" className="mb-4" />
        <h1>Dice Chess</h1>
        <p className="mb-8" style={{ fontSize: '1.2rem' }}>A real-time multiplayer chess variant governed by dice rolls.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem' }}
            onClick={() => navigate('/setup?mode=pve')}
          >
            <Bot size={24} /> Play vs AI
          </button>
          <button 
            className="btn"
            style={{ width: '100%', padding: '1rem' }}
            onClick={() => navigate('/setup?mode=pvp')}
          >
            <Users size={24} /> Play vs Friend
          </button>

          <button 
            className="btn"
            style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', color: 'var(--accent-cyan)' }}
            onClick={() => setShowRules(true)}
          >
            <Info size={24} /> How to Play
          </button>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Or join an existing game</p>
            <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Game Code or Link" 
                style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1rem', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem' }} disabled={!joinCode.trim()}>
                <Link size={20} /> Join
              </button>
            </form>
          </div>
        </div>
      </div>

      {showRules && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              onClick={() => setShowRules(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 className="mb-4" style={{ color: 'var(--accent-cyan)' }}><Dices size={28} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}/> How to Play Dice Chess</h2>
            <div style={{ textAlign: 'left', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)' }}>
              <p className="mb-4">Dice Chess combines the timeless strategy of traditional chess with the thrill of probability.</p>
              
              <h3 className="mb-2" style={{ color: 'var(--accent-purple)' }}>The Core Rule</h3>
              <p className="mb-4">On your turn, you do not simply pick any piece on the board to move. Instead, <strong>you must roll the dice</strong> first. The three dice will dictate which specific piece types you are legally allowed to select and move.</p>
              
              <h3 className="mb-2" style={{ color: 'var(--accent-purple)' }}>Rolling Mechanics</h3>
              <ul className="mb-4" style={{ paddingLeft: '1.5rem' }}>
                <li className="mb-2">Click <strong>Roll Dice</strong> to generate 3 random piece types (e.g., Pawn, Knight, Queen).</li>
                <li className="mb-2">If you aren't happy with the pieces you rolled, you get up to <strong>2 optional re-rolls</strong> every turn.</li>
                <li className="mb-2">When you're ready to move, click one of your dice at the bottom of the screen. The board will then highlight all your pieces matching that die, along with their legal moves.</li>
              </ul>
              
              <h3 className="mb-2" style={{ color: 'var(--accent-purple)' }}>Check and King Security</h3>
              <p className="mb-4">If your King is in check, your life gets harder! The game will automatically override one of your dice to permanently be a King. You <strong>must</strong> find a way out of check using your rolls. If you exhaust your rolls and cannot escape check, it behaves exactly like a checkmate.</p>
            </div>
            <button className="btn btn-primary mt-4" style={{ width: '100%' }} onClick={() => setShowRules(false)}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
