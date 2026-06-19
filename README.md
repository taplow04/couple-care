<div align="center">

# 💕 CoupleCare

**Your relationship companion — chat, calls, moods, memories, milestones, and AI insights, all in one place.**

A full-stack app for couples to stay close: a premium Instagram-DM-style messenger with media sharing, voice notes & reactions, voice/video calls, mood tracking, shared memories, a relationship journey timeline, and AI-powered relationship insights — all in an installable, native-feeling PWA with light/dark themes.

</div>

---

## ✨ Features

- **Secure onboarding** — email + password registration gated by a **6-digit OTP** (verified before the account is created), plus forgot/reset password.
- **Pair with one partner** — connect via a unique pair code; soft unmatch keeps your data.
- **Premium romantic chat** — 1:1 Socket.io messaging with an Instagram-DM-style love theme (soft gradients, frosted-glass header/composer), typing indicators, seen receipts, and message **reactions** (❤️ 👍 😂 😢 😍), **reply / copy / delete** via a long-press menu, and double-tap-to-❤️.
- **Rich media sharing** — quick **camera**, gallery (photos + **video**), files, and **voice notes** (tap-to-record with live waveform + cancel/send), all via Cloudinary, with a tabbed **shared-media gallery** (Photos · Videos · Files · Voice).
- **Voice & video calls** — WebRTC peer-to-peer calling between partners (STUN/TURN), with full call lifecycle and history.
- **Live presence** — true online / last-seen / in-call / typing status.
- **Mood tracking** — log moods with intensity & notes; partner mood alerts; analytics, trends, heatmaps & compatibility.
- **Shared memories** — a co-owned timeline of dates, trips, anniversaries & milestones (with photos).
- **Relationship journey** — days-together, milestones, and stats based on your real start date.
- **AI insights** — concise, bulleted relationship health score, weekly summaries, and mood analysis (Groq / Llama 3.3).
- **Smart reminders** — automated mood, birthday, and anniversary notifications (real-time + scheduled).
- **Light / Dark / System theme** — instant, persisted theme switching (CSS variables + `data-theme`), synced to user settings and localStorage.
- **Privacy controls** — granular per-data-type visibility settings.
- **Native-feeling PWA** — installable with shortcuts & offline shell; no text-selection / tap-highlight / pull-to-refresh / double-tap-zoom; safe-area aware; universal back navigation.

### 🔥 V2.0 — Relationship Engagement System

A daily-companion layer where every feature feeds one shared engagement loop (streak · XP · achievements · health · journey):

- **Relationship Streak & XP** — a weighted daily streak (chat, mood, memory, bucket goal, sleep, love letter, AI coach, surprise, story chapter all count — not chat-only), couple XP & levels, and a **Love Meter** (animated hearts that react to health + streak). Encouraging, never punishing.
- **Achievements** — 16 couple badges that unlock live with a celebration toast for both partners.
- **Surprise Box** — one AI-generated daily delight (date idea, love quote, tip, challenge, compliment, mood booster…) with a wrapped-gift open animation.
- **AI Love Letters** — personalized romantic / apology / appreciation / anniversary / birthday letters (Groq), with regenerate / copy / save / send-to-partner.
- **AI Relationship Coach** — an interactive, contextual chat coach (not a report) that knows your moods, memories, health & goals and keeps conversation history.
- **Couple Bucket List** — a shared, co-owned list across 9 categories with deadlines, progress %, and completion that feeds XP & achievements.
- **Story Timeline** — your relationship auto-assembled into numbered chapters (start, memories, milestones, completed goals, love letters, achievements) plus custom chapters, inside the Journey page.
- **Sleep Tracker** — both partners log sleep; AI analyzes consistency, partner sync, and fatigue.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite, React Router, Axios, Socket.io-client, WebRTC |
| **Backend** | Node.js, Express 5, Socket.io |
| **Database** | MongoDB (Mongoose 9) — MongoDB Atlas |
| **Media storage** | Cloudinary (avatars + chat media) |
| **Email** | Brevo (transactional — OTP, password reset) |
| **AI** | Groq SDK (`llama-3.3-70b-versatile`) |
| **Auth** | JWT (bcrypt password hashing) |
| **Hosting** | Frontend → Vercel · Backend → Render |

---

## 📁 Repository Structure

This is a two-project repo — `frontend/` and `backend/` run independently.

