import React, { useState } from "react";
import "./Header.css";

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="headerContent">
        <div className="brandIcons">
          <span className="brandIcon">⚡</span>
          <span className="brandName">Los<span>Reyas</span></span>
        </div>

        <nav className={`navigation ${menuOpen ? "open" : ""}`}>
          <a href="#home" className="navLink" onClick={() => setMenuOpen(false)}>Home</a>
          <a className="navLink" href="#contact" onClick={(e) => {
            e.preventDefault();
            setMenuOpen(false);
            document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            Contact
          </a>
          <a className="navLink" href="https://www.jct.ac.in/" target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>
            College
          </a>
          <div className="navBadge">AI Powered</div>
        </nav>

        <button
          className="mobileMenuButton"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 6l16 0" /><path d="M4 12l16 0" /><path d="M4 18l16 0" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}

export default Header;
