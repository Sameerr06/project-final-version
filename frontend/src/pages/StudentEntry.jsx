import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentApi } from '../services/api';
import './StudentEntry.css';

export default function StudentEntry() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    college: '',
    year: '',
  });
  
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name is required (min 2 characters)';
    }
    const normalizedEmail = formData.email.trim().toLowerCase();
    if (!normalizedEmail || !validateEmail(normalizedEmail)) {
      newErrors.email = 'Valid email is required';
    }
    if (!formData.college || !formData.college.trim()) {
      newErrors.college = 'College is required';
    }
    if (!formData.year) {
      newErrors.year = 'Year is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      const dataToSubmit = {
        ...formData,
        email: normalizedEmail
      };
      
      const data = await studentApi.register(dataToSubmit);
      
      localStorage.setItem('studentId', data.id);
      localStorage.setItem('studentToken', data.token);
      localStorage.setItem('studentEntry', JSON.stringify(dataToSubmit));
      
      navigate('/instructions');
    } catch (err) {
      setApiError(err.message || 'Network error — please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="student-entry-wrapper">
      <div className="left-panel">
        <div className="badge">College Event</div>
        <h1>Codeverse Quiz</h1>
        <ul className="feature-list">
          <li>Interactive multiple choice questions</li>
          <li>Live code debugging playground</li>
          <li>Real-time progress tracking</li>
          <li>Global leaderboard ranking</li>
        </ul>
      </div>

      <div className="right-panel">
        <div className="form-content">
          <h2>Student Registration</h2>
          <form onSubmit={handleSubmit} noValidate>
            
            <div className="field-group">
              <label>Name <span className="req">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'input-error' : ''}
                placeholder="Enter your full name"
              />
              {errors.name && <span className="field-error-msg">{errors.name}</span>}
            </div>

            <div className="field-group">
              <label>Email <span className="req">*</span></label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'input-error' : ''}
                placeholder="Enter your email address"
              />
              {errors.email && <span className="field-error-msg">{errors.email}</span>}
            </div>

            <div className="field-group">
              <label>Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Enter your department"
              />
            </div>

            <div className="field-group">
              <label>College <span className="req">*</span></label>
              <input
                type="text"
                name="college"
                value={formData.college}
                onChange={handleChange}
                className={errors.college ? 'input-error' : ''}
                placeholder="Enter your college name"
              />
              {errors.college && <span className="field-error-msg">{errors.college}</span>}
            </div>

            <div className="field-group">
              <label>Year <span className="req">*</span></label>
              <select 
                name="year" 
                value={formData.year} 
                onChange={handleChange}
                className={errors.year ? 'input-error' : ''}
              >
                <option value="">Select Year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
              {errors.year && <span className="field-error-msg">{errors.year}</span>}
            </div>

            {apiError && (
              <div className="api-error-box">
                {apiError}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="submit-btn">
              {isLoading ? (
                <>
                  <span className="spinner"></span> Registering...
                </>
              ) : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
