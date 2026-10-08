# 🌐 ProjectGuide-AI — Frontend (React + Vite)

The frontend for ProjectGuide-AI is built with **React**, **Vite**, **React Router DOM**, and a custom **OLED Deep Dark Design System**.

---

## 🛠️ Tech Stack
- **Framework**: React 18+
- **Build Tool**: Vite
- **Routing**: `react-router-dom`
- **Styling**: Vanilla CSS (Tailored Design Tokens in `src/index.css`)
- **Speech Integration**: Web Speech API (`webkitSpeechRecognition`) for real-time voice recording in mentor chat.

---

## 📂 Directory Structure

```bash
frontend/
├── public/           # Static assets
├── src/
│   ├── components/   # Reusable UI components (Navbar, etc.)
│   ├── pages/        # Application views:
│   │   ├── Auth.jsx              # Sign in / Register split card
│   │   ├── Profile.jsx           # 4-step student profile onboarding
│   │   ├── StudentDashboard.jsx  # Student project & AI mentor chat
│   │   ├── FacultyDashboard.jsx  # Faculty review & student tracking
│   │   └── Landing.jsx           # Role-based route redirector
│   ├── utils/        # Constants, store helper, toast notifications
│   │   ├── constants.js          # Skills list & domain definitions
│   │   ├── store.js              # LocalStorage & API bridge
│   │   └── toast.js              # Notification triggers
│   ├── App.jsx       # Route configuration
│   ├── index.css     # Unified OLED dark theme design system
│   └── main.jsx      # React root entry point
├── index.html        # Single-page HTML shell
└── package.json      # Dependencies and scripts
```

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Build for production
npm run build
```

---

## 🔌 Connecting to Backend API

To connect this frontend to your FastAPI backend:
1. Copy `.env.example` to `.env`:
   ```env
   VITE_API_BASE=http://127.0.0.1:8000
   ```
   *(Or point to your live backend: `https://your-backend.up.railway.app`)*

---

## ☁️ Deploying to Vercel

This app includes `vercel.json` with client-side SPA rewrites for React Router.

1. **Via Vercel Web Dashboard**:
   - Import repository on [vercel.com/new](https://vercel.com/new)
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Set Environment Variable: `VITE_API_BASE=https://your-backend-url`
2. **Via Vercel CLI**:
   ```bash
   vercel --prod
   ```

