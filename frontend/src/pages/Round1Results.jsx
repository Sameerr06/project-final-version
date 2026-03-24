import { quizApi } from '../services/api';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Galaxy from './Galaxy';
import './Round1Results.css';

export default function Round1Results() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animPct, setAnimPct] = useState(0);

  useEffect(() => {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) { navigate('/'); return; }

    const stored = localStorage.getItem('round1Result');
    if (stored) {
      const parsed = JSON.parse(stored);
      setResult(parsed);
      setTimeout(() => {
        setAnimPct(Math.min(parsed.percentage || 0, 100));
      }, 200);
    }
    setLoading(false);
  }, [navigate]);

  const handleContinueRound2 = async () => {
    const studentId = localStorage.getItem('studentId');
    const token = localStorage.getItem('studentToken');
    try {
      await quizApi.startRound2(studentId, token);
      localStorage.setItem('currentRound', '2');
      navigate('/round2-instructions');
    } catch (err) {
      console.error("Failed to start round 2:", err);
      alert("Failed to start Round 2. Please check your connection or notify an invigilator.");
    }
  };

  if (loading) return <div className="r1r-loading">Loading results...</div>;

  const qualified = result?.qualifies_for_round2;
  const percentage = result?.percentage ?? 0;
  const score = result?.round1_score ?? 0;
  const maxScore = result?.max_possible_score ?? 0;

  return (
    <div className="r1r-page">
      {/* Galaxy Background */}
      <div className="r1r-galaxy-bg">
        <Galaxy
          mouseRepulsion
          mouseInteraction
          density={0.8}
          glowIntensity={0.2}
          saturation={0}
          hueShift={140}
          twinkleIntensity={0.3}
          rotationSpeed={0.05}
          repulsionStrength={1.5}
          autoCenterRepulsion={0}
          starSpeed={0.3}
          speed={0.8}
          transparent={false}
        />
      </div>

      <div className="r1r-content">
        {/* Header */}
        <div className="r1r-header">
          <h1>Round 1 Results</h1>
          <p className="r1r-subtitle">code144p '26 — Code Debugging Challenge</p>
        </div>

        {result && (
          <div className="r1r-card-wrap">

            {/* Status banner */}
            <div className={`r1r-status-banner ${qualified ? 'r1r-status-banner--qualified' : 'r1r-status-banner--eliminated'}`}>
              <span className="r1r-status-icon">{qualified ? '🎉' : '❌'}</span>
              <span className="r1r-status-text">
                {qualified ? 'Congratulations! You are Qualified for Round 2!' : 'You are Eliminated'}
              </span>
            </div>

            {/* Score card */}
            <div className={`r1r-scorecard ${qualified ? 'r1r-scorecard--qualified' : 'r1r-scorecard--eliminated'}`}>

              {/* Big score display */}
              <div className="r1r-score-display">
                <div className="r1r-score-number">{score}</div>
                <div className="r1r-score-outof">out of {maxScore}</div>
              </div>

              {/* Progress bar */}
              <div className="r1r-progress-wrap">
                <div className="r1r-progress-bar">
                  <div
                    className={`r1r-progress-fill ${qualified ? 'r1r-progress-fill--qualified' : 'r1r-progress-fill--eliminated'}`}
                    style={{ width: `${animPct}%`, transition: 'width 1s ease' }}
                  />
                  {/* 50% marker */}
                  <div className="r1r-cutoff-marker">
                    <div className="r1r-cutoff-line" />
                    <span className="r1r-cutoff-label">50%</span>
                  </div>
                </div>
                <div className="r1r-percentage-row">
                  <span className="r1r-percentage-value">{percentage}%</span>
                  <span className="r1r-percentage-note">
                    {qualified ? 'Above qualification threshold' : 'Below 50% qualification threshold'}
                  </span>
                </div>
              </div>

              {/* Stats row */}
              <div className="r1r-stats-row">
                <div className="r1r-stat">
                  <span className="r1r-stat-label">Your Score</span>
                  <span className="r1r-stat-value">{score}</span>
                </div>
                <div className="r1r-stat">
                  <span className="r1r-stat-label">Max Score</span>
                  <span className="r1r-stat-value">{maxScore}</span>
                </div>
                <div className="r1r-stat">
                  <span className="r1r-stat-label">Percentage</span>
                  <span className="r1r-stat-value">{percentage}%</span>
                </div>
                <div className="r1r-stat">
                  <span className="r1r-stat-label">Status</span>
                  <span className={`r1r-stat-value ${qualified ? 'r1r-qualified-text' : 'r1r-eliminated-text'}`}>
                    {qualified ? 'Qualified' : 'Eliminated'}
                  </span>
                </div>
              </div>
            </div>

            {/* Info footer */}
            <div className="r1r-info-footer">
              <span className="r1r-info-icon">ℹ️</span>
              <p>Students who score <b>50% or above</b> (10 / 20 points) qualify for Round 2.</p>
            </div>

            {/* Action */}
            <div className="r1r-action-row">
              {qualified ? (
                <button className="r1r-btn r1r-btn--primary" onClick={handleContinueRound2}>
                  Continue to Round 2 →
                </button>
              ) : (
                <button className="r1r-btn r1r-btn--secondary" onClick={() => navigate('/')}>
                  Exit to Home
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
};