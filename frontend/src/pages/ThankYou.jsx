import { leaderboardApi } from '../services/api';
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ThankYou.css";

const CONFETTI_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];

export default function ThankYou() {
  const navigate = useNavigate();
  const [finalScore, setFinalScore] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLb, setLoadingLb] = useState(true);
  
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

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const blockBack = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', blockBack);

    if (ran.current) return;
    ran.current = true;

    const round1Result = JSON.parse(localStorage.getItem('round1Result') || '{}');
    const round2Result = JSON.parse(localStorage.getItem('round2Result') || '{}');
    const studentData  = JSON.parse(localStorage.getItem('studentEntry') || '{}');

    setFinalScore({
      name: studentData.name || 'Participant',
      round1: round1Result.round1_score ?? 0,
      round2: round2Result.round2_score ?? 0,
      total: round2Result.total_score ?? round1Result.round1_score ?? 0,
      qualified: round1Result.qualifies_for_round2 ?? false,
      rank: round1Result.rank ?? '—',
    });

    localStorage.removeItem('studentId');
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentEntry');
    localStorage.removeItem('round1Result');
    localStorage.removeItem('round2Result');
    localStorage.removeItem('currentRound');
    localStorage.removeItem('r2_draft_code');

    leaderboardApi.get('')
      .then(data => {
        setLeaderboard(Array.isArray(data) ? data.slice(0, 5) : []);
        setLoadingLb(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingLb(false);
      });

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
          <h1 className="ty-brand">CODEVERSE 2K25</h1>
          <p className="ty-tagline">Code Debugging Challenge</p>
        </div>
      </header>

      <main className="ty-main">
        <div className="ty-hero">
          <div className="ty-trophy">🏆</div>
          <h2 className="ty-title">
            {finalScore?.name ? `Great job, ${finalScore.name}!` : 'Thank You!'}
          </h2>
          <p className="ty-subtitle">You have successfully completed the challenge.</p>
        </div>

        {finalScore && (
          <div className="ty-scoreboard">
            <h3>Your Results</h3>
            <div className="ty-score-grid">
              <div className="ty-score-card r1">
                <div className="ty-sc-label">Round 1</div>
                <div className="ty-sc-value">{finalScore.round1}</div>
                <div className="ty-sc-sub">MCQ Score</div>
              </div>
              {finalScore.qualified && (
                <div className="ty-score-card r2">
                  <div className="ty-sc-label">Round 2</div>
                  <div className="ty-sc-value">{finalScore.round2}</div>
                  <div className="ty-sc-sub">Debugging Score</div>
                </div>
              )}
              <div className="ty-score-card total">
                <div className="ty-sc-label">Total</div>
                <div className="ty-sc-value">{finalScore.total}</div>
                <div className="ty-sc-sub">Final Score</div>
              </div>
            </div>
            {!finalScore.qualified && (
              <p className="ty-not-qualified">
                You participated in Round 1. Results will be announced soon.
              </p>
            )}
          </div>
        )}

        <div className="ty-leaderboard">
          <h3>🏅 Top Scores So Far</h3>
          
          {loadingLb ? (
            <div className="ty-lb-list">
              <div className="ty-lb-skeleton-row"></div>
              <div className="ty-lb-skeleton-row"></div>
              <div className="ty-lb-skeleton-row"></div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
              <p>No leaderboard data available yet. Be the first to secure a spot!</p>
            </div>
          ) : (
            <div className="ty-lb-list">
              {leaderboard.map((s, i) => (
                <div key={s.id || i} className={`ty-lb-row ${i === 0 ? 'ty-first' : ''}`}>
                  <span className="ty-lb-rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span className="ty-lb-name">{s.name}</span>
                  <span className="ty-lb-college">{s.college}</span>
                  <span className="ty-lb-score">{s.total_score} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="ty-footer-note">
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
