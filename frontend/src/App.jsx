import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Instructions from './pages/Instructions'
import Quiz from './pages/Quiz'
import Round1Instructions from './pages/Round1Instructions'
import Round1Results from './pages/Round1Results'
import Round2Instructions from './pages/Round2Instructions'
import Round2 from './pages/Round2'
import ThankYou from './pages/ThankYou'
import StudentEntry from './pages/StudentEntry'
import AdminQuestions from './pages/AdminQuestions'
import AdminLogin from './pages/AdminLogin'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'

const RequireStudent = ({ children }) => {
  if (!localStorage.getItem('studentId')) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const RequireAdmin = ({ children }) => {
  if (!localStorage.getItem('adminToken')) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Routes>
          <Route path="/"                    element={<Welcome />} />
          <Route path="/student-entry"       element={<StudentEntry />} />
          <Route path="/instructions"        element={<RequireStudent><Instructions /></RequireStudent>} />
          <Route path="/round1-instructions" element={<Round1Instructions />} />
          <Route path="/quiz"                element={<RequireStudent><Quiz /></RequireStudent>} />
          <Route path="/round1-results"      element={<RequireStudent><Round1Results /></RequireStudent>} />
          <Route path="/round2-instructions" element={<RequireStudent><Round2Instructions /></RequireStudent>} />
          <Route path="/round2"              element={<RequireStudent><Round2 /></RequireStudent>} />
          <Route path="/thank-you"           element={<ThankYou />} />
          <Route path="/admin/questions"     element={<RequireAdmin><AdminQuestions /></RequireAdmin>} />
          <Route path="/admin/login"         element={<AdminLogin />} />
          <Route path="*"                    element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
