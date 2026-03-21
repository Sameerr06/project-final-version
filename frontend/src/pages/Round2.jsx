import { getApiUrl } from '../services/api';
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Quiz.css";
import "./Round2.css";

// Round 2 total time: 25 minutes
const ROUND2_TOTAL_SECONDS = 25 * 60;
const QUESTION_TIME = 5 * 60;  // 5 min per question
const MAX_TAB_SWITCHES = 3;

function Round2() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [questionTimer, setQuestionTimer] = useState(QUESTION_TIME);
  const [totalTimer, setTotalTimer] = useState(ROUND2_TOTAL_SECONDS);
  const [progress, setProgress] = useState(0);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' or 'console'
  const [isCompiling, setIsCompiling] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Security state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const warningTimerRef = useRef(null);

  // ── FULLSCREEN ──────────────────────────────────────────────────────────────
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
  }, []);

  const handleFullscreenChange = useCallback(() => {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
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

  // ── TAB SWITCH DETECTION ────────────────────────────────────────────────────
  const triggerWarning = useCallback((msg) => {
    setWarningMessage(msg);
    setShowWarning(true);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setShowWarning(false), 4000);
  }, []);

  // ── ANTI-CHEAT ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const preventCopy = (e) => { e.preventDefault(); triggerWarning('🚫 Copying is not allowed.'); };
    const preventCtx = (e) => e.preventDefault();
    const preventShortcuts = (e) => {
      if (e.target.classList.contains('code-editor') || e.target.classList.contains('answer-textarea')) return;
      const blocked = (e.ctrlKey && ['c','a','v','x','u','s','p'].includes(e.key.toLowerCase())) || e.key === 'PrintScreen';
      if (blocked) { e.preventDefault(); triggerWarning('🚫 Keyboard shortcut disabled.'); }
    };
    document.addEventListener('copy', preventCopy);
    document.addEventListener('contextmenu', preventCtx);
    document.addEventListener('keydown', preventShortcuts);
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('contextmenu', preventCtx);
      document.removeEventListener('keydown', preventShortcuts);
      document.body.style.userSelect = '';
    };
  }, [triggerWarning]);

  // ── FETCH ROUND 2 QUESTIONS ─────────────────────────────────────────────────
  useEffect(() => {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) { navigate('/'); return; }

    fetch(getApiUrl('/api/questions/?round=2'))
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(data);
          setProgress((1 / data.length) * 100);
        }
      })
      .catch(err => console.error('Error fetching Round 2 questions:', err));
  }, [navigate]);

  // [H2] finishRound2 defined BEFORE handleVisibilityChange (which references it)
  // ── FINISH ROUND 2 ──────────────────────────────────────────────────────────
  const finishRound2 = useCallback(async (forced = false) => {
    const studentId = localStorage.getItem('studentId');
    const token = localStorage.getItem('studentToken');
    try {
      const res = await fetch(getApiUrl('/api/complete-round2/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, token: token }),  // [C4]
      });
      const data = await res.json();
      localStorage.setItem('round2Result', JSON.stringify(data));
    } catch (err) {
      console.error(err);
    }
    navigate('/thank-you', { replace: true });
  }, [navigate]);

  // [H2] handleVisibilityChange references finishRound2 — must be declared after
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      setTabSwitchCount(prev => {
        const n = prev + 1;
        if (n >= MAX_TAB_SWITCHES) {
          finishRound2(true);
        } else {
          triggerWarning(`⚠️ Tab switch! Warning ${n}/${MAX_TAB_SWITCHES}. Exam will terminate on next switch.`);
        }
        return n;
      });
    }
  }, [triggerWarning, finishRound2]);

  // [M3] Only use visibilitychange — removed blur listener (double-counting)
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [handleVisibilityChange]);

  // ── TOTAL TIMER ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalTimer(prev => {
        if (prev <= 1) { clearInterval(interval); finishRound2(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [finishRound2]);

  // ── SUBMIT ANSWER ───────────────────────────────────────────────────────────
  const submitAnswer = useCallback(async (isCorrectPass, finalCode = '') => {
    if (!questions.length) return;
    const studentId = localStorage.getItem('studentId');
    const token = localStorage.getItem('studentToken');
    const question = questions[currentIndex];

    try {
      const res = await fetch(getApiUrl('/api/submit-answer/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          token: token,               // [C4]
          question_id: question.id,
          chosen_option: isCorrectPass ? "CORRECT" : "WRONG",
          submitted_code: finalCode,
          round_number: 2,
        }),
      });
      const data = await res.json();
      if (data.is_correct) {
        setScore(data.round2_score);
      }
      setAnsweredCount(prev => prev + 1);
    } catch (err) {
      console.error(err);
    }
  }, [questions, currentIndex]);

  // [H7] Added `code` to handleNext dependency array to avoid stale closure
  // ── NEXT QUESTION ───────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    const allPassed = testResults.length > 0 && testResults.every(r => r.passed);
    await submitAnswer(allPassed, code);

    if (currentIndex + 1 >= questions.length) {
      finishRound2(false);
    } else {
      setCurrentIndex(prev => prev + 1);
      setOutput('');
      setTestResults([]);
      setCode('');
      setLanguage('python');
      setProgress(((currentIndex + 2) / questions.length) * 100);
    }
  }, [testResults, currentIndex, questions.length, submitAnswer, finishRound2, code]);

  // ── QUESTION TIMER ──────────────────────────────────────────────────────────
  useEffect(() => {
    setQuestionTimer(QUESTION_TIME);
    const interval = setInterval(() => {
      setQuestionTimer(prev => {
        if (prev <= 1) { clearInterval(interval); handleNext(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  // ── COMPILER ────────────────────────────────────────────────────────────────
  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    if (e.target.value === 'c') {
      setCode('#include <stdio.h>\n\nint main() {\n    // Fix the bug here\n    return 0;\n}');
    } else if (e.target.value === 'python') {
      setCode('# Fix the bug here\n');
    } else if (e.target.value === 'java') {
      setCode('public class Main {\n    public static void main(String[] args) {\n        // Fix the bug here\n    }\n}');
    }
  };

  const runTests = async () => {
    setIsCompiling(true);
    setTestResults([]);
    setActiveTab('tests');
    setOutput('Running tests...\n');
    let allPassed = true;
    const results = [];

    const testCases = currentQuestion.test_cases || [];
    if (testCases.length === 0) {
       setOutput("No test cases provided. Running code normally...\n");
       try {
           const res = await fetch(getApiUrl('/api/compile/'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language, input: '' }),
          });
          const result = await res.json();
          setOutput(result.output || 'No output');
       } catch (err) {
          setOutput(`Error: ${err.message}`);
       }
       setIsCompiling(false);
       return;
    }

    let consoleOutput = "";

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        try {
          const res = await fetch(getApiUrl('/api/compile/'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language, input: tc.input }),
          });
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
          const result = await res.json();
          const actualOutput = (result.output || '').trim();
          const expected = (tc.expected_output || '').trim();
          const passed = actualOutput === expected;
          if (!passed) allPassed = false;

          results.push({
             input: tc.input,
             expected: expected,
             actual: actualOutput,
             passed
          });
          consoleOutput += `Test Case ${i+1}:\nInput: ${tc.input}\nOutput:\n${actualOutput}\n\n`;
        } catch (err) {
          results.push({ input: tc.input, expected: tc.expected_output, actual: `Error: ${err.message}`, passed: false });
          consoleOutput += `Test Case ${i+1} Error: ${err.message}\n\n`;
          allPassed = false;
        }
    }

    setTestResults(results);
    setOutput(consoleOutput);
    setIsCompiling(false);
  };

  // ── FORMAT TIME ─────────────────────────────────────────────────────────────
  const fmtTime = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  if (!questions.length) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading Round 2 questions...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const totalTimePercent = (totalTimer / ROUND2_TOTAL_SECONDS) * 100;
  const questionTimePercent = (questionTimer / QUESTION_TIME) * 100;

  return (
    <div className="quiz-container r2-container">

      {/* FULLSCREEN OVERLAY */}
      {showFullscreenPrompt && (
        <div className="security-overlay">
          <div className="security-modal">
            <h2>⛶ Fullscreen Required</h2>
            <p>Round 2 must be taken in fullscreen mode.</p>
            <button className="security-action-btn" onClick={enterFullscreen}>Re-enter Fullscreen</button>
          </div>
        </div>
      )}

      {/* WARNING TOAST */}
      {showWarning && (
        <div className="warning-toast">
          <span>{warningMessage}</span>
          <div className="warning-progress"></div>
        </div>
      )}

      {/* VIOLATION BADGE */}
      {tabSwitchCount > 0 && (
        <div className={`tab-switch-badge ${tabSwitchCount >= MAX_TAB_SWITCHES - 1 ? 'danger' : 'warn'}`}>
          ⚠️ Violations: {tabSwitchCount}/{MAX_TAB_SWITCHES}
        </div>
      )}

      {/* TOP BAR */}
      <div className="r2-top-bar">
        <div className="r2-brand">🏆 CODEVERSE ROUND 2</div>
        <div className="r2-timers-mini">
           Total: <span className={totalTimer < 300 ? 'danger' : ''}>{fmtTime(totalTimer)}</span> | Question: <span className={questionTimer < 60 ? 'danger' : ''}>{fmtTime(questionTimer)}</span>
        </div>
        <div className="r2-top-actions">
           {/* [H3] Skip calls handleNext — same logic as Submit, prevents stale state */}
           <button
             className="skip-btn"
             onClick={handleNext}
             disabled={currentIndex >= questions.length - 1}
           >
             Skip
           </button>
           <button className="submit-btn r2-submit-btn" onClick={handleNext}>
             {currentIndex === questions.length - 1 ? '🏁 Finish Exam' : 'Submit Code'}
           </button>
        </div>
      </div>

      <div className="r2-split-layout">
         {/* LEFT PANE */}
         <div className="r2-left-pane">
            <div className="r2-question-header">
               <h2>{currentIndex + 1}. {currentQuestion.text}</h2>
               <span className={`difficulty-tag difficulty-${currentQuestion.difficulty?.toLowerCase() || 'medium'}`}>
                  {currentQuestion.difficulty || "Medium"}
               </span>
            </div>

            <div className="r2-question-content">
               {currentQuestion.code_snippet && (
                 <div className="r2-section">
                   <h3>Problem Description</h3>
                   <pre className="r2-pre-wrap">{currentQuestion.code_snippet}</pre>
                 </div>
               )}

               {currentQuestion.examples && (
                 <div className="r2-section">
                   <h3>Examples</h3>
                   <pre className="r2-pre-wrap r2-example-box">{currentQuestion.examples}</pre>
                 </div>
               )}

               {currentQuestion.constraints && (
                 <div className="r2-section">
                   <h3>Constraints</h3>
                   <pre className="r2-pre-wrap r2-constraint-box">{currentQuestion.constraints}</pre>
                 </div>
               )}
            </div>
         </div>

         {/* RIGHT PANE */}
         <div className="r2-right-pane">
            {/* TOP HALF: EDITOR */}
            <div className="r2-editor-section">
               <div className="r2-editor-toolbar">
                  <select value={language} onChange={handleLanguageChange} className="language-selector">
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="c">C</option>
                  </select>
                  <button className="run-btn" onClick={runTests} disabled={isCompiling}>
                    {isCompiling ? '⏳ Running...' : '▶ Run Tests'}
                  </button>
               </div>
               <div className="r2-editor-wrapper">
                 <div className="line-numbers">
                    {code.split('\n').map((_, i) => <div key={i}>{i+1}</div>)}
                 </div>
                 <textarea
                   className="code-editor r2-split-editor"
                   value={code}
                   onChange={(e) => setCode(e.target.value)}
                   spellCheck="false"
                   onCopy={(e) => e.stopPropagation()}
                   onCut={(e) => e.stopPropagation()}
                   onPaste={(e) => e.stopPropagation()}
                 />
               </div>
            </div>

            {/* BOTTOM HALF: TEST CASES */}
            <div className="r2-test-section">
               <div className="r2-test-tabs">
                  <button className={`r2-tab ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setActiveTab('tests')}>Test Cases</button>
                  <button className={`r2-tab ${activeTab === 'console' ? 'active' : ''}`} onClick={() => setActiveTab('console')}>Console Output</button>
               </div>
               <div className="r2-test-content">
                  {activeTab === 'tests' ? (
                     <div className="r2-test-results">
                        {testResults.length === 0 ? (
                           <div className="r2-no-tests">Click "Run Tests" to evaluate your code.</div>
                        ) : (
                           testResults.map((tr, idx) => (
                              <div key={idx} className={`r2-test-case-card ${tr.passed ? 'passed' : 'failed'}`}>
                                 <div className="tc-header">
                                    <h4>Test Case {idx + 1}</h4>
                                    <span className={`tc-status tc-${tr.passed ? 'pass' : 'fail'}`}>
                                       {tr.passed ? '✅ Passed' : '❌ Failed'}
                                    </span>
                                 </div>
                                 <div className="tc-body">
                                    <div className="tc-row"><strong>Input:</strong> <pre>{tr.input}</pre></div>
                                    <div className="tc-row"><strong>Expected:</strong> <pre>{tr.expected}</pre></div>
                                    <div className="tc-row"><strong>Actual:</strong> <pre>{tr.actual}</pre></div>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  ) : (
                     <pre className="r2-console-output">{output}</pre>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

export default Round2;
