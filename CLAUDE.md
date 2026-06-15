# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoupleCare is a full-stack couples companion app. The repo has two separate projects: `frontend/` (React + Vite) and `backend/` (Node.js/Express). Run them independently.

## Commands

### Frontend (`frontend/`)
```bash
npm run dev        # Start Vite dev server on :5173
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Backend (`backend/`)
```bash
npm run dev        # nodemon src/server.js (hot reload)
npm start          # node src/server.js
```

### Backend `.env` required variables
```
PORT=5000
MONGO_URI=
JWT_SECRET=
FRONTEND_URL=http://localhost:5173
GROQ_API_KEY=
BREVO_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Backend Architecture (`backend/src/`)

**Entry point**: `server.js` creates an HTTP server, connects MongoDB, starts Socket.io, and kicks off the cron notification scheduler. `app.js` configures Express middleware and mounts all routes under `/api/v1`.

**Module pattern** — each feature in `src/modules/<name>/`:
- `*.model.js` — Mongoose schema
- `*.service.js` — Business logic
- `*.controller.js` — HTTP handler (calls service, sends JSON)
- `*.routes.js` — Express router (auth middleware, validators, rate limiting)

**Modules**: `auth`, `users`, `couples`, `chat`, `moods`, `memories`, `histories`, `dashboard`, `ai`, `notifications`, `security`

### Key backend behaviours

**Mongoose v9 async pre-hooks**: Must NOT accept or call `next`. Use `async function()` with plain `return`. Calling `next()` throws `TypeError: next is not a function` because kareem awaits the returned Promise directly and does not inject `next` into async hooks.

**All API responses** follow `{ success: true, data: ... }` shape. Controllers use `asyncHandler` utility. Global error handler in `errorMiddleware.js` reads `err.statusCode`, defaults to 400.

**Auth** (`/api/v1/auth`):
- `POST /register` — creates user, sends verification email via Brevo SDK v5
- `POST /login` — returns `{ user, token }`; `data` is the full object
- `GET /me` — returns `req.user` (password excluded by schema `select: false`)

**Dashboard** (`/api/v1/dashboard`):
- `GET /` — returns `{ partner, relationship: { status, daysTogether }, moodAnalytics, recentMoods, recentHistories }`
- Throws `"No active relationship"` when `user.currentCoupleId` is null

**AI** (`/api/v1/ai`):
- `GET /health-score` → `{ score: 0–100, level: "Excellent"|"Healthy"|"Moderate"|"Needs Attention" }`
- `GET /weekly-summary` → `{ summary: "<text>" }`
- `GET /mood-analysis` → `{ analysis: "<text>" }`
- Uses Groq SDK (`llama-3.3-70b-versatile`); prompts in `ai.prompts.js`

**Moods** (`/api/v1/moods`):
- `GET /` — user's own moods, newest first
- `POST /` — `{ moodType, intensity: 1–10, note }` — types: `happy|sad|angry|stressed|loved|excited|anxious`
- `GET /partner` — partner's moods
- `GET /analytics` — counts per mood type
- `DELETE /:id`

**Memories** (`/api/v1/memories`):
- `GET /` — couple's memories
- `POST /` — `{ title, description?, memoryType?, memoryDate, photos?: string[] }` — types: `date|trip|birthday|anniversary|proposal|gift|milestone|other`
- `GET /timeline`, `GET /upcoming`, `GET /stats`
- `PUT /:id`, `DELETE /:id`

**Chat** (`/api/v1/chat`):
- `GET /messages?page=1&limit=50` — returns newest first (reverse in UI)
- `POST /messages` — `{ text }` — sends to couple room
- `PATCH /messages/:id/seen`
- Real-time via Socket.io: events `message:send` → `message:receive`, `typing:start`, `typing:stop`, `message:seen`; couples join room keyed by `coupleId`

**Notifications** (`/api/v1/notifications`):
- `GET /` — user's notifications
- `PATCH /read-all`, `PATCH /:id/read`, `DELETE /:id`
- Cron job runs daily at 8pm; creates `mood_reminder` if user hasn't logged a mood today
- Types: `mood_reminder | memory_reminder | anniversary_reminder | weekly_summary_ready | relationship_milestone | system`

**Couples** (`/api/v1/couples`): pair via unique `pairCode`. `User.currentCoupleId` references active couple.

---

## Frontend Architecture (`frontend/src/`)

### Auth flow
`AuthProvider` (in `main.jsx`) wraps the entire app **outside** `BrowserRouter`. On mount, calls `GET /auth/me` once to rehydrate `user` state. Token stored in `localStorage`. `ProtectedRoute` reads `{ user, loading }` from `useAuth()` — shows `AuthLoader` while loading, redirects to `/login` only if `user` is null after loading completes.

