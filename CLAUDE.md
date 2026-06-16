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

**Modules**: `auth`, `users`, `couples`, `chat`, `moods`, `memories`, `histories`, `dashboard`, `ai`, `notifications`, `security`, `calls`

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

**Calls** (`/api/v1/calls`) — WebRTC voice/video, one-to-one between paired partners only:
- `GET /history` — recent `Call` records for the user's active couple (populated caller/receiver)
- **All real-time call work happens over the existing Socket.io connection** (`modules/chat/socket.js`) — there is NO separate signaling server and NO second socket. It reuses the same JWT `io.use` auth, the `onlineUsers: Map<userId, Set<socketId>>` presence map, and `getPartnerId` (so a user can only ever ring their bound partner).
- **Media is pure peer-to-peer** (STUN/TURN). The server relays signaling only — SDP/ICE blobs — and never sees audio/video. Critical for Render (no media bandwidth).
- Signaling events (server side, in `socket.js`):
  - Lifecycle: `call:initiate` (→ resolves partner, busy/offline checks, creates `Call`, emits `call:incoming` to partner), `call:accept` (→ `call:accepted`), `call:reject` (→ `call:rejected`), `call:busy`, `call:end` (→ `call:ended`). Server-emitted: `call:incoming`, `call:accepted`, `call:rejected`, `call:ended`, `call:missed`, `call:timeout`.
  - WebRTC relay (server just forwards to the peer): `webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`.
  - **Caller is the offerer**: offer is created only AFTER `call:accepted` (no media negotiated for unanswered calls).
- Signaling state lives in module-level maps in `socket.js`: `activeCalls` (callId → session) and `userActiveCall` (userId → callId, enforces one call at a time = busy detection). Unanswered calls auto-finalize as `missed` after `RING_TIMEOUT_MS` (35s). Disconnect mid-call notifies the peer (`call:ended`) and finalizes history.
- `Call` model (`call.model.js`): `coupleId, callerId, receiverId, callType (voice|video), status (ringing|completed|missed|rejected|cancelled|failed), duration (s), startedAt, answeredAt, endedAt`. `call.service.js` helpers (`createCall`, `markAnswered`, `finalizeCall`, `getHistoryForCouple`) are tolerant — a history write failure must never break live signaling, so callers swallow their errors.

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
| `/call/voice` | VoiceCallPage |
| `/call/video` | VideoCallPage |
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
| `call.service.js` | socket signaling emitters: `initiateCall`, `acceptCall`, `rejectCall`, `sendBusy`, `endCall`, `sendOffer`, `sendAnswer`, `sendIceCandidate` (NOT axios — emits over the shared socket) |
| `webrtc.service.js` | `PeerSession` class (RTCPeerConnection wrapper), `acquireLocalStream`, `stopStream`, `getMediaConstraints` |

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

### Calling — WebRTC (voice & video)

**`CallProvider` (`src/context/CallContext.jsx`) is the single orchestrator.** It is mounted **inside `AppLayout`** (not in `main.jsx`) so it lives under the router (`useNavigate`) and wraps every authed page — incoming calls work app-wide and call state survives navigation to the call pages. Consume it with `useCall()`.

- **Reuses the shared chat socket** (`services/socket.service.js` singleton via `connectSocket`). `CallProvider` connects the socket app-wide on mount; `ChatPage` also calls `connectSocket` (idempotent — same instance). **Never add a second socket.**
- State machine (`callState`): `idle → outgoing | incoming → connecting → active → idle`. Live media/peer values are held in **refs** (`peerRef`, `localStreamRef`, `callIdRef`, `roleRef`, `stateRef`) so socket handlers never read stale state; React state mirrors them for rendering.
- Caller is the offerer: on `call:accepted` the caller builds the `PeerSession`, `createOffer`, `sendOffer`. Callee builds its `PeerSession` at accept time (before the offer arrives), then answers. ICE candidates that arrive before `setRemoteDescription` are queued in `PeerSession` and flushed.
- `connectionState === "connected"` is what flips the UI to `active` and starts the timer (`callStartedAt`). `failed` ends the call; `disconnected` is left alone (ICE may auto-recover) and surfaced as "Reconnecting…".
- Errors are mapped to friendly copy (`MEDIA_ERROR_MESSAGES`, `END_REASON_MESSAGES`) and shown via `CallErrorToast`.

