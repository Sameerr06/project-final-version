// src/pages/Welcome.jsx
import { useNavigate } from 'react-router-dom';
import Galaxy from './Galaxy';
import './Welcome.css';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome-wrapper">

      {/* Galaxy Live Animation Background */}
      <div className="welcome-galaxy-bg">
        <Galaxy
          mouseRepulsion
          mouseInteraction
          density={1}
          glowIntensity={0.3}
          saturation={0}
          hueShift={140}
          twinkleIntensity={0.3}
          rotationSpeed={0.1}
          repulsionStrength={2}
          autoCenterRepulsion={0}
          starSpeed={0.5}
          speed={1}
          transparent={false}
        />
      </div>

      {/* Subtle dark overlay */}
      <div className="welcome-overlay" />

      {/* Page Content */}
      <div className="welcome-content">

        <div className="welcome-badge">
          <div className="welcome-badge-dot" />
          CODEVERSE 2K25 — Live
        </div>

        <h1 className="welcome-title">
          VAHG FINIX <br />
          <span className="grad">2026</span>
        </h1>

        <p className="welcome-subtitle">
          No more hours lost staring at broken code.<br />
          Get clear answers and fix bugs in seconds.
        </p>

        <div className="welcome-stats">
          <div style={{ textAlign: 'center' }}>
            <div className="welcome-stat-num">20+</div>
            <div className="welcome-stat-label">Challenges</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="welcome-stat-num">60<span style={{ fontSize: '1rem' }}>m</span></div>
            <div className="welcome-stat-label">Time Limit</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="welcome-stat-num">4</div>
            <div className="welcome-stat-label">Categories</div>
          </div>
        </div>

        <button
          className="welcome-btn"
          onClick={() => navigate('/student-entry')}
        >
          Student Login →
        </button>

      </div>

    </div>
  );
}
