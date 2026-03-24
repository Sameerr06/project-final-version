import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Galaxy from './Galaxy'
import { studentApi } from '../services/api'
import './StudentEntry.css'

export default function StudentEntry() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    college: '',
    year: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.department || !formData.college || !formData.year) {
      setError('Please fill in all fields before submitting.');
      return;
    }

    setLoading(true);
    try {
      const data = await studentApi.register({
        name: formData.name,
        email: formData.email,
        department: formData.department,
        college: formData.college,
        year: formData.year,
      });

      localStorage.setItem('studentId', data.id);
      localStorage.setItem('studentToken', data.token);
      localStorage.setItem('studentEntry', JSON.stringify(formData));
      navigate('/instructions');
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Registration failed. Please try again.';
      if (message.includes('UNIQUE constraint')) {
        setError('This email is already registered. Please use a different email.');
      } else if (message.includes('Network Error')) {
        setError('Unable to connect to the server. Please make sure the backend is running.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-entry-container">
      {/* Galaxy Background */}
      <div className="entry-galaxy-bg">
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

      <div className="entry-layout">
        <div className="unified-card">
          <div className="glass-card">
            <div className="card-header">
              <h1>CODEVERSE</h1>
              <p>Enter your details to Sign up</p>
            </div>

            <form onSubmit={handleSubmit} className="form-container">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  FULL NAME
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="department" className="form-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5v-5l-10 5-10-5v5z" />
                  </svg>
                  DEPARTMENT
                </label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  placeholder="Enter your department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="college" className="form-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5v-5l-10 5-10-5v5z" />
                  </svg>
                  COLLEGE
                </label>
                <input
                  type="text"
                  id="college"
                  name="college"
                  placeholder="Enter your college name"
                  value={formData.college}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="year" className="form-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                  YEAR OF STUDY
                </label>
                <select id="year" name="year" value={formData.year} onChange={handleChange} required>
                  <option value="" disabled>Select your year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={loading}>
                <span>{loading ? 'Registering...' : 'Start Quiz'}</span>
                {!loading && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
