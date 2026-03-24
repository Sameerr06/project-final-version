import { questionsApi } from '../services/api';
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import "./AdminQuestions.css";

const EMPTY_R1 = {
  text: "",
  code_snippet: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "A",
  round_number: 1,
  points: 5,
};

const EMPTY_R2 = {
  text: "",
  code_snippet: "",
  difficulty: "Medium",
  examples: "",
  constraints: "",
  test_cases: "[]",
  round_number: 2,
  points: 20,
};

function AdminQuestions() {
  const navigate = useNavigate();
  const { show } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("r1"); // "r1" | "r2"
  const [r1Questions, setR1Questions] = useState([]);
  const [r2Questions, setR2Questions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showR1Form, setShowR1Form] = useState(false);
  const [showR2Form, setShowR2Form] = useState(false);
  const [r1Form, setR1Form] = useState(EMPTY_R1);
  const [r2Form, setR2Form] = useState(EMPTY_R2);

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) navigate("/admin/login");
  }, [navigate]);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchRound = async (round) => {
    try {
      const data = await questionsApi.listAdmin(round);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([fetchRound(1), fetchRound(2)]);
    setR1Questions(r1);
    setR2Questions(r2);
    setLoading(false);
  }, [show]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Form change handlers ───────────────────────────────────────────────────
  const handleR1Change = (e) => {
    const { name, value } = e.target;
    setR1Form(prev => ({ ...prev, [name]: name === "points" ? Number(value) : value }));
  };

  const handleR2Change = (e) => {
    const { name, value } = e.target;
    setR2Form(prev => ({ ...prev, [name]: name === "points" ? Number(value) : value }));
  };

  // ── Submit Round 1 ─────────────────────────────────────────────────────────
  const handleR1Submit = async (e) => {
    e.preventDefault();
    const required = ["text", "option_a", "option_b", "option_c", "option_d"];
    for (const f of required) {
      if (!r1Form[f].trim()) {
        show(`Field "${f}" is required.`, "error");
        return;
      }
    }
    try {
      await questionsApi.create({ ...r1Form, test_cases: [] });
      show("✅ Round 1 question added!", "success");
      setR1Form(EMPTY_R1);
      setShowR1Form(false);
      fetchAll();
    } catch (err) {
      show("Error: " + (err.message || JSON.stringify(err)), "error");
    }
  };

  // ── Submit Round 2 ─────────────────────────────────────────────────────────
  const handleR2Submit = async (e) => {
    e.preventDefault();
    const required = ["text", "examples", "constraints", "test_cases"];
    for (const f of required) {
      if (!r2Form[f].trim()) {
        show(`Field "${f}" is required.`, "error");
        return;
      }
    }
    let parsedTestCases;
    try {
      parsedTestCases = JSON.parse(r2Form.test_cases);
    } catch {
      show("Test cases must be a valid JSON array.", "error");
      return;
    }
    try {
      await questionsApi.create({ ...r2Form, test_cases: parsedTestCases });
      show("✅ Round 2 question added!", "success");
      setR2Form(EMPTY_R2);
      setShowR2Form(false);
      fetchAll();
    } catch (err) {
      show("Error: " + (err.message || JSON.stringify(err)), "error");
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await questionsApi.delete(deleteConfirm);
      show("🗑️ Question deleted.", "success");
      fetchAll();
    } catch (err) {
      show("Failed to delete question.", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderQuestionCard = (q, idx) => (
    <div key={q.id} className={`aq-question-card aq-question-card--r${q.round_number}`}>
      <div className="aq-question-header">
        <div className="aq-question-meta">
          <span className={`aq-round-badge aq-round-badge--r${q.round_number}`}>
            {q.round_number === 1 ? "Round 1 — MCQ" : "Round 2 — Debug"}
          </span>
          <span className="aq-points-badge">{q.points} pts</span>
          {q.round_number === 2 && (
            <span className={`aq-diff-badge aq-diff--${q.difficulty?.toLowerCase()}`}>
              {q.difficulty}
            </span>
          )}
          <span className="aq-id-badge">#{q.id}</span>
        </div>
        <button
          className="aq-delete-btn"
          onClick={() => setDeleteConfirm(q.id)}
          title="Delete question"
        >🗑️</button>
      </div>

      <p className="aq-question-text">
        <span className="aq-q-num">Q{idx + 1}.</span> {q.text}
      </p>

      {q.code_snippet && (
        <pre className="aq-code-snippet">{q.code_snippet}</pre>
      )}

      {/* Round 1: show options */}
      {q.round_number === 1 && (
        <div className="aq-options-display">
          {["A", "B", "C", "D"].map((opt) => {
            const txt = q[`option_${opt.toLowerCase()}`];
            if (!txt) return null;
            const isCorrect = q.correct_option?.toUpperCase() === opt;
            return (
              <div key={opt} className={`aq-opt ${isCorrect ? "aq-opt--correct" : ""}`}>
                <span className="aq-opt-label">{opt}</span>
                <span className="aq-opt-text">{txt}</span>
                {isCorrect && <span className="aq-opt-check">✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Round 2: show examples + constraints */}
      {q.round_number === 2 && (
        <div className="aq-r2-details">
          {q.examples && (
            <div className="aq-r2-block">
              <span className="aq-r2-label">Examples</span>
              <pre className="aq-r2-pre">{q.examples}</pre>
            </div>
          )}
          {q.constraints && (
            <div className="aq-r2-block">
              <span className="aq-r2-label">Constraints</span>
              <pre className="aq-r2-pre aq-r2-pre--constraint">{q.constraints}</pre>
            </div>
          )}
          {q.test_cases?.length > 0 && (
            <div className="aq-r2-block">
              <span className="aq-r2-label">Test Cases ({q.test_cases.length})</span>
              <div className="aq-tc-list">
                {q.test_cases.map((tc, i) => (
                  <div key={i} className="aq-tc-row">
                    <span className="aq-tc-num">#{i + 1}</span>
                    <span className="aq-tc-field">in: <code>{tc.input}</code></span>
                    <span className="aq-tc-field">out: <code>{tc.expected_output}</code></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="aq-root">

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="aq-modal-overlay">
          <div className="aq-modal">
            <div className="aq-modal-icon">🗑️</div>
            <h3>Delete Question?</h3>
            <p>This action cannot be undone.</p>
            <div className="aq-modal-actions">
              <button className="aq-btn aq-btn--ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="aq-btn aq-btn--danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="aq-header">
        <div className="aq-header-left">
          <button className="aq-back-btn" onClick={() => navigate(-1)}>← Back</button>
          <div>
            <h1 className="aq-header-title">Question Manager</h1>
            <p className="aq-header-sub">code144p '26 — Admin Panel</p>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="aq-stats">
        <div className="aq-stat aq-stat--blue">
          <span className="aq-stat-num">{r1Questions.length + r2Questions.length}</span>
          <span className="aq-stat-label">Total Questions</span>
        </div>
        <div className="aq-stat aq-stat--purple">
          <span className="aq-stat-num">{r1Questions.length}</span>
          <span className="aq-stat-label">Round 1 (MCQ)</span>
        </div>
        <div className="aq-stat aq-stat--orange">
          <span className="aq-stat-num">{r2Questions.length}</span>
          <span className="aq-stat-label">Round 2 (Debug)</span>
        </div>
      </div>

      {/* ── ROUND TABS ─────────────────────────────────────────────────────── */}
      <div className="aq-round-tabs">
        <button
          className={`aq-round-tab ${activeTab === "r1" ? "aq-round-tab--active-r1" : ""}`}
          onClick={() => setActiveTab("r1")}
        >
          <span className="aq-round-tab-icon">📝</span>
          Round 1 — MCQ
          <span className="aq-round-tab-count">{r1Questions.length}</span>
        </button>
        <button
          className={`aq-round-tab ${activeTab === "r2" ? "aq-round-tab--active-r2" : ""}`}
          onClick={() => setActiveTab("r2")}
        >
          <span className="aq-round-tab-icon">🐛</span>
          Round 2 — Code Debugging
          <span className="aq-round-tab-count">{r2Questions.length}</span>
        </button>
      </div>

      {/* ── ROUND 1 PANEL ──────────────────────────────────────────────────── */}
      {activeTab === "r1" && (
        <div className="aq-panel">

          {/* Add R1 button + form */}
          <div className="aq-panel-toolbar">
            <h2 className="aq-panel-title">Round 1 — Multiple Choice Questions</h2>
            <button
              className="aq-btn aq-btn--primary"
              onClick={() => { setShowR1Form(v => !v); setR1Form(EMPTY_R1); }}
            >
              {showR1Form ? "✕ Close" : "+ Add MCQ Question"}
            </button>
          </div>

          {showR1Form && (
            <div className="aq-form-card aq-form-card--r1">
              <h3 className="aq-form-title">➕ New Round 1 — MCQ Question</h3>
              <form onSubmit={handleR1Submit} className="aq-form">

                {/* Points + Correct Option */}
                <div className="aq-form-row aq-form-row--2">
                  <div className="aq-field">
                    <label>Points</label>
                    <input type="number" name="points" min={1} max={100}
                      value={r1Form.points} onChange={handleR1Change} />
                  </div>
                  <div className="aq-field">
                    <label>Correct Option <span className="aq-required">*</span></label>
                    <select name="correct_option" value={r1Form.correct_option} onChange={handleR1Change}>
                      {["A","B","C","D"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                {/* Question text */}
                <div className="aq-field aq-field--full">
                  <label>Question Text <span className="aq-required">*</span></label>
                  <textarea name="text" rows={3} value={r1Form.text}
                    onChange={handleR1Change} placeholder="Enter the question..." />
                </div>

                {/* Code snippet */}
                <div className="aq-field aq-field--full">
                  <label>Code Snippet <span className="aq-optional">(optional)</span></label>
                  <textarea name="code_snippet" rows={4} value={r1Form.code_snippet}
                    onChange={handleR1Change} className="aq-code-input"
                    placeholder="# Paste code here if the question refers to a code block..." />
                </div>

                {/* 4 options */}
                <div className="aq-options-grid">
                  {["a","b","c","d"].map(opt => (
                    <div key={opt}
                      className={`aq-field aq-option-field ${r1Form.correct_option === opt.toUpperCase() ? "aq-option-field--correct" : ""}`}>
                      <label>
                        Option {opt.toUpperCase()}
                        {r1Form.correct_option === opt.toUpperCase() && (
                          <span className="aq-correct-badge">✓ Correct</span>
                        )}
                      </label>
                      <input type="text" name={`option_${opt}`}
                        value={r1Form[`option_${opt}`]} onChange={handleR1Change}
                        placeholder={`Option ${opt.toUpperCase()}...`} />
                    </div>
                  ))}
                </div>

                <div className="aq-form-actions">
                  <button type="button" className="aq-btn aq-btn--ghost"
                    onClick={() => { setR1Form(EMPTY_R1); setShowR1Form(false); }}>
                    Cancel
                  </button>
                  <button type="submit" className="aq-btn aq-btn--primary">
                    💾 Save MCQ Question
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* R1 question list */}
          {loading ? (
            <div className="aq-loading"><div className="aq-spinner" /><p>Loading...</p></div>
          ) : r1Questions.length === 0 ? (
            <div className="aq-empty">
              <div className="aq-empty-icon">📭</div>
              <p>No Round 1 questions yet. Click "+ Add MCQ Question" to get started.</p>
            </div>
          ) : (
            <div className="aq-questions-list">
              {r1Questions.map((q, i) => renderQuestionCard(q, i))}
            </div>
          )}
        </div>
      )}

      {/* ── ROUND 2 PANEL ──────────────────────────────────────────────────── */}
      {activeTab === "r2" && (
        <div className="aq-panel">

          {/* Add R2 button + form */}
          <div className="aq-panel-toolbar">
            <h2 className="aq-panel-title">Round 2 — Code Debugging Questions</h2>
            <button
              className="aq-btn aq-btn--primary-r2"
              onClick={() => { setShowR2Form(v => !v); setR2Form(EMPTY_R2); }}
            >
              {showR2Form ? "✕ Close" : "+ Add Debugging Question"}
            </button>
          </div>

          {showR2Form && (
            <div className="aq-form-card aq-form-card--r2">
              <h3 className="aq-form-title">➕ New Round 2 — Code Debugging Question</h3>
              <form onSubmit={handleR2Submit} className="aq-form">

                {/* Points + Difficulty */}
                <div className="aq-form-row aq-form-row--2">
                  <div className="aq-field">
                    <label>Points</label>
                    <input type="number" name="points" min={1} max={100}
                      value={r2Form.points} onChange={handleR2Change} />
                  </div>
                  <div className="aq-field">
                    <label>Difficulty</label>
                    <select name="difficulty" value={r2Form.difficulty} onChange={handleR2Change}>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Question / Problem statement */}
                <div className="aq-field aq-field--full">
                  <label>Problem Statement <span className="aq-required">*</span></label>
                  <textarea name="text" rows={3} value={r2Form.text}
                    onChange={handleR2Change}
                    placeholder="Describe the problem. E.g. 'This function should return the sum but has a bug. Find and fix it.'" />
                </div>

                {/* Buggy code starter */}
                <div className="aq-field aq-field--full">
                  <label>Buggy / Starter Code <span className="aq-optional">(optional)</span></label>
                  <textarea name="code_snippet" rows={8} value={r2Form.code_snippet}
                    onChange={handleR2Change} className="aq-code-input"
                    placeholder={"def sum_list(nums):\n    result = 0\n    for n in nums:\n        result -= n   # bug: should be +=\n    return result"} />
                </div>

                {/* Examples */}
                <div className="aq-field aq-field--full">
                  <label>Examples <span className="aq-required">*</span></label>
                  <textarea name="examples" rows={4} value={r2Form.examples}
                    onChange={handleR2Change}
                    placeholder={"Input: [1, 2, 3]\nOutput: 6\n\nInput: [10, -2]\nOutput: 8"} />
                </div>

                {/* Constraints */}
                <div className="aq-field aq-field--full">
                  <label>Constraints <span className="aq-required">*</span></label>
                  <textarea name="constraints" rows={2} value={r2Form.constraints}
                    onChange={handleR2Change}
                    placeholder="1 <= len(nums) <= 1000  |  -10^4 <= nums[i] <= 10^4" />
                </div>

                {/* Test cases */}
                <div className="aq-field aq-field--full">
                  <label>
                    Test Cases (JSON array) <span className="aq-required">*</span>
                    <span className="aq-optional"> — format: [{`{"input":"...","expected_output":"..."}`}]</span>
                  </label>
                  <textarea name="test_cases" rows={6} value={r2Form.test_cases}
                    onChange={handleR2Change} className="aq-code-input"
                    placeholder={'[\n  {"input": "1 2 3", "expected_output": "6"},\n  {"input": "10 -2", "expected_output": "8"}\n]'} />
                </div>

                <div className="aq-form-actions">
                  <button type="button" className="aq-btn aq-btn--ghost"
                    onClick={() => { setR2Form(EMPTY_R2); setShowR2Form(false); }}>
                    Cancel
                  </button>
                  <button type="submit" className="aq-btn aq-btn--primary-r2">
                    💾 Save Debugging Question
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* R2 question list */}
          {loading ? (
            <div className="aq-loading"><div className="aq-spinner" /><p>Loading...</p></div>
          ) : r2Questions.length === 0 ? (
            <div className="aq-empty">
              <div className="aq-empty-icon">📭</div>
              <p>No Round 2 questions yet. Click "+ Add Debugging Question" to get started.</p>
            </div>
          ) : (
            <div className="aq-questions-list">
              {r2Questions.map((q, i) => renderQuestionCard(q, i))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default AdminQuestions;