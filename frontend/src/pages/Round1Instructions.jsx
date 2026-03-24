import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Round1Instructions.css';

export default function Round1Instructions() {
  const navigate = useNavigate();

  return (
    <main className="r1i-container">
      <div className="r1i-wrapper">
        <div className="r1i-badge">🏁 Ready for Round 1</div>
        <h1 className="r1i-title">code144p '26 — Round 1</h1>
        <h2 className="r1i-subtitle">MCQ Code Debugging Challenge</h2>

        {/* Instructions */}
        <section className="r1i-instructions">
          <h3>📋 Round 1 Instructions</h3>
          <ul>
            <li>🕐 You have <strong>2 minutes per question</strong> (15 questions total)</li>
            <li>🐛 Categories include <strong>syntax debugging, logic debugging, missing code, and efficiency</strong></li>
            <li>✅ Each correct answer earns <strong>5 points</strong></li>
            <li>❌ There is <strong>no negative marking</strong></li>
            <li>🔒 <strong>Fullscreen mode</strong> is enforced — exiting will trigger a warning</li>
            <li>🔒 <strong>Tab switching</strong> is monitored — 3 violations = auto-submit</li>
            <li>🚫 Copying, right-clicking, and shortcuts are disabled</li>
          </ul>
        </section>

        {/* Scoring */}
        <section className="r1i-scoring">
          <h3>🎯 Scoring</h3>
          <div className="r1i-scoring-grid">
            <div className="r1i-scoring-item">
              <div className="r1i-points">+5</div>
              <div>Correct Answer</div>
            </div>
            <div className="r1i-scoring-item">
              <div className="r1i-points zero">0</div>
              <div>Wrong Answer</div>
            </div>
          </div>
        </section>

        <button className="r1i-start-btn" onClick={() => navigate('/quiz')}>
          🚀 Start Round 1
        </button>
      </div>
    </main>
  );
}
