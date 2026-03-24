import React from "react";
import "./HeroSection.css";
import { Link } from "react-router-dom";
import BlurText from "./BlurText"; // ← Step 1: import BlurText

function HeroSection() {
  return (
    <section className="heroSection">
      <div className="heroContent">

        {/* ← Step 2: Replace <h1> with BlurText */}
        <BlurText
          text="Welcome"
          delay={180}
          animateBy="letters"
          direction="top"
          stepDuration={0.4}
          className="welcomeTitle"
        />

        <p className="welcomeText">
          Dive into the world of knowledge with our exciting quiz. Engage your
          brain with our test, your skills and learn something new everyday!
        </p>
        <Link to="/student-entry">
          <button className="startbutton">Start Quiz</button>
        </Link>
      </div>
    </section>
  );
}

export default HeroSection;
