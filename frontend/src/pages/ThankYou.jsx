import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ThankYou.css";

const CONFETTI_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];

export default function ThankYou() {
  const navigate = useNavigate();
  const ran = useRef(false);

  // Pre-generate confetti pieces so they stay stable across renders
  const [confettiPieces] = useState(() =>
    Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      backgroundColor: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      width: `${6 + Math.random() * 6}px`,
      height: `${6 + Math.random() * 6}px`,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      animationDuration: `${2 + Math.random() * 2}s`,
      animationDelay: `${Math.random() * 1.5}s`,
    }))
  );

  // Read results BEFORE clearing them
  const [finalScore] = useState(() => {
    try {
      const r2 = JSON.parse(localStorage.getItem('round2Result') || '{}');
      const r1 = JSON.parse(localStorage.getItem('round1Result') || '{}');
      return {
        round1: r1.round1_score ?? r2.round1_score ?? null,
        round2: r2.round2_score ?? null,
        total: r2.total_score ?? null,
        name: r2.name ?? r1.name ?? null,
      };
    } catch { return null; }
  });

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const blockBack = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', blockBack);

    if (ran.current) return;
    ran.current = true;

    localStorage.removeItem('studentId');
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentEntry');
    localStorage.removeItem('round1Result');
    localStorage.removeItem('round2Result');
    localStorage.removeItem('currentRound');
    localStorage.removeItem('r2_draft_code');

    return () => window.removeEventListener('popstate', blockBack);
  }, []);

  return (
    <div className="ty-page">
      <div className="confetti-wrap">
        {confettiPieces.map(piece => (
          <div
            key={piece.id}
            className="confetti-piece"
            style={{
              left: piece.left,
              backgroundColor: piece.backgroundColor,
              width: piece.width,
              height: piece.height,
              borderRadius: piece.borderRadius,
              animationDuration: piece.animationDuration,
              animationDelay: piece.animationDelay,
            }}
          />
        ))}
      </div>

      <header className="ty-header">
        <div className="ty-header-content">
          <h1 className="ty-brand">code 144p 2K25</h1>
          <p className="ty-tagline">Code Debugging Challenge</p>
        </div>
      </header>

      <main className="ty-main">
        <div className="ty-hero" style={{ paddingBottom: '3rem' }}>
          <div className="ty-trophy">🏆</div>
          <h2 className="ty-title">Thank You!</h2>
          <p className="ty-subtitle">You have successfully completed the challenge.</p>

          {/* ── Score Card ── */}
          {finalScore && finalScore.total !== null && (
            <div className="ty-score-card">
              <div className="ty-score-header">Your Final Score</div>
              <div className="ty-score-rows">
                {finalScore.round1 !== null && (
                  <div className="ty-score-row">
                    <span className="ty-score-label">Round 1 (MCQ)</span>
                    <span className="ty-score-value">{finalScore.round1} pts</span>
                  </div>
                )}
                {finalScore.round2 !== null && (
                  <div className="ty-score-row">
                    <span className="ty-score-label">Round 2 (Debugging)</span>
                    <span className="ty-score-value">{finalScore.round2} pts</span>
                  </div>
                )}
                <div className="ty-score-row total">
                  <span className="ty-score-label">Total Score</span>
                  <span className="ty-score-value">{finalScore.total} pts</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="ty-footer-note" style={{ paddingTop: '2rem' }}>
          Results will be officially announced at the prize ceremony. Thank you for participating!
        </p>
      </main>

      <footer className="ty-footer">
        <div>
          <h3>Contact Us</h3>
          <a href="https://www.jct.ac.in/" target="_blank" rel="noreferrer">
            https://www.jct.ac.in/
          </a>
          <p>Phone: +91 9361488801</p>
        </div>
        <div>
          <h3>Follow Us</h3>
          <a href="https://www.facebook.com/jctgroups/" target="_blank" rel="noreferrer">Facebook</a>
          <br />
          <a href="https://www.instagram.com/jct_college/" target="_blank" rel="noreferrer">Instagram</a>
        </div>
      </footer>
    </div>
  );
}