### Routing (`App.jsx`)
Public: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`

Protected (all nested under `<ProtectedRoute><AppLayout /></ProtectedRoute>`):
| Path | Page |
|---|---|
| `/dashboard` | Dashboard |
| `/moods` | Moods |
| `/memories` | Memories |
| `/profile` | Profile |
| `/chat` | Chat |
| `/ai` | AI Insights |
| `*` | → `/dashboard` (authenticated catch-all) |

`AppLayout` renders `<Outlet />` + `<BottomNav />`. BottomNav is `position: fixed; bottom: 0; height: 70px`. Every page must include `padding-bottom: calc(var(--bottom-nav-height) + 28px)` so content is not hidden under it.

### Service layer (`src/services/`)
One file per domain — pages import from services only, never from axios directly.

| File | Exports |
|---|---|
| `auth.service.js` | `registerUser`, `loginUser`, `getCurrentUser` |
| `dashboard.service.js` | `getDashboard` |
| `moods.service.js` | `getMyMoods`, `logMood`, `deleteMood` |
| `memories.service.js` | `getMemories`, `addMemory` |
| `ai.service.js` | `getHealthScore`, `getWeeklySummary`, `getMoodAnalysis` |
| `chat.service.js` | `getMessages`, `sendMessage` |
| `security.service.js` | security-related calls |

All services return `response.data` (the full `{ success, data }` wrapper). Unwrap with `.data` in the caller.

### API shape reminder
`axios.js` points to `http://localhost:5000/api/v1` and attaches `Authorization: Bearer <token>` on every request via interceptor.

### Pages built

**Dashboard** (`/dashboard`) — progressive loading strategy:
1. `getDashboard()` blocks render (skeleton shown while loading)
2. After primary data resolves, `Promise.allSettled([getMemories(), getHealthScore(), getWeeklySummary()])` loads secondary data in parallel
3. "No active relationship" error renders a `NoPartnerState` CTA instead of crashing

**Moods** (`/moods`) — fetches `GET /moods`, inline log form (mood-type grid + range slider + textarea), mood list with intensity bar and colour-coded left border

**Memories** (`/memories`) — fetches `GET /memories`, inline add form (title/description/type/date), 2-column card grid

**Profile** (`/profile`) — reads `useAuth().user` directly (no extra API call), shows avatar/name/email/bio/hobbies/likes/settings, logout button

**Chat** (`/chat`) — fetches `GET /chat/messages` (reverses array for display), sends `POST /chat/messages`, fixed-position layout (fills viewport above BottomNav), own/partner bubble styles

**AI Insights** (`/ai`) — parallel fetch of health-score + weekly-summary + mood-analysis, SVG donut ring with CSS transition animation

### Dashboard components (`src/components/dashboard/`)

| Component | Key props | Notes |
|---|---|---|
| `WelcomeCard` | `user`, `partner` | Gradient card; time-based greeting; rotating messages; avatar stack |
| `HealthScoreCard` | `aiScore`, `moodAnalytics` | SVG donut ring; `aiScore?.score` is authoritative; local fallback from `moodAnalytics` while AI loads |
| `RelationshipStatusCard` | `relationship` | Animated heart; `formatDuration(days)` for display |
| `RecentMoodCard` | `recentMoods` | 7 mood types with emoji, colour, intensity bar |
| `AIInsightCard` | `aiSummary`, `moodAnalytics`, `partner`, `loading` | Shimmer skeleton while loading; truncates AI text at 220 chars; fallback insight from mood ratio |
| `QuickActionsCard` | — | 4 links: `/moods`, `/memories`, `/chat`, `/ai` |
| `RecentMemoriesCard` | `memories`, `loading` | Horizontal scroll; photo or emoji fallback; shimmer skeleton |

### Design system
CSS custom properties in `src/styles/variables.css`:
- `--primary: #ff5c8a` / `--primary-dark: #e34a78` / `--primary-light: rgba(255,92,138,0.10)`
- `--secondary: #7c5cff` / `--secondary-light: rgba(124,92,255,0.10)`
- `--background: #f7f8fc` / `--card: #ffffff`
- `--text: #1a1a2e` / `--text-secondary: #444455` / `--muted: #888899`
- `--success: #32c36c` / `--warning: #ffaa00` / `--danger: #ff5252`
- `--radius: 18px` / `--radius-sm: 12px` / `--radius-lg: 24px`
- `--shadow` / `--shadow-sm` / `--shadow-md`
- `--transition: all 0.22s ease`
- `--bottom-nav-height: 70px`

Mobile-first CSS: base at 390px, breakpoint at `768px` for tablet/desktop.

### Common components (`src/components/common/`)
- `Button` — base button
- `Card` — base card wrapper
- `PageHeader` — `{ title, subtitle }` props
- `Loader` — two modes: `fullScreen` (heart pulse + text) and inline dots

### Navigation (`src/components/navigation/BottomNav/`)
4 items: Home (`/dashboard`), Mood (`/moods`), Memory (`/memories`), Profile (`/profile`). Uses `NavLink` with `isActive` for active state styling.

---

## Known patterns and gotchas

- **Mongoose v9 async hooks**: Never call `next()` — see note above. Fixed in `user.model.js`.
- **Dashboard catch for no partner**: `getDashboard()` throws `{ message: "No active relationship" }` when `user.currentCoupleId` is null. Handle as a state, not an error.
- **Chat messages are returned newest-first** from `GET /chat/messages`. Reverse the array before rendering in a chronological thread.
- **AI summary shape**: `getWeeklySummary()` returns `{ success, data: { summary } }`. Extract `res.data.summary`, not `res.data` directly, before passing as a string to `AIInsightCard`.
- **Chat page uses `position: fixed`** (fills viewport above BottomNav). Do not wrap it in the standard page scroll container.
- **Service return shape**: All services return the full axios `response.data` which is `{ success, data }`. Access `.data` in the calling page to reach the actual payload.
