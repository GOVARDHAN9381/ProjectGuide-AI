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

To connect this frontend to a real backend API:
1. Create a `.env` file in this directory:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
2. Replace local storage calls in `src/utils/store.js` with `fetch` / `axios` requests to your backend endpoints.
