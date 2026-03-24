import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { quizApi, compilerApi, questionsApi } from "../services/api";
import "./Round2.css";

const ROUND2_TOTAL_SECONDS = 30 * 60;
const QUESTION_TIME = 6 * 60;
const MAX_TAB_SWITCHES = 3;

const STARTER_TEMPLATES = {
  python: (q) => q?.code_python || "# Fix the bug and write your solution here\n\n",
  java: (q) => {
    if (q?.code_java) return q.code_java;
    return `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}`;
  },
  c: (q) =>
    q?.code_c ||
    `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
};

function fmtTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Normalize output for comparison.
 * - Normalize line endings
 * - Trim trailing whitespace per line
 * - Trim leading/trailing blank lines
 */
function normalizeOutput(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

/** Returns true if output looks like a compile/runtime error, not program output */
function looksLikeCompileError(output) {
  if (!output) return false;
  const lower = output.toLowerCase();
  return (
    lower.includes("compilation error") ||
    lower.includes("syntaxerror") ||
    lower.includes("syntax error") ||
    (lower.includes("error:") && (lower.includes("\n") || lower.startsWith("error:")))
  );
}

function looksLikeRuntimeError(output) {
  if (!output) return false;
  const lower = output.toLowerCase();
  return (
    lower.includes("traceback (most recent call last)") ||
    lower.includes("nameerror") ||
    lower.includes("typeerror") ||
    lower.includes("valueerror") ||
    lower.includes("zerodivisionerror") ||
    lower.includes("indexerror") ||
    lower.includes("attributeerror") ||
    lower.includes("runtimeerror") ||
    lower.includes("exception in thread") ||
    lower.includes("segmentation fault") ||
    lower.startsWith("error (exit code")
  );
}

const LineNumbers = React.memo(function LineNumbers({ code }) {
  const count = (code || "").split("\n").length;
  return (
    <div className="r2-line-numbers">
      {Array.from({ length: Math.max(count, 1) }, (_, i) => (
        <span key={i + 1}>{i + 1}</span>
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TestCasePanel
// ─────────────────────────────────────────────────────────────────────────────
const TestCasePanel = React.memo(function TestCasePanel({ testResults, output, isCompiling, activeTab, setActiveTab, testCases, runError }) {
  const passedCount = testResults ? testResults.filter((r) => r.passed).length : 0;
  const totalCount = testResults ? testResults.length : 0;
  const allPassed = totalCount > 0 && passedCount === totalCount;

  return (
    <div className="r2-test-section">
      <div className="r2-test-tabs-bar">
        <button className={`r2-test-tab ${activeTab === "tests" ? "active" : ""}`} onClick={() => setActiveTab("tests")}>
          <span className="r2-tab-icon">⚡</span>
          Test Results
          {testResults && (
            <span className={`r2-tab-badge ${allPassed ? "badge-pass" : "badge-fail"}`}>
              {passedCount}/{totalCount}
            </span>
          )}
        </button>
        <button className={`r2-test-tab ${activeTab === "console" ? "active" : ""}`} onClick={() => setActiveTab("console")}>
          <span className="r2-tab-icon">🖥</span>
          Console
        </button>
        <button className={`r2-test-tab ${activeTab === "cases" ? "active" : ""}`} onClick={() => setActiveTab("cases")}>
          <span className="r2-tab-icon">📋</span>
          Test Cases ({testCases?.length || 0})
        </button>
        {allPassed && (
          <div className="r2-all-pass-badge"><span>✓</span> All Passed</div>
        )}
      </div>

      <div className="r2-test-body">

        {/* ── RESULTS ── */}
        {activeTab === "tests" && (
          <div className="r2-test-results-list">
            {isCompiling && (
              <div className="r2-running-indicator">
                <div className="r2-pulse-dot" />
                <span>Compiling and running against test cases…</span>
              </div>
            )}
            {!isCompiling && runError && (
              <div className="r2-compile-error-box">
                <div className="r2-compile-error-title">⚠ Compilation / Syntax Error</div>
                <pre className="r2-compile-error-body">{runError}</pre>
                <div className="r2-compile-error-hint">Fix the error above, then click Run Tests again.</div>
              </div>
            )}
            {!isCompiling && !runError && !testResults && (
              <div className="r2-empty-state">
                <div className="r2-empty-icon">▶</div>
                <p>Click <strong>Run Tests</strong> to compile your code and run it against each test case automatically.</p>
              </div>
            )}
            {!isCompiling && !runError && testResults &&
              testResults.map((tr, i) => (
                <div key={i} className={`r2-tc-card ${tr.passed ? "r2-tc-pass" : "r2-tc-fail"}`}>
                  <div className="r2-tc-header">
                    <div className="r2-tc-title">
                      <span className="r2-tc-num">Test {i + 1}</span>
                      <span className={`r2-tc-verdict ${tr.passed ? "verdict-pass" : "verdict-fail"}`}>
                        {tr.passed ? "✓ PASSED" : "✗ FAILED"}
                      </span>
                      {tr.isError && <span className="r2-tc-error-tag">Runtime Error</span>}
                    </div>
                    {!tr.passed && !tr.isError && <span className="r2-tc-diff-hint">Output mismatch</span>}
                  </div>
                  <div className="r2-tc-grid">
                    <div className="r2-tc-field">
                      <span className="r2-tc-label">stdin Input</span>
                      <pre className="r2-tc-pre r2-tc-input">
                        {tr.input !== "" && tr.input !== undefined ? tr.input : "(no input)"}
                      </pre>
                    </div>
                    <div className="r2-tc-field">
                      <span className="r2-tc-label">Expected Output</span>
                      <pre className="r2-tc-pre r2-tc-expected">{tr.expected}</pre>
                    </div>
                    <div className="r2-tc-field r2-tc-full">
                      <span className="r2-tc-label">
                        Your Output
                        {tr.passed
                          ? <span className="r2-tc-match"> ✓ matches expected</span>
                          : <span className="r2-tc-mismatch">{tr.isError ? " ⚠ program error" : " ✗ differs from expected"}</span>
                        }
                      </span>
                      <pre className={`r2-tc-pre ${tr.passed ? "r2-tc-actual-pass" : tr.isError ? "r2-tc-actual-error" : "r2-tc-actual-fail"}`}>
                        {tr.rawActual || "(no output)"}
                      </pre>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── CONSOLE ── */}
        {activeTab === "console" && (
          <div className="r2-console-wrap">
            <div className="r2-console-header">
              <span className="r2-console-label">stdout / stderr</span>
              <span className="r2-console-hint">
                {isCompiling ? "Running…" : output ? "last run" : "no output yet"}
              </span>
            </div>
            <pre className="r2-console-output">
              {isCompiling
                ? "Running your code…"
                : output || "No output yet.\nUse ▷ Run or ▶ Run Tests to see output here."}
            </pre>
          </div>
        )}

        {/* ── TEST CASES PREVIEW ── */}
        {activeTab === "cases" && (
          <div className="r2-testcases-preview">
            {!testCases || testCases.length === 0 ? (
              <div className="r2-empty-state"><p>No test cases defined for this question.</p></div>
            ) : (
              testCases.map((tc, i) => (
                <div key={i} className="r2-tc-preview-card">
                  <div className="r2-tc-preview-header">Test Case {i + 1}</div>
                  <div className="r2-tc-preview-row">
                    <span>stdin Input:</span>
                    <pre>{(tc.input ?? tc.stdin ?? tc.in ?? "") !== "" ? (tc.input ?? tc.stdin ?? tc.in) : "(no input)"}</pre>
                  </div>
                  <div className="r2-tc-preview-row">
                    <span>Expected Output:</span>
                    <pre>{(tc.expected_output ?? tc.expected ?? tc.output ?? "") !== "" ? (tc.expected_output ?? tc.expected ?? tc.output) : "(no expected output defined)"}</pre>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const CodeEditor = React.memo(function CodeEditor({ initialCode, onCodeChange }) {
  const [localCode, setLocalCode] = useState(initialCode);
  const editorRef = useRef(null);

  useEffect(() => {
    setLocalCode(initialCode || "");
  }, [initialCode]);

  const handleChange = (e) => {
    setLocalCode(e.target.value);
    if (onCodeChange) onCodeChange(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = editorRef.current;
      if (!el) return;
      const s = el.selectionStart;
      const end = el.selectionEnd;
      const v = el.value.substring(0, s) + "    " + el.value.substring(end);
      setLocalCode(v);
      if (onCodeChange) onCodeChange(v);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 4; });
    }
  };

  return (
    <div className="r2-editor-area r2-editor-wrap">
      <LineNumbers code={localCode} />
      <textarea
        ref={editorRef}
        className="r2-code-editor"
        value={localCode}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
      />
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
function Round2() {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(QUESTION_TIME);
  const [totalTimer, setTotalTimer] = useState(ROUND2_TOTAL_SECONDS);
  const [initialCode, setInitialCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [output, setOutput] = useState("");
  const [testResults, setTestResults] = useState(null);
  const [runError, setRunError] = useState(null);
  const [activeTab, setActiveTab] = useState("tests");
  const [isCompiling, setIsCompiling] = useState(false);
  const customInputRef = useRef("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [score, setScore] = useState(0);

  // Security
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const warningTimerRef = useRef(null);

  // ── FIX: separate ref for finishing so it doesn't conflict with handleNext's submittingRef
  const finishingRef = useRef(false); // guards finishRound2 from double-call
  const submittingRef = useRef(false); // guards handleNext from double-click

  const qRef = useRef([]);
  const idxRef = useRef(0);
  const codeRef = useRef("");
  const testRef = useRef(null);
  const langRef = useRef("python");

  useEffect(() => { qRef.current = questions; }, [questions]);
  useEffect(() => { idxRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { testRef.current = testResults; }, [testResults]);
  useEffect(() => { langRef.current = language; }, [language]);

  const handleCodeChange = useCallback((newCode) => {
    codeRef.current = newCode;
  }, []);

  // Draft autosave per question+language every 10s
  useEffect(() => {
    const iv = setInterval(() => {
      if (codeRef.current) {
        localStorage.setItem(`r2_draft_q${idxRef.current}_${langRef.current}`, codeRef.current);
      }
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  // ── FULLSCREEN ─────────────────────────────────────────────────────────────
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => { });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }, []);

  const handleFullscreenChange = useCallback(() => {
    const inFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    setShowFullscreenPrompt(!inFS);
  }, []);

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    enterFullscreen();
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [enterFullscreen, handleFullscreenChange]);

  // ── WARNING HELPER ─────────────────────────────────────────────────────────
  const triggerWarning = useCallback((msg) => {
    setWarningMessage(msg);
    setShowWarning(true);
    clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setShowWarning(false), 4000);
  }, []);

  // ── FINISH ROUND 2 ─────────────────────────────────────────────────────────
  // FIX: uses finishingRef (not submittingRef) so it doesn't conflict with handleNext
  const finishRound2 = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    const studentId = localStorage.getItem("studentId");
    const token = localStorage.getItem("studentToken");
    try {
      const data = await quizApi.completeRound2(studentId, token);
      localStorage.setItem("round2Result", JSON.stringify(data));
      // Clean all drafts
      for (let i = 0; i < 20; i++) {
        ["python", "java", "c"].forEach((l) =>
          localStorage.removeItem(`r2_draft_q${i}_${l}`)
        );
      }
      navigate("/thank-you", { replace: true });
    } catch (err) {
      console.error("completeRound2 error:", err);
      alert("Failed to wrap up Round 2. Please check your connection.");
      finishingRef.current = false;
    }
  }, [navigate]);

  // ── TAB-SWITCH DETECTION ───────────────────────────────────────────────────
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      setTabSwitchCount((prev) => {
        const n = prev + 1;
        if (n >= MAX_TAB_SWITCHES) {
          finishRound2();
        } else {
          triggerWarning(
            `⚠️ Tab switch detected! Warning ${n}/${MAX_TAB_SWITCHES} — ${MAX_TAB_SWITCHES - n} more will auto-submit.`
          );
        }
        return n;
      });
    }
  }, [triggerWarning, finishRound2]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(warningTimerRef.current);
    };
  }, [handleVisibilityChange]);

  // ── ANTI-CHEAT ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const preventCopy = (e) => {
      if (e.target.closest(".r2-editor-area")) return;
      e.preventDefault();
      triggerWarning("🚫 Copying is not allowed during the exam.");
    };
    const preventCtx = (e) => { if (!e.target.closest(".r2-editor-area")) e.preventDefault(); };
    const preventKeys = (e) => {
      if (e.target.closest(".r2-editor-area")) return;
      if ((e.ctrlKey || e.metaKey) && ["c", "a", "v", "x", "u", "s", "p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        triggerWarning("🚫 Keyboard shortcuts are disabled.");
      }
    };
    document.addEventListener("copy", preventCopy);
    document.addEventListener("contextmenu", preventCtx);
    document.addEventListener("keydown", preventKeys);
    return () => {
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("contextmenu", preventCtx);
      document.removeEventListener("keydown", preventKeys);
    };
  }, [triggerWarning]);

  // ── FETCH QUESTIONS ────────────────────────────────────────────────────────
  useEffect(() => {
    const studentId = localStorage.getItem("studentId");
    if (!studentId) { navigate("/"); return; }
    (async () => {
      try {
        const data = await questionsApi.listStudent(2);
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(data);
          const firstQ = data[0];
          // Determine initial language: favor python if code exists, else first one with code
          let lang = "python";
          if (!firstQ.code_python) {
            if (firstQ.code_java) lang = "java";
            else if (firstQ.code_c) lang = "c";
          }
          setLanguage(lang);
          const draft = localStorage.getItem(`r2_draft_q0_${lang}`);
          const initC = draft || STARTER_TEMPLATES[lang](firstQ);
          setInitialCode(initC);
          codeRef.current = initC;
        }
      } catch (err) {
        console.error("Failed to fetch questions:", err);
      }
    })();
  }, [navigate]);

  // ── TAB KEY logic moved to CodeEditor component ──────────────────────────

  // ── ADVANCE / SUBMIT QUESTION ──────────────────────────────────────────────
  // FIX: reset submittingRef properly; call finishRound2 only for last question
  const handleNext = useCallback(async (forced = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    const qs = qRef.current;
    const cIdx = idxRef.current;
    if (!qs.length) { submittingRef.current = false; return; }

    const studentId = localStorage.getItem("studentId");
    const token = localStorage.getItem("studentToken");
    const question = qs[cIdx];
    const tr = testRef.current || [];
    const allPassed = tr.length > 0 && tr.every((r) => r.passed);

    // Submit answer to backend
    try {
      await quizApi.submitAnswer({
        student_id: studentId,
        token,
        question_id: question.id,
        chosen_option: allPassed ? "CORRECT" : "WRONG",
        submitted_code: codeRef.current,
        is_correct: allPassed,
        round_number: 2,
      });
      if (allPassed) setScore((s) => s + (question.points || 20));
    } catch (err) {
      console.error("submitAnswer error:", err);
    }

    // Clear draft for submitted question
    ["python", "java", "c"].forEach((l) =>
      localStorage.removeItem(`r2_draft_q${cIdx}_${l}`)
    );

    const isLastQuestion = cIdx + 1 >= qs.length;

    if (isLastQuestion) {
      // FIX: reset submittingRef before calling finishRound2
      // finishRound2 has its own finishingRef guard
      submittingRef.current = false;
      finishRound2();
    } else {
      const nextIdx = cIdx + 1;
      const nextQ = qs[nextIdx];
      let lang = "python";
      if (!nextQ.code_python) {
        if (nextQ.code_java) lang = "java";
        else if (nextQ.code_c) lang = "c";
      }
      setLanguage(lang);
      const draft = localStorage.getItem(`r2_draft_q${nextIdx}_${lang}`);
      setCurrentIndex(nextIdx);
      const initC = draft || STARTER_TEMPLATES[lang](nextQ);
      setInitialCode(initC);
      codeRef.current = initC;
      setTestResults(null);
      setRunError(null);
      setOutput("");
      setQuestionTimer(QUESTION_TIME);
      setActiveTab("tests");
      // FIX: always reset after navigation so next question can be submitted
      submittingRef.current = false;
    }
  }, [finishRound2]);

  // ── TIMERS ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setTotalTimer((p) => {
        if (p <= 1) { clearInterval(iv); finishRound2(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [finishRound2]);

  useEffect(() => {
    const iv = setInterval(() => {
      setQuestionTimer((p) => {
        if (p <= 1) {
          if (!submittingRef.current) handleNext(true);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [handleNext]);

  // ══════════════════════════════════════════════════════════════════════════
  // RUN TESTS
  // Sends each test case's `.input` as stdin to the compiler backend.
  // The backend pipes it via subprocess.run(input=...).
  // Output is normalized and compared with expected_output.
  // ══════════════════════════════════════════════════════════════════════════
  const runTests = async () => {
    if (isCompiling) return;

    const currentCode = codeRef.current.trim();
    const currentLang = langRef.current;
    const q = qRef.current[idxRef.current];
    
    // Choose test cases: lang-specific OR fallback to global
    const langKey = `test_cases_${currentLang}`;
    const tcCases = (q && q[langKey] && q[langKey].length > 0) 
      ? q[langKey] 
      : (q?.test_cases || []);

    if (!currentCode) {
      triggerWarning("⚠ Please write some code before running tests.");
      return;
    }

    setIsCompiling(true);
    setTestResults(null);
    setRunError(null);
    setOutput("");
    setActiveTab("tests");

    // ── Step 1: Compile probe with empty stdin to catch syntax errors ──────
    try {
      const probe = await compilerApi.run(currentCode, currentLang, "");
      const probeOut = (probe.output || "").trim();

      if (looksLikeCompileError(probeOut)) {
        setRunError(probeOut);
        setOutput(probeOut);
        setIsCompiling(false);
        return;
      }
    } catch (err) {
      setRunError(`Network error: ${err.message}`);
      setIsCompiling(false);
      return;
    }

    // ── Step 2: No test cases — run with custom or empty input ─────────────
    if (tcCases.length === 0) {
      try {
        const result = await compilerApi.run(currentCode, currentLang, customInput || "");
        setOutput(result.output || "(no output)");
        setActiveTab("console");
      } catch (err) {
        setOutput(`Error: ${err.message}`);
        setActiveTab("console");
      }
      setIsCompiling(false);
      return;
    }

    // ── Step 3: Run each test case piping its input as stdin ───────────────
    const results = [];
    let consolLog = "";

    for (let i = 0; i < tcCases.length; i++) {
      const tc = tcCases[i];
      const stdinInput = (tc.input ?? tc.stdin ?? tc.in ?? "").toString();
      const expectedRaw = (tc.expected_output ?? tc.expected ?? tc.output ?? "").toString();
      const expectedNorm = normalizeOutput(expectedRaw);

      try {
        const result = await compilerApi.run(currentCode, currentLang, stdinInput);
        const rawActual = result.output || "";
        const actualNorm = normalizeOutput(rawActual);
        const isRTError = looksLikeRuntimeError(rawActual);
        const passed = !isRTError && actualNorm === expectedNorm;

        results.push({
          input: stdinInput,
          expected: expectedNorm,
          rawActual: rawActual.trimEnd(),
          actual: actualNorm,
          passed,
          isError: isRTError && !passed,
        });

        consolLog += `─── Test ${i + 1} ───────────────────\n`;
        consolLog += `Input:\n${stdinInput || "(empty)"}\n\n`;
        consolLog += `Output:\n${rawActual || "(no output)"}\n`;
        consolLog += `Expected:\n${expectedRaw}\n`;
        consolLog += `Result: ${passed ? "✓ PASSED" : "✗ FAILED"}\n\n`;

      } catch (err) {
        const errMsg = `API Error: ${err.message}`;
        results.push({ input: stdinInput, expected: expectedNorm, rawActual: errMsg, actual: errMsg, passed: false, isError: true });
        consolLog += `─── Test ${i + 1} ─── ERROR\n${errMsg}\n\n`;
      }
    }

    setTestResults(results);
    setOutput(consolLog);
    setIsCompiling(false);
  };

  // ── RUN WITH CUSTOM INPUT ──────────────────────────────────────────────────
  const runCustom = async () => {
    if (isCompiling) return;
    const currentCode = codeRef.current.trim();
    if (!currentCode) { triggerWarning("⚠ Please write some code first."); return; }
    setIsCompiling(true);
    setActiveTab("console");
    setOutput("Running…");
    try {
      const result = await compilerApi.run(currentCode, langRef.current, customInputRef.current);
      setOutput(result.output || "(no output)");
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
    setIsCompiling(false);
  };

  // ── LANGUAGE CHANGE ────────────────────────────────────────────────────────
  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    const q = qRef.current[idxRef.current];
    const draft = localStorage.getItem(`r2_draft_q${idxRef.current}_${lang}`);
    const initC = draft || STARTER_TEMPLATES[lang](q);
    setInitialCode(initC);
    codeRef.current = initC;
    setTestResults(null);
    setRunError(null);
    setOutput("");
  };

  // ── LOADING GUARD ──────────────────────────────────────────────────────────
  if (!questions.length) {
    return (
      <div className="r2-loading-screen">
        <div className="r2-loading-inner">
          <div className="r2-loader-ring" />
          <p>Loading Round 2 questions…</p>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const tr = testResults || [];
  const passedCount = tr.filter((r) => r.passed).length;
  const allPassed = tr.length > 0 && passedCount === tr.length;
  const qProgress = ((currentIndex + 1) / questions.length) * 100;
  const totalPct = (totalTimer / ROUND2_TOTAL_SECONDS) * 100;
  const qTimePct = (questionTimer / QUESTION_TIME) * 100;

  return (
    <div className="r2-root">

      {/* FULLSCREEN OVERLAY */}
      {showFullscreenPrompt && (
        <div className="r2-overlay">
          <div className="r2-overlay-modal">
            <div className="r2-overlay-icon">⛶</div>
            <h2>Fullscreen Required</h2>
            <p>This exam must be taken in fullscreen. Click below to continue.</p>
            <button className="r2-overlay-btn" onClick={enterFullscreen}>Re-enter Fullscreen</button>
          </div>
        </div>
      )}

      {/* WARNING TOAST */}
      {showWarning && (
        <div className="r2-warning-toast">
          <span className="r2-warning-icon">⚠</span>
          <span>{warningMessage}</span>
          <div className="r2-warning-bar" />
        </div>
      )}

      {/* VIOLATION BADGE */}
      {tabSwitchCount > 0 && (
        <div className={`r2-violation-badge ${tabSwitchCount >= MAX_TAB_SWITCHES - 1 ? "critical" : "warn"}`}>
          ⚠ Violations: {tabSwitchCount}/{MAX_TAB_SWITCHES}
        </div>
      )}

      {/* NAVBAR */}
      <header className="r2-navbar">
        <div className="r2-navbar-left">
          <div className="r2-navbar-brand">
            <span className="r2-brand-icon">⚙</span>
            <span className="r2-brand-text">code 144p </span>
            <span className="r2-brand-round">ROUND 2</span>
          </div>
          <div className="r2-q-progress">
            <div className="r2-q-progress-track">
              <div className="r2-q-progress-fill" style={{ width: `${qProgress}%` }} />
            </div>
            <span className="r2-q-progress-label">{currentIndex + 1} / {questions.length}</span>
          </div>
        </div>

        <div className="r2-navbar-center">
          <div className="r2-timer-block">
            <span className="r2-timer-label">Total</span>
            <span className={`r2-timer-val ${totalTimer < 300 ? "danger" : totalTimer < 600 ? "warn" : ""}`}>
              {fmtTime(totalTimer)}
            </span>
            <div className="r2-timer-strip">
              <div className="r2-timer-strip-fill total-fill" style={{ width: `${totalPct}%` }} />
            </div>
          </div>
          <div className="r2-timer-divider" />
          <div className="r2-timer-block">
            <span className="r2-timer-label">This Question</span>
            <span className={`r2-timer-val ${questionTimer < 60 ? "danger" : questionTimer < 120 ? "warn" : ""}`}>
              {fmtTime(questionTimer)}
            </span>
            <div className="r2-timer-strip">
              <div className="r2-timer-strip-fill q-fill" style={{ width: `${qTimePct}%` }} />
            </div>
          </div>
        </div>

        <div className="r2-navbar-right">
          {allPassed && (
            <div className="r2-all-passed-chip"><span>✓</span> All Tests Pass</div>
          )}
          <button
            className="r2-skip-btn"
            onClick={() => handleNext(false)}
            disabled={submittingRef.current || currentIndex >= questions.length - 1}
          >
            Skip →
          </button>
          <button
            className={`r2-submit-btn ${allPassed ? "r2-submit-btn--pass" : ""}`}
            onClick={() => handleNext(false)}
            disabled={submittingRef.current}
          >
            {currentIndex === questions.length - 1 ? "🏁 Finish" : "Submit ➤"}
          </button>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="r2-workspace">

        {/* LEFT: Problem */}
        <aside className="r2-problem-pane">
          <div className="r2-problem-header">
            <div className="r2-problem-meta">
              <span className="r2-problem-num">Q{currentIndex + 1}</span>
              <span className={`r2-diff-chip diff-${(q.difficulty || "Medium").toLowerCase()}`}>
                {q.difficulty || "Medium"}
              </span>
              <span className="r2-pts-chip">{q.points || 20} pts</span>
            </div>
            <h2 className="r2-problem-title">{q.text}</h2>
          </div>
          <div className="r2-problem-body">
            {q.code_snippet && (
              <div className="r2-problem-section">
                <div className="r2-section-label"><span className="r2-section-dot dot-red" />Buggy Code to Fix</div>
                <pre className="r2-buggy-code">{q.code_snippet}</pre>
              </div>
            )}
            {q.examples && (
              <div className="r2-problem-section">
                <div className="r2-section-label"><span className="r2-section-dot dot-blue" />Examples</div>
                <pre className="r2-example-block">{q.examples}</pre>
              </div>
            )}
            {q.constraints && (
              <div className="r2-problem-section">
                <div className="r2-section-label"><span className="r2-section-dot dot-amber" />Constraints</div>
                <pre className="r2-constraints-block">{q.constraints}</pre>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT: Editor + Tests */}
        <div className="r2-editor-pane">

          {/* Toolbar */}
          <div className="r2-editor-toolbar">
            <div className="r2-lang-tabs">
              {[
                { id: "python", icon: "🐍", label: "Python" },
                { id: "java", icon: "☕", label: "Java" },
                { id: "c", icon: "⚙", label: "C" },
              ].map(({ id, icon, label }) => (
                <button
                  key={id}
                  className={`r2-lang-tab ${language === id ? "active" : ""}`}
                  onClick={() => handleLanguageChange(id)}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
            <div className="r2-toolbar-actions">
              <button
                className="r2-custom-input-toggle"
                onClick={() => setShowCustomInput((v) => !v)}
                title="Open a panel to enter custom stdin for the ▷ Run button"
              >
                {showCustomInput ? "▲ Hide Input" : "▼ Custom Input"}
              </button>
              <button className="r2-run-custom-btn" onClick={runCustom} disabled={isCompiling} title="Run code with your custom stdin input (no test comparison)">
                ▷ Run
              </button>
              <button className="r2-run-tests-btn" onClick={runTests} disabled={isCompiling} title="Run code against all test cases automatically">
                {isCompiling
                  ? <><span className="r2-spin">⟳</span> Running…</>
                  : <>▶ Run Tests ({(q[`test_cases_${language}`]?.length > 0 ? q[`test_cases_${language}`] : q.test_cases)?.length || 0})</>
                }
              </button>
            </div>
          </div>

          {/* Custom stdin panel */}
          {showCustomInput && (
            <div className="r2-custom-input-area">
              <div className="r2-custom-input-header">
                <span className="r2-custom-input-label">stdin for ▷ Run</span>
                {/* FIX: clear example so students don't type variable assignments */}
                <span className="r2-custom-input-hint">
                  Enter raw values only — e.g. if your program reads N then N numbers, type:
                </span>
              </div>
              <div className="r2-custom-input-example">
                <code>5</code>
                <code>3</code>
                <code>1</code>
                <code>4</code>
                <code>1</code>
                <code>5</code>
                <span className="r2-example-caption">← one value per line, no variable names</span>
              </div>
              <textarea
                className="r2-custom-input-field"
                defaultValue={customInputRef.current}
                onChange={(e) => { customInputRef.current = e.target.value; }}
                placeholder={"5\n3\n1\n4\n1\n5"}
                rows={4}
                spellCheck={false}
              />
            </div>
          )}

          {/* Code editor */}
          <CodeEditor 
            initialCode={initialCode} 
            onCodeChange={handleCodeChange} 
          />

          {/* Test results panel */}
          <TestCasePanel
            testResults={testResults}
            output={output}
            isCompiling={isCompiling}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            testCases={q[`test_cases_${language}`]?.length > 0 ? q[`test_cases_${language}`] : q.test_cases}
            runError={runError}
          />
        </div>
      </div>
    </div>
  );
}

export default Round2;