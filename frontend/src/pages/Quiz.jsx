import { getApiUrl } from '../services/api';
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Quiz.css";

function Quiz() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [timer, setTimer] = useState(120);
  const [progress, setProgress] = useState(5);

  // Security State
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const MAX_TAB_SWITCHES = 3;
  const warningTimerRef = useRef(null);

  // [M7] Guard against double-submit on fast clicks
  const isSubmitting = useRef(false);

  // [H8] Ref to hold current timer value so the interval effect doesn't need to re-register
  const timerRef = useRef(120);
  useEffect(() => { timerRef.current = timer; }, [timer]);

  // ── 1. FULLSCREEN LOCK ──────────────────────────────────────────────────────
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  }, []);

  const handleFullscreenChange = useCallback(() => {
    const fsEl =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;

    if (!fsEl) {
      setShowFullscreenPrompt(true);
    } else {
      setShowFullscreenPrompt(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    enterFullscreen();
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [enterFullscreen, handleFullscreenChange]);

  // ── 2. TAB SWITCH DETECTION ─────────────────────────────────────────────────
  const triggerWarning = useCallback((msg) => {
    setWarningMessage(msg);
    setShowWarning(true);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setShowWarning(false), 4000);
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      setTabSwitchCount(prev => {
        const newCount = prev + 1;
        if (newCount >= MAX_TAB_SWITCHES) {
          navigate('/round1-results', { replace: true });
        } else {
          triggerWarning(
            `⚠️ Tab switch detected! Warning ${newCount}/${MAX_TAB_SWITCHES}. Your exam will be terminated if this continues.`
          );
        }
        return newCount;
      });
    }
  }, [navigate, triggerWarning]);

  // [M3] Only use visibilitychange — removed blur listener (double-counting)
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [handleVisibilityChange]);

  // ── 3. DISABLE COPYING & RIGHT-CLICK ───────────────────────────────────────
  useEffect(() => {
    const preventCopy = (e) => {
      e.preventDefault();
      triggerWarning('🚫 Copying is not allowed during the exam.');
      return false;
    };
    const preventContextMenu = (e) => {
      e.preventDefault();
      return false;
    };
    const preventKeyboardShortcuts = (e) => {
      const blocked =
        (e.ctrlKey && ['c', 'a', 'v', 'x', 'u', 's', 'p'].includes(e.key.toLowerCase())) ||
        e.key === 'PrintScreen' ||
        (e.metaKey && ['c', 'a', 'v', 'x'].includes(e.key.toLowerCase()));
      if (blocked) {
        e.preventDefault();
        triggerWarning('🚫 This keyboard shortcut is disabled during the exam.');
        return false;
      }
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboardShortcuts);
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [triggerWarning]);

  // ── 4. FETCH RANDOMIZED QUESTIONS ──────────────────────────────────────────
  useEffect(() => {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) {
      navigate('/');
      return;
    }

    fetch(getApiUrl(`/api/questions/?round=1`))
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch questions');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setQuestions(data);
          setProgress((1 / data.length) * 100);
        } else {
          throw new Error('Invalid data format');
        }
      })
      .catch((err) => console.error('Error fetching questions:', err));
  }, [navigate]);

  // ── SUBMIT HANDLER ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // [M7] Guard against double-click / reentrancy
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    if (!questions.length) {
      isSubmitting.current = false;
      return;
    }

    const studentId = localStorage.getItem('studentId');
    const token = localStorage.getItem('studentToken');
    const question = questions[currentIndex];

    if (answer) {
      try {
        await fetch(getApiUrl('/api/submit-answer/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            token: token,                     // [C4] include token
            question_id: question.id,
            chosen_option: answer,
            round_number: 1,
          }),
        });
      } catch (err) {
        console.error('Error submitting answer:', err);
      }
    }

    if (currentIndex + 1 >= questions.length) {
      try {
        const res = await fetch(getApiUrl('/api/complete-round1/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: studentId, token: token }),  // [C4]
        });
        const data = await res.json();
        localStorage.setItem('round1Result', JSON.stringify(data));
      } catch (err) {
        console.error('Error completing round 1:', err);
      }
      isSubmitting.current = false;
      navigate('/round1-results', { replace: true });
    } else {
      setCurrentIndex((prev) => prev + 1);
      setAnswer('');
      setTimer(120);
      timerRef.current = 120;
      setProgress(((currentIndex + 2) / questions.length) * 100);
      isSubmitting.current = false;
    }
  }, [questions, currentIndex, answer, navigate]);

  // [H8] Timer effect only re-registers when handleSubmit changes (not every tick)
  useEffect(() => {
    const interval = setInterval(() => {
      if (timerRef.current <= 1) {
        handleSubmit();
        clearInterval(interval);
        return;
      }
      setTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [handleSubmit]);

  // ── RENDER ──────────────────────────────────────────────────────────────────
  if (!questions.length) {
    return <div className="loading">Loading questions...</div>;
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="quiz-container">

      {/* FULLSCREEN OVERLAY */}
      {showFullscreenPrompt && (
        <div className="security-overlay">
          <div className="security-modal">
            <h2>⛶ Fullscreen Required</h2>
            <p>This exam must be taken in fullscreen mode. Please click the button below to continue.</p>
            <button className="security-action-btn" onClick={enterFullscreen}>
              Re-enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* TAB SWITCH WARNING TOAST */}
      {showWarning && (
        <div className="warning-toast">
          <span>{warningMessage}</span>
          <div className="warning-progress"></div>
        </div>
      )}

      {/* TAB SWITCH COUNTER BADGE */}
      {tabSwitchCount > 0 && (
        <div className={`tab-switch-badge ${tabSwitchCount >= MAX_TAB_SWITCHES - 1 ? 'danger' : 'warn'}`}>
          ⚠️ Violations: {tabSwitchCount}/{MAX_TAB_SWITCHES}
        </div>
      )}

      <div className="timer">
        Time Left: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
      </div>

      <div className="progress-section">
        <div className="progress-text">Question {currentIndex + 1} of {questions.length}</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="question-section">
        <h2>{currentQuestion.text}</h2>
        {currentQuestion.code_snippet && (
          <pre className="code-box">{currentQuestion.code_snippet}</pre>
        )}

        {/* MCQ Options */}
        <div className="options">
          {['A', 'B', 'C', 'D'].map(opt => {
            const optText = currentQuestion[`option_${opt.toLowerCase()}`];
            if (!optText) return null;
            return (
              <button
                key={opt}
                className={`option${answer === opt ? ' selected' : ''}`}
                onClick={() => setAnswer(opt)}
                style={{
                  background: answer === opt ? '#2563eb' : '#f8fafc',
                  color: answer === opt ? 'white' : '#1e293b',
                  border: `2px solid ${answer === opt ? '#2563eb' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontWeight: 700, minWidth: 20 }}>{opt}.</span>
                <span>{optText}</span>
                {answer === opt && <span style={{ marginLeft: 'auto' }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div className="question-navigation">
          {/* [M7] Skip calls handleSubmit — same as Next, guards against OOB & double-submit */}
          <button
            className="skip-btn"
            onClick={handleSubmit}
            disabled={currentIndex === questions.length - 1}
          >Skip</button>
          <button
            className="next-btn"
            onClick={handleSubmit}
          >
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>

      <button
        className="submit-btn"
        onClick={handleSubmit}
      >
        {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
      </button>
    </div>
  );
}

export default Quiz;