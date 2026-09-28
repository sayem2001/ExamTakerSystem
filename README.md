# ApexExam — Enterprise AI-Powered Mathematical Exam Platform

ApexExam is a modern, full-stack, proctored examination and assessment engine tailored for higher mathematics and STEM topics. It features automated **Google Gemini AI PDF question synthesis**, mathematical **LaTeX formula rendering**, multi-tier difficulty categorization (**Easy, Medium, Hard**), secure **anti-cheat proctoring**, strict **single-attempt enforcement**, and a real-time **competitive leaderboard**.

---

## 🌟 Key Features

### 1. 🤖 Gemini AI PDF Synthesis (100–200 MCQs)
- **Automated Ingestion**: Upload examination PDF documents containing 100 to 200 questions.
- **LaTeX Math Extraction**: Automatically extracts complex mathematical notation (integrals, matrices, limits, derivatives).
- **Auto-Stratified Exams**: Automatically classifies questions by conceptual depth into **three difficulty levels (Easy, Medium, Hard)** and generates 3 distinct exams with custom codes, schedules, and duration with a single click.

### 2. 🛡️ Advanced Anti-Cheat & Secure Proctoring
- **Full-Screen Enforcement**: The exam operates in locked full-screen mode. Exiting prompts a high-priority warning modal.
- **Tab-Switch & Window Blur Detection**: Active strike-counting system (default: 3 strikes). Exceeding the threshold automatically submits the exam with disqualification logging.
- **Clipboard & Devtools Lock**: Copy, paste, right-click, `F12`, and inspection shortcuts are intercepted and blocked.
- **On-Screen Virtual Scratchpad**: Interactive text scratchpad and drawing canvas for rough math derivations without leaving the secure exam tab.

### 3. 🎯 Strict Single-Attempt Policy
- Once a student starts and submits an assessment (or upon timer expiration), the attempt is permanently finalized.
- Subsequent access to the exam link gracefully redirects the candidate to their **Score Review & Solutions** and the **Live Leaderboard**.

### 4. 🏆 Dynamic Competitive Leaderboard
- Real-time ranking calculated by:
  1. Score (descending)
  2. Completion speed / time consumed (ascending tiebreaker)
  3. Accuracy percentage
- Top 3 **Podium Cards** (Gold, Silver, Bronze badges).
- Visual achievement badges: *Champion*, *Speed Demon*, *Sniper (95%+)*.
- 1-click **Export to CSV** for university and faculty records.

### 5. 📊 Comprehensive Solution Review
- Step-by-step mathematical proofs and derivations rendered cleanly using **KaTeX**.
- Clear side-by-side comparison between candidate selection and the correct answer.

---

## 🏗️ System Architecture

```
ExamTakerSystem/
├── server/                     # Backend Node.js / Express API
│   ├── config/db.js            # MongoDB Atlas connection & auto-reconnect
│   ├── controllers/            # Auth, Exams, Attempts, AI, Leaderboard, Admin
│   ├── middleware/             # JWT Auth, Admin Guards, Multer PDF Upload
│   ├── models/                 # User, Exam, Question, ExamAttempt, SystemSetting
│   ├── routes/                 # Express REST endpoints
│   ├── services/geminiService.js # Gemini AI PDF extraction & math bank
│   ├── services/seedService.js # Database seeder with sample exams & questions
│   ├── server.js               # Entry point (serves client/dist in production)
│   └── package.json
│
├── client/                     # Frontend React / Vite Application
│   ├── src/
│   │   ├── components/         # Navbar, MathRenderer, QuestionPalette, AntiCheatGuard, Timer
│   │   ├── context/            # AuthContext (JWT & state management)
│   │   ├── pages/              # Home, Login, Register, Dashboard, ExamLobby, Workspace, Results
│   │   ├── pages/admin/        # AdminDashboard, AdminExams, AdminAiPdfImport, QuestionBank
│   │   └── services/api.js     # Unified API client
│   └── package.json
│
├── render.yaml                 # 1-Click Render Deployment Blueprint
├── .gitignore
└── package.json                # Root automation scripts
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster or local MongoDB instance

### 1. Configure Server Environment
Create `server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=super_secure_jwt_secret_exam_taker_system_2026_xyz987
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```
*(Note: You can also configure your Gemini API Key directly from the Admin Settings UI at any time).*

### 2. Start the Backend Server
```bash
cd server
npm install
npm run dev
```
The server will boot on `http://localhost:5000` and automatically seed initial topics, mathematical MCQs, sample exams, and demo users.

### 3. Start the Frontend Client
In a separate terminal:
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@examtaker.com` | `AdminPassword123!` |
| **Student** | `sayem@examtaker.com` | `StudentPassword123!` |

*(Both accounts are pre-seeded in the database, with 1-click quick login buttons on the Login page).*

---

## 🌐 Deploying to Render

This repository is pre-configured with `render.yaml` for turnkey deployment on Render as a Web Service.

### Deployment Steps:
1. Push this repository to your GitHub account (see instructions below).
2. Go to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint** (or **Web Service**).
4. Connect your `ExamTakerSystem` GitHub repository.
5. Set the Environment Variables:
   - `MONGODB_URI`: Your MongoDB connection string.
   - `JWT_SECRET`: A secure random secret string.
   - `GEMINI_API_KEY`: Your free Gemini API key from Google AI Studio.
   - `NODE_ENV`: `production`
6. Click **Deploy**. Render will automatically run:
   - Build: `npm run build && cd server && npm install`
   - Start: `npm run start`

> **Note on MongoDB Atlas Network Access**: Ensure your Atlas cluster allows connections from anywhere (`0.0.0.0/0`) under **Security → Network Access**, as Render allocates dynamic IP addresses.

---

## 📦 Pushing to GitHub

To push this codebase to a new repository on your GitHub account (`sayem2001`):

```bash
git init
git add .
git commit -m "feat: complete enterprise exam taker system with AI PDF extraction and leaderboards"

# Create a new repository named 'ExamTakerSystem' on github.com/new, then run:
git branch -M main
git remote add origin https://github.com/sayem2001/ExamTakerSystem.git
git push -u origin main
```
