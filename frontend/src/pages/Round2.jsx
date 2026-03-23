import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { quizApi, compilerApi, questionsApi } from "../services/api";
import "./Quiz.css";
import "./Round2.css";

const ROUND2_TOTAL_SECONDS = 25 * 60;
const QUESTION_TIME = 5 * 60;
const MAX_TAB_SWITCHES = 3;

function Round2() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(QUESTION_TIME);
  const [totalTimer, setTotalTimer] = useState(ROUND2_TOTAL_SECONDS);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState(null); // null means not run yet
  const [activeTab, setActiveTab] = useState('tests');
  const [isCompiling, setIsCompiling] = useState(false);
  
  // Security state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const warningTimerRef = useRef(null);
  
  // Refs
  const submittingRef = useRef(false);
  const qRef = useRef([]);
  const idxRef = useRef(0);
  const codeRef = useRef('');
  const testRef = useRef(null);
  
  useEffect(() => { qRef.current = questions; }, [questions]);
  useEffect(() => { idxRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { testRef.current = testResults; }, [testResults]);

  // Draft Autosave
  useEffect(() => {
    const draftInterval = setInterval(() => {
      if (codeRef.current) {
        localStorage.setItem('r2_draft_code', codeRef.current);
      }
    }, 10000);
    return () => clearInterval(draftInterval);
  }, []);

  const getStarterCode = (lang, snippet) => {
    if (snippet) return snippet;
    if (lang === 'c') return '#include <stdio.h>\n\nint main() {\n    return 0;\n}';
    if (lang === 'python') return '# Fix the bug here\n';
    if (lang === 'java') return 'public class Main {\n    public static void main(String[] args) {\n    }\n}';
    return '';
  };

  const loadQuestionState = (qIdx) => {
    const qs = qRef.current;
    if (!qs || !qs[qIdx]) return;
    const q = qs[qIdx];
    
    // First load logic for the entire round or new question
    const draft = localStorage.getItem('r2_draft_code');
    if (qIdx === idxRef.current && draft) {
      setCode(draft);
    } else {
      setCode(getStarterCode(language, q.code_snippet));
    }
    setTestResults(null);
    setOutput('');
  };

  // ── FULLSCREEN ──────────────────────────────────────────────────────────────
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

  // ── TAB SWITCH ──────────────────────────────────────────────────────────────
  const triggerWarning = useCallback((msg) => {
    setWarningMessage(msg);
    setShowWarning(true);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setShowWarning(false), 4000);
  }, []);

  const finishRound2 = useCallback(async () => {
    const studentId = localStorage.getItem('studentId');
    const token = localStorage.getItem('studentToken');
    try {
      const data = await quizApi.completeRound2(studentId, token);
      localStorage.setItem('round2Result', JSON.stringify(data));
      localStorage.removeItem('r2_draft_code');
    } catch (err) {
      console.error(err);
    }
    navigate('/thank-you', { replace: true });
  }, [navigate]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      setTabSwitchCount(prev => {
        const n = prev + 1;
        if (n >= MAX_TAB_SWITCHES) {
          finishRound2();
        } else {
          triggerWarning(`⚠️ Tab switch! Warning ${n}/${MAX_TAB_SWITCHES}.`);
        }
        return n;
      });
    }
  }, [triggerWarning, finishRound2]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [handleVisibilityChange]);

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
    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('contextmenu', preventCtx);
      document.removeEventListener('keydown', preventShortcuts);
    };
  }, [triggerWarning]);

  // ── FETCH QUESTIONS ─────────────────────────────────────────────────────────
  useEffect(() => {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) { navigate('/'); return; }

    const fetchQuestions = async () => {
      try {
        const data = await questionsApi.listStudent(2);
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(data);
          // Load init
          setTimeout(() => {
             const draft = localStorage.getItem('r2_draft_code');
             if (draft) { setCode(draft); }
             else { setCode(getStarterCode('python', data[0].code_snippet)); }
          }, 0);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchQuestions();
  }, [navigate]);

  // ── HANDLE NEXT ─────────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    const qs = qRef.current;
    const cIdx = idxRef.current;
    const currentCode = codeRef.current;
    const tr = testRef.current || [];
    const allPassed = tr.length > 0 && tr.every(r => r.passed);

    if (qs.length === 0) {
      submittingRef.current = false;
      return;
    }

    const studentId = localStorage.getItem('studentId');
    const token = localStorage.getItem('studentToken');
    const question = qs[cIdx];

    try {
      await quizApi.submitAnswer({
        student_id: studentId,
        token: token,
        question_id: question.id,
        chosen_option: allPassed ? "CORRECT" : "WRONG",
        submitted_code: currentCode,
        round_number: 2,
      });
    } catch (err) {
      console.error(err);
    }

    if (cIdx + 1 >= qs.length) {
      finishRound2();
    } else {
      localStorage.removeItem('r2_draft_code');
      setCurrentIndex(cIdx + 1);
      
      const nextQ = qs[cIdx + 1];
      setCode(getStarterCode(language, nextQ.code_snippet));
      setTestResults(null);
      setOutput('');
      setQuestionTimer(QUESTION_TIME);
      
      submittingRef.current = false;
    }
  }, [finishRound2, language]);

  // ── TIMERS ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tInterval = setInterval(() => {
      setTotalTimer(prev => {
        if (prev <= 1) { clearInterval(tInterval); finishRound2(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tInterval);
  }, [finishRound2]);

  useEffect(() => {
    const qInterval = setInterval(() => {
      setQuestionTimer(prev => {
        if (prev <= 1) { 
          if (!submittingRef.current) handleNext();
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(qInterval);
  }, [handleNext]);

  // ── COMPILER ────────────────────────────────────────────────────────────────
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(getStarterCode(newLang, questions[currentIndex]?.code_snippet));
  };

  const runTests = async () => {
    setIsCompiling(true);
    setTestResults(null);
    setActiveTab('tests');
    setOutput('Running tests...\n');
    let consoleOutput = "";
    const results = [];
    
    const tcCases = questions[currentIndex]?.test_cases || [];

    if (tcCases.length === 0) {
       setOutput("No test cases. Running code normally...\n");
       try {
          const result = await compilerApi.run(code, language, '');
          setOutput(result.output || 'No output');
       } catch (err) {
          setOutput(`Error: ${err.message}`);
       }
       setIsCompiling(false);
       return;
    }

    for (let i = 0; i < tcCases.length; i++) {
        const tc = tcCases[i];
        try {
          const result = await compilerApi.run(code, language, tc.input);
          const actualOutput = (result.output || '').trim();
          const expected = (tc.expected_output || '').trim();
          const passed = actualOutput === expected;

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
        }
    }

    setTestResults(results);
    setOutput(consoleOutput);
    setIsCompiling(false);
  };

  const fmtTime = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  if (!questions.length) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  let passedCount = 0;
  let allPassed = false;
  
  if (testResults) {
    passedCount = testResults.filter(r => r.passed).length;
    allPassed = passedCount === testResults.length && testResults.length > 0;
  }

  return (
    <div className="quiz-container r2-container">
      {showFullscreenPrompt && (
        <div className="security-overlay">
          <div className="security-modal">
            <h2>Fullscreen Required</h2>
            <button className="security-action-btn" onClick={enterFullscreen}>Re-enter Fullscreen</button>
          </div>
        </div>
      )}

      {showWarning && (
        <div className="warning-toast">
          <span>{warningMessage}</span>
        </div>
      )}

      {/* TOP BAR */}
      <div className="r2-top-bar">
        <div className="r2-brand">🏆 CODEVERSE ROUND 2</div>
        <div className="r2-timers-mini">
           Total: <span className={totalTimer < 300 ? 'danger' : ''}>{fmtTime(totalTimer)}</span> | Question: <span className={questionTimer < 60 ? 'danger' : ''}>{fmtTime(questionTimer)}</span>
        </div>
        <div className="r2-top-actions">
           <button
             className="skip-btn"
             onClick={handleNext}
             disabled={submittingRef.current || currentIndex >= questions.length - 1}
           >
             Skip
           </button>
           <button className="submit-btn r2-submit-btn" onClick={handleNext} disabled={submittingRef.current}>
             {currentIndex === questions.length - 1 ? '🏁 Finish Exam' : 'Submit Code'}
           </button>
        </div>
      </div>

      <div className="r2-split-layout">
         {/* LEFT PANE */}
         <div className="r2-left-pane">
            <div className="r2-question-header">
               <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                  <h2>{currentIndex + 1}. {currentQuestion.text}</h2>
                  {allPassed && <span className="all-passed-badge">✓ All tests passed</span>}
               </div>
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
            <div className="r2-editor-section">
               <div className="r2-editor-toolbar">
                  <select value={language} onChange={handleLanguageChange} className="language-selector">
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="c">C</option>
                  </select>
                  
                  {testResults && (
                    <span className="pass-fail-counter">
                      {passedCount}/{testResults.length} passed
                    </span>
                  )}
                  
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
                 />
               </div>
            </div>

            <div className="r2-test-section">
               <div className="r2-test-tabs">
                  <button className={`r2-tab ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setActiveTab('tests')}>Test Cases</button>
                  <button className={`r2-tab ${activeTab === 'console' ? 'active' : ''}`} onClick={() => setActiveTab('console')}>Console Output</button>
               </div>
               <div className="r2-test-content">
                  {activeTab === 'tests' ? (
                     <div className="r2-test-results">
                        {!testResults ? (
                           <div className="r2-no-tests">(no output yet)</div>
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
                                    <div className="tc-row"><strong>Actual:</strong> <pre className={`actual-output ${tr.passed ? 'passed-text' : 'failed-text'}`}>{tr.actual}</pre></div>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  ) : (
                     <pre className="r2-console-output">{!output && !isCompiling ? '(no output yet)' : output}</pre>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

export default Round2;