```
couple-care/
├── backend/                 # Express + Socket.io API
│   └── src/
│       ├── server.js        # HTTP server, DB connect, Socket.io, cron jobs
│       ├── app.js           # Express middleware + routes
│       ├── config/          # db + cloudinary config
│       ├── middleware/       # auth, error handling
│       ├── modules/          # feature modules (model/service/controller/routes)
│       │   ├── auth/         # OTP registration, login
│       │   ├── users/        # profile, avatar upload, privacy
│       │   ├── couples/      # pairing, partner profile, unmatch
│       │   ├── chat/         # messages, media upload, socket signaling, calls
│       │   ├── moods/  memories/  histories/  dashboard/
│       │   ├── ai/           # Groq-powered insights
│       │   ├── notifications/ # real-time + scheduled
│       │   ├── security/     # email (Brevo), tokens, password reset
│       │   └── calls/        # WebRTC call history
│       └── utils/            # realtime registry, jwt, helpers
│
└── frontend/                # React + Vite SPA
    └── src/
        ├── api/              # axios instance
        ├── services/         # one module per API domain
        ├── context/          # Auth, Theme, Call, Notifications, ChatUnread providers
        ├── hooks/            # presence, realtime notifications, visual viewport
        ├── components/       # UI (chat, call, dashboard, ai, journey, common…)
        ├── pages/            # route pages
        ├── styles/           # variables (themes/tokens), global, animations
        └── utils/            # getFirstName, compressImage, etc.
```

The backend follows a consistent module pattern: `*.model.js` (schema), `*.service.js` (logic), `*.controller.js` (HTTP), `*.routes.js` (router). All API responses use `{ success, data }`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB database (Atlas or local)
- Cloudinary, Brevo, and Groq accounts (for media, email, and AI)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values below
npm run dev               # nodemon on http://localhost:5000
```

**`backend/.env`:**

```env
PORT=5000
MONGO_URI=mongodb+srv://...            # MongoDB Atlas connection string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d

FRONTEND_URL=http://localhost:5173     # CORS origin
APP_URL=http://localhost:5173          # FRONTEND origin used in email links

GROQ_API_KEY=...
BREVO_API_KEY=...
EMAIL_FROM=noreply@yourdomain.com      # must be a Brevo-VERIFIED sender

CLOUDINARY_CLOUD_NAME=...              # exact cloud name from Cloudinary dashboard
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

> ⚠️ **All three `CLOUDINARY_*` values must come from the same Cloudinary account**, and `CLOUDINARY_CLOUD_NAME` must be your **actual** cloud name (not the project name) — otherwise uploads fail with `Invalid cloud_name`.
>
> ⚠️ **`APP_URL` must be the frontend origin** (it builds password-reset links), and **`EMAIL_FROM` must be a Brevo-verified sender** or OTP/reset emails won't send.

The server validates required env vars on boot (`MONGO_URI` / `JWT_SECRET` are fatal; the rest warn).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # Vite on http://localhost:5173
```

**`frontend/.env`:**

```env
VITE_API_URL=http://localhost:5000/api/v1
# Optional — TURN servers for reliable calls on mobile/symmetric NAT:
# VITE_TURN_URL=
# VITE_TURN_USERNAME=
# VITE_TURN_CREDENTIAL=
```

> The socket connection is derived from `VITE_API_URL` (it strips `/api/v1`). Without TURN, calls work on Wi-Fi but may stall on cellular/symmetric-NAT networks.

---

## 📜 Scripts

**Backend** (`backend/`)
| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Start the server |

**Frontend** (`frontend/`)
| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

To regenerate the PWA icons from the heart SVG: `node frontend/scripts/generate-icons.cjs`.

---

## 🔐 Authentication Flow

1. **Register** → `POST /auth/request-otp` (name, email, password) emails a 6-digit code; no account exists yet (stored in a TTL'd `PendingRegistration`).
2. **Verify** → `POST /auth/verify-otp` creates the account and returns `{ user, token }` (auto-login).
3. **Login** → `POST /auth/login` returns `{ user, token }`.
4. **Forgot password** → `POST /security/forgot-password` → email link → `POST /security/reset-password`.

JWT is stored in `localStorage` and attached as `Authorization: Bearer <token>`. OTP codes are hashed at rest, expire in 10 minutes, and are rate-limited.

---

## ☁️ Deployment

| Service | Hosts | Notes |
|---|---|---|
| **Vercel** | Frontend | Auto-deploys on push to `master`. Set `VITE_API_URL` (+ optional `VITE_TURN_*`). |
| **Render** | Backend | Auto-deploys on push to `master`. Set all backend env vars above. WebSocket-enabled. |
| **MongoDB Atlas** | Database | Connection string → `MONGO_URI`. |
| **Cloudinary** | Media | Avatars + chat media. |
| **Brevo** | Email | OTP + password reset; sender must be verified. |

Both apps deploy from the same repo by pushing to `master`.

---

## 🤝 Contributing

The codebase follows the established module pattern and `{ success, data }` response shape. See `CLAUDE.md` for detailed architecture notes, conventions, and gotchas.

---

<div align="center">
Made with 💕 for couples.
</div>
