"use client";
import React from "react";
import { useNavigate } from "react-router-dom";
import Galaxy from "./Galaxy";
import "./Instructions.css";

function Instructions() {
  const navigate = useNavigate();
  const studentData = JSON.parse(localStorage.getItem('studentEntry'));

  const handleStart = () => {
    navigate('/round1-instructions');
  };

  return (
    <main className="container">
      {/* Galaxy Background */}
      <div className="instructions-galaxy-bg">
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

      <div className="contentWrapper">
        <h1 className="title">code 144p 2K25</h1>

        {/* ── Participant Info ── */}
        <section className="formContainer">
          <h2 className="formTitle">Participant Information</h2>
          <form className="formFields">
            <div className="formGroup">
              <label className="formLabel">NAME:</label>
              <input className="formInput" value={studentData?.name || ''} readOnly />
            </div>
            <div className="formGroup">
              <label className="formLabel">COLLEGE:</label>
              <input className="formInput" value={studentData?.college || ''} readOnly />
            </div>
            <div className="formGroup">
              <label className="formLabel">YEAR:</label>
              <input className="formInput" value={studentData?.year || ''} readOnly />
            </div>
            <div className="formGroup">
              <label className="formLabel">EMAIL:</label>
              <input className="formInput" value={studentData?.email || ''} readOnly />
            </div>
            <div className="formGroup">
              <label className="formLabel">DEPARTMENT:</label>
              <input className="formInput" value={studentData?.department || ''} readOnly />
            </div>
          </form>
        </section>

        {/* ── Rules ── */}
        <header className="instructionsHeader">
          <h2 className="instructionsTitle">Instructions</h2>
          <span className="instructionsTime">Read carefully</span>
        </header>

        <section className="instructionsList">
          <p className="instructionItem">1. You compete as an individual — teams are not permitted under any circumstances.</p>
          <p className="instructionItem">2. Round 1 has a strict <strong>2-minute timer per question</strong>. When it expires the quiz automatically moves to the next question with no recovery.</p>
          <p className="instructionItem">3. Round 2 has a <strong>5-minute timer per question</strong> and a <strong>25-minute total session timer</strong>. Whichever expires first ends that question.</p>
          <p className="instructionItem">4. Questions and answer options are <strong>randomised independently</strong> for every participant — sharing answers with others is ineffective and a violation.</p>
          <p className="instructionItem">5. Each correct answer in Round 1 earns <strong>5 points</strong> (max 75). Each correct answer in Round 2 earns <strong>25 points</strong> (max 125). There is no negative marking.</p>
          <p className="instructionItem">6. You must score at least <strong>38 out of 75 (50%)</strong> in Round 1 to qualify for Round 2. Once Round 1 is submitted it cannot be retaken.</p>
          <p className="instructionItem">7. If you qualified but did not attempt Round 2, your Round 2 score is treated as 0 in the final ranking.</p>
          <p className="instructionItem">8. Results are emailed automatically to your registered address upon completing Round 2.</p>
          <p className="instructionItem" style={{ color: "#ff4d6a", fontWeight: "600" }}>9. 🔒 The exam runs in <strong>FULLSCREEN mode</strong>. Exiting fullscreen pauses your exam until you click Re-enter Fullscreen.</p>
          <p className="instructionItem" style={{ color: "#ff4d6a", fontWeight: "600" }}>10. 🔒 <strong>Tab / window switching is monitored</strong>. Each switch triggers a warning. After <strong>3 violations your exam is auto-submitted immediately</strong> with no recovery.</p>
          <p className="instructionItem" style={{ color: "#ff4d6a", fontWeight: "600" }}>11. 🔒 <strong>Copy, paste, and right-click are disabled</strong> on all question and answer areas. Ctrl+C, Ctrl+V, and Ctrl+X are blocked throughout the exam.</p>
          <p className="instructionItem" style={{ color: "#ff4d6a", fontWeight: "600" }}>12. 🔒 <strong>Keyboard shortcuts are blocked</strong> — Ctrl+A, Ctrl+S, Ctrl+P, and Print Screen are all disabled during the exam.</p>
          <p className="instructionItem" style={{ color: "#ff4d6a", fontWeight: "600" }}>13. 🔒 Organisers reserve the right to <strong>disqualify</strong> any participant found using external assistance or breaching exam integrity.</p>
        </section>

        <button onClick={handleStart} className="startButton">
          Continue to Round 1
        </button>
      </div>
    </main>
  );
}

export default Instructions;