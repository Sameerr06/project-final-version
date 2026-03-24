import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { quizApi, questionsApi } from "../services/api";
import "./Quiz.css";

function Quiz() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [timer, setTimer] = useState(120);

  // Security State
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const MAX_TAB_SWITCHES = 3;
  const warningTimerRef = useRef(null);

  const isSubmitting = useRef(false);

  const timerRef = useRef(120);
  const idxRef = useRef(0);
  const answerRef = useRef('');
  const questionsRef = useRef([]);

  useEffect(() => { timerRef.current = timer; }, [timer]);
  useEffect(() => { idxRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { answerRef.current = answer; }, [answer]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  // 1. FULLSCREEN LOCK
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }, []);

  const handleFullscreenChange = useCallback(() => {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    setShowFullscreenPrompt(!fsEl);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    enterFullscreen();
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [enterFullscreen, handleFullscreenChange]);

  // 2. TAB SWITCH DETECTION (visibilitychange only)
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
          triggerWarning(`⚠️ Tab switch detected! Warning ${newCount}/${MAX_TAB_SWITCHES}.`);
        }
        return newCount;
      });
    }
  }, [navigate, triggerWarning]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [handleVisibilityChange]);

  // 3. DISABLE COPYING & RIGHT-CLICK
  useEffect(() => {
    const preventCopy = (e) => { e.preventDefault(); triggerWarning('🚫 Copying disabled.'); return false; };
    const preventContextMenu = (e) => { e.preventDefault(); return false; };
    const preventKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c','v','x','p','a','s'].includes(e.key.toLowerCase())) {
        e.preventDefault(); triggerWarning('🚫 Shortcuts disabled.'); return false;
      }
    };
    document.addEventListener('copy', preventCopy);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKey);
    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKey);
    };
  }, [triggerWarning]);

  // 4. FETCH QUESTIONS
  useEffect(() => {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) {
      navigate('/');
      return;
    }

    const fetchQuestions = async () => {
      try {
        const data = await questionsApi.listStudent(1);
        if (Array.isArray(data)) {
          setQuestions(data);
        }
      } catch (err) {
        console.error('Error fetching questions', err);
      }
    };
    fetchQuestions();
  }, [navigate]);

  // SUBMIT HANDLER
  const handleSubmit = useCallback(async () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    const qArr = questionsRef.current;
    const cIdx = idxRef.current;
    if (!qArr.length) {
      isSubmitting.current = false;
      return;
    }

    const studentId = localStorage.getItem('studentId');
    const token = localStorage.getItem('studentToken');
    const question = qArr[cIdx];
    const chosenAns = answerRef.current;

    if (chosenAns) {
      try {
        await quizApi.submitAnswer({
          student_id: studentId,
          token: token,
          question_id: question.id,
          chosen_option: chosenAns,
          round_number: 1,
        });
      } catch (err) {
        console.error('Submit error:', err);
      }
    }

    if (cIdx + 1 >= qArr.length) {
      try {
        const data = await quizApi.completeRound1(studentId, token);
        localStorage.setItem('round1Result', JSON.stringify(data));
        isSubmitting.current = false;
        navigate('/round1-results', { replace: true });
      } catch (err) {
        console.error('Completion error:', err);
        alert('Failed to submit quiz. Please check your connection and try again.');
        isSubmitting.current = false;
      }
    } else {
      setCurrentIndex(cIdx + 1);
      setAnswer('');
      setTimer(120);
      isSubmitting.current = false;
    }
  }, [navigate]);

  // TIMER EFFECT
  useEffect(() => {
    if (!questions.length) return;
    const interval = setInterval(() => {
      if (timerRef.current <= 1) {
        handleSubmit();
      } else {
        setTimer(t => t - 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [questions.length, handleSubmit]);

  if (!questions.length) {
    return (
      <div className="quiz-loading">
        <div className="spinner"></div> Loading questions...
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPct = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="quiz-container">
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

      {showWarning && (
        <div className="warning-toast">
          <span>{warningMessage}</span>
          <div className="warning-progress"></div>
        </div>
      )}

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
          <div className="progress-fill" style={{ width: `${progressPct}%` }}></div>
        </div>
      </div>

      <div className="question-section">
        <h2>{currentQuestion.text}</h2>
        {currentQuestion.code_python && (
          <pre className="code-box">{currentQuestion.code_python}</pre>
        )}

        <div className="options">
          {['A', 'B', 'C', 'D'].map(opt => {
            const optText = currentQuestion[`option_${opt.toLowerCase()}`];
            if (!optText) return null;
            const isSelected = answer === opt;
            return (
              <button
                key={opt}
                className={`option${isSelected ? ' selected' : ''}`}
                onClick={() => setAnswer(opt)}
                style={{
                  background: isSelected ? '#2563eb' : '#f8fafc',
                  color: isSelected ? 'white' : '#1e293b',
                  border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
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
                {isSelected && <span style={{ marginLeft: 'auto' }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div className="question-navigation">
          <button
            className="skip-btn"
            onClick={handleSubmit}
            disabled={currentIndex === questions.length - 1}
          >
            Skip
          </button>
          <button
            className="next-btn"
            onClick={handleSubmit}
            disabled={isSubmitting.current}
          >
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Quiz;