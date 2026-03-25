import axios from 'axios';

const API_BASE_URL = (() => {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (!raw) return '';
  return raw.startsWith('http') ? raw : `https://${raw}`;
})();

export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

const api = axios.create({
  baseURL: API_BASE_URL || '/',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers['Authorization'] = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    const message =
      error.response?.data?.error ||
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    const normalizedError = new Error(message);
    normalizedError.response = error.response;
    return Promise.reject(normalizedError);
  }
);

export const studentApi = {
  register: (data) => api.post('/api/create-student/', data).then((r) => r.data),
};

export const questionsApi = {
  listStudent: (round) =>
    api.get(`/api/questions/?round=${round}`).then((r) => r.data),
  listAdmin: (round) =>
    api.get(`/api/admin/questions/?round=${round}`).then((r) => r.data),
  create: (data) =>
    api.post('/api/admin/questions/create/', data).then((r) => r.data),
  delete: (id) =>
    api.delete(`/api/admin/questions/delete/${id}/`).then((r) => r.data),
};

export const quizApi = {
  submitAnswer: (data) =>
    api.post('/api/submit-answer/', data).then((r) => r.data),
  completeRound1: (sid, token) =>
    api.post('/api/complete-round1/', { student_id: sid, token }).then((r) => r.data),
  startRound2: (sid, token) =>
    api.post('/api/start-round2/', { student_id: sid, token }).then((r) => r.data),
  completeRound2: (sid, token) =>
    api.post('/api/complete-round2/', { student_id: sid, token }).then((r) => r.data),
};

export const compilerApi = {
  run: (code, lang, input) =>
    api.post('/api/compile/', { code, language: lang, input }).then((r) => r.data),
  runTests: (qId, code, lang) =>
    api.post('/api/run-tests/', { question_id: qId, code, language: lang }).then((r) => r.data),
};

export const leaderboardApi = {
  get: (round) =>
    api.get(`/api/leaderboard/${round ? `?round=${round}` : ''}`).then((r) => r.data),
};

export const authApi = {
  login: (username, password) =>
    api.post('/api/login/', { username, password }).then((r) => r.data),
};

export default api;