**ICE config (`src/config/iceServers.js`)** — Google STUN always; TURN is **env-driven and optional**: set `VITE_TURN_URL` (comma-separated urls ok), `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` on Vercel to enable it (no code change). **Without TURN, calls fail on symmetric/CGNAT mobile networks** — STUN-only only works on compatible/Wi-Fi NATs.

**Components (`src/components/call/`)** — each own folder, JSX + CSS:
| Component | Notes |
|---|---|
| `IncomingCallModal` / `OutgoingCallModal` | Global overlays (`z-index: 4000`), render only in `incoming`/`outgoing` state; read `useCall()` directly. Rendered in `AppLayout`. |
| `CallControls` | Adapts to voice vs video (mute / camera / flip / speaker / end); large touch targets, safe-area padding |
| `CallTimer` | Elapsed time from `callStartedAt` (ms timestamp) |
| `ConnectionStatus` | Maps `RTCPeerConnection.connectionState` to themed label; renders nothing when healthy |
| `VideoView` | Full-bleed `PartnerVideo` + floating `LocalVideo` PiP |
| `PartnerVideo` / `LocalVideo` | `<video>` wrappers; LocalVideo is `muted` + mirrored; PartnerVideo plays remote audio. Voice page uses a hidden `<audio>` for remote audio. |

**Call pages** (`pages/Call/VoiceCallPage`, `VideoCallPage`, routes `/call/voice` `/call/video`) read everything from `useCall()` and `<Navigate to="/chat">` if `callState` isn't `connecting`/`active`. Like the chat page they are `position: fixed` full-screen (cover the BottomNav).

**Chat integration**: `ChatHeader` shows ❤️ (voice) / 🎥 (video) buttons gated on `useCall().canCall` (i.e. `currentCoupleId` exists); calls `startCall(type, partner)`.

---

## Known patterns and gotchas

- **Mongoose v9 async hooks**: Never call `next()` — see note above. Fixed in `user.model.js`.
- **Dashboard catch for no partner**: `getDashboard()` throws `{ message: "No active relationship" }` when `user.currentCoupleId` is null. Handle as a state, not an error.
- **Chat messages are returned newest-first** from `GET /chat/messages`. Reverse the array before rendering in a chronological thread.
- **AI summary shape**: `getWeeklySummary()` returns `{ success, data: { summary } }`. Extract `res.data.summary`, not `res.data` directly, before passing as a string to `AIInsightCard`.
- **Chat page uses `position: fixed`** (fills viewport above BottomNav). Do not wrap it in the standard page scroll container.
- **Service return shape**: All services return the full axios `response.data` which is `{ success, data }`. Access `.data` in the calling page to reach the actual payload.
- **Calls: one socket only**. `call.service.js` emits over the existing `socket.service.js` singleton; `CallProvider` and `ChatPage` both call `connectSocket` (idempotent). Do NOT introduce a second socket/provider for calls.
- **Calls need TURN on mobile**. Without the `VITE_TURN_*` env vars, calls ring and "accept" but stall at "Connecting…" on cellular/symmetric-NAT networks. This is a missing-TURN symptom, not a code bug.
- **Call signaling is socket-only**, not REST — the only HTTP call route is `GET /calls/history`. Call history is written best-effort in `socket.js`; a DB failure there must not break the live call.
- **`getUserMedia` requires a secure context** (HTTPS or localhost) and explicit mic/camera permission. iOS only supports it in Safari, not iOS Chrome.
