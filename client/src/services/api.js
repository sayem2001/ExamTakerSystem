// API service layer with authentication and error handling
const BASE_URL = import.meta.env.VITE_API_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('apex_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth
  async login(email, password) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  },

  async requestAdminOtp(name, email) {
    const res = await fetch(`${BASE_URL}/api/auth/request-admin-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to request admin authorization OTP');
    return data;
  },

  async register(name, email, password, role = 'student', institution = '', adminOtp = '') {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, institution, adminOtp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    return data;
  },

  async firebaseAuth({ idToken, email, name, role = 'student', institution = '', adminOtp = '', avatar = '', isEmailVerified = false }) {
    const res = await fetch(`${BASE_URL}/api/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, email, name, role, institution, adminOtp, avatar, isEmailVerified }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Firebase authentication failed');
    return data;
  },

  async getMe() {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch user');
    return data;
  },

  // Student Gemini API Key Management
  async getStudentGeminiKeyStatus() {
    const res = await fetch(`${BASE_URL}/api/auth/gemini-key`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch Gemini API key status');
    return data;
  },

  async saveStudentGeminiKey(geminiApiKey) {
    const res = await fetch(`${BASE_URL}/api/auth/gemini-key`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ geminiApiKey }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save Gemini API key');
    return data;
  },

  async testStudentGeminiKey(geminiApiKey = '') {
    const res = await fetch(`${BASE_URL}/api/auth/gemini-key/test`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ geminiApiKey }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to test Gemini API key');
    return data;
  },

  // Exams
  async getExams(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`${BASE_URL}/api/exams?${query}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch exams');
    return data;
  },

  async getExam(identifier) {
    const res = await fetch(`${BASE_URL}/api/exams/${identifier}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch exam');
    return data;
  },

  async createExam(examData) {
    const res = await fetch(`${BASE_URL}/api/exams`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(examData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create exam');
    return data;
  },

  async updateExam(id, examData) {
    const res = await fetch(`${BASE_URL}/api/exams/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(examData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update exam');
    return data;
  },

  async deleteExam(id) {
    const res = await fetch(`${BASE_URL}/api/exams/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete exam');
    return data;
  },

  async getMyPracticeExams() {
    const res = await fetch(`${BASE_URL}/api/exams/my-practice`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch personal practice exams');
    return data;
  },

  async deletePracticeExam(id) {
    const res = await fetch(`${BASE_URL}/api/exams/my-practice/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete practice exam');
    return data;
  },

  // Attempts
  async startAttempt(examId) {
    const res = await fetch(`${BASE_URL}/api/attempts/start/${examId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to start exam');
    return data;
  },

  async syncAnswers(attemptId, answers, timeSpentSeconds) {
    const res = await fetch(`${BASE_URL}/api/attempts/${attemptId}/sync`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ answers, timeSpentSeconds }),
    });
    return await res.json();
  },

  async logViolation(attemptId, type, details) {
    const res = await fetch(`${BASE_URL}/api/attempts/${attemptId}/violation`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ type, details }),
    });
    return await res.json();
  },

  async submitAttempt(attemptId, payload) {
    const res = await fetch(`${BASE_URL}/api/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to submit exam');
    return data;
  },

  async getAttemptResults(attemptId) {
    const res = await fetch(`${BASE_URL}/api/attempts/${attemptId}/results`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch results');
    return data;
  },

  async getMyPerformance() {
    const res = await fetch(`${BASE_URL}/api/attempts/my-performance`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch performance analytics');
    return data;
  },

  // Leaderboard
  async getExamLeaderboard(examId) {
    const res = await fetch(`${BASE_URL}/api/leaderboard/exam/${examId}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch leaderboard');
    return data;
  },

  async getGlobalLeaderboard() {
    const res = await fetch(`${BASE_URL}/api/leaderboard/global`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch global leaderboard');
    return data;
  },

  // Student AI Practice Generator
  async studentGeneratePractice(formDataOrPayload) {
    const token = localStorage.getItem('apex_token');
    const isFormData = formDataOrPayload instanceof FormData;
    const res = await fetch(`${BASE_URL}/api/ai/student-generate-practice`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      },
      body: isFormData ? formDataOrPayload : JSON.stringify(formDataOrPayload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'AI practice generation failed');
    return data;
  },

  async studentSavePractice(payload) {
    const res = await fetch(`${BASE_URL}/api/ai/student-save-practice`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save practice exam');
    return data;
  },

  // AI & PDF (Admin)
  async extractQuestionsFromDoc(formData) {
    const token = localStorage.getItem('apex_token');
    const res = await fetch(`${BASE_URL}/api/ai/extract-questions`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Question extraction failed');
    return data;
  },

  async generateFromExtractedQuestions(payload) {
    const res = await fetch(`${BASE_URL}/api/ai/generate-from-extracted`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Question generation failed');
    return data;
  },

  async uploadAndProcessPdf(formData) {
    const token = localStorage.getItem('apex_token');
    const res = await fetch(`${BASE_URL}/api/ai/process-pdf`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'AI processing failed');
    return data;
  },

  async autoCreateThreeExams(payload) {
    const res = await fetch(`${BASE_URL}/api/ai/auto-create-three-exams`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to auto-create exams');
    return data;
  },

  async scheduleGeneratedExam(payload) {
    const res = await fetch(`${BASE_URL}/api/ai/schedule-generated-exam`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to schedule exam');
    return data;
  },

  async getVerifiedQuestions() {
    const res = await fetch(`${BASE_URL}/api/ai/verified-questions`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch verified questions');
    return data;
  },

  async deployVerifiedExam(payload = {}) {
    const res = await fetch(`${BASE_URL}/api/ai/deploy-verified-exam`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to deploy verified exam');
    return data;
  },

  // Admin
  async getAdminStats() {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch admin stats');
    return data;
  },

  async getQuestions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/api/admin/questions?${query}`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async createQuestion(questionData) {
    const res = await fetch(`${BASE_URL}/api/admin/questions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(questionData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create question');
    return data;
  },

  async deleteQuestion(id) {
    const res = await fetch(`${BASE_URL}/api/admin/questions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async getSubmissions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/api/admin/submissions?${query}`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async getSettings() {
    const res = await fetch(`${BASE_URL}/api/admin/settings`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  async updateSettings(settings) {
    const res = await fetch(`${BASE_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return await res.json();
  },
};
