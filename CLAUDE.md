# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoupleCare is a full-stack couples companion app. The repo has two separate projects: `frontend/` (React + Vite) and `backend/` (Node.js/Express). Run them independently. The root `README.md` is the public-facing project doc (features, setup, deployment); this file (`CLAUDE.md`) holds the detailed architecture, conventions, and gotchas.

**Deployed**: frontend on Vercel, backend on Render (`couple-care.onrender.com`), DB on MongoDB Atlas, media on Cloudinary, email via Brevo. Both apps auto-deploy on push to `master`.

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
FRONTEND_URL=http://localhost:5173   # CORS origin
APP_URL=http://localhost:5173        # FRONTEND origin used to build email links
GROQ_API_KEY=
BREVO_API_KEY=
EMAIL_FROM=                          # must be a Brevo-verified sender
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

**Auth** (`/api/v1/auth`) — **OTP-gated registration**:
- `POST /request-otp` — `{ name, email, password }` → hashes the password, generates a 6-digit OTP (hashed at rest via `security/token.service.hashToken`), upserts a **`PendingRegistration`** doc (TTL-indexed, auto-expires) and emails the code (`security/email.service.sendOtpEmail`). **No User row is created yet.**
- `POST /verify-otp` — `{ email, otp }` → validates (10-min expiry, max 5 attempts), creates the real `User` with `emailVerified: true`, deletes the pending doc, returns `{ user, token }` (**auto-login**). The pre-hashed password is written via `User.updateOne` after create so the model's pre-save hook does not double-hash it.
- `POST /resend-otp` — `{ email }` → throttled (60s cooldown + per-window cap).
- `POST /login` — returns `{ user, token }`. **Existing pre-OTP users are grandfathered** (login is NOT gated on `emailVerified`).
- `GET /me` — returns `req.user` (password excluded by schema `select: false`)
- OTP routes sit behind a dedicated `otpLimiter`. The old immediate `POST /register` is **removed**; frontend `Register.jsx` is a 2-step flow (details → OTP) using `components/auth/OtpInput`.
- Token-link `verify-email`/`forgot-password`/`reset-password` still live under `/api/v1/security` (link-based, unchanged).

**Dashboard** (`/api/v1/dashboard`):
- `GET /` — returns `{ partner, relationship: { status, daysTogether }, moodAnalytics, recentMoods, recentHistories }`
- Throws `"No active relationship"` when `user.currentCoupleId` is null

**AI** (`/api/v1/ai`):
- `GET /health-score` → `{ score: 0–100, level: "Excellent"|"Healthy"|"Moderate"|"Needs Attention" }`
- `GET /weekly-summary` → `{ summary: "<text>" }`
- `GET /mood-analysis` → `{ analysis: "<text>" }`
- `GET /relationship-insights` → `{ insights }`, `GET /memory-recap` → `{ recap }`
- Uses Groq SDK (`llama-3.3-70b-versatile`); prompts in `ai.prompts.js`
- **Reports are concise + bulleted**: prompts force a strict `Strengths` / `Opportunities` / `Suggestions` format (≤5 bullets each, no paragraphs); `ai.engine` caps `max_tokens`. The frontend `AIReport` component (`components/ai/AIReport`) parses that text into styled sections, with a raw-text fallback if the model deviates. Weekly summary's `daysTogether` uses the effective start date (`couple.helpers`).

**Moods** (`/api/v1/moods`):
- `GET /` — user's own moods, newest first
- `POST /` — `{ moodType, intensity: 1–10, note }` — types: `happy|sad|angry|stressed|loved|excited|anxious`
- `GET /partner` — partner's moods
- `GET /analytics` — counts per mood type
- `DELETE /:id`
- **Mood `visibility` defaults to `partner_only`** (was `private`, which hid moods from the partner). A mood can still be set `private`.
- **Negative moods (`sad|stressed|angry|anxious`) alert the partner**: `createMood` fires a `partner_mood_alert` notification (skipped if the mood is `private`).
- `GET /partner` returns `[]` if the partner's `privacy.moodVisibility === "private"`.

**Memories** (`/api/v1/memories`):
- `GET /` — couple's memories
- `POST /` — `{ title, description?, memoryType?, memoryDate, photos?: string[] }` — types: `date|trip|birthday|anniversary|proposal|gift|milestone|other`
- `GET /timeline`, `GET /upcoming`, `GET /stats`
- `PUT /:id`, `DELETE /:id`

**Chat** (`/api/v1/chat`):
- `GET /messages?page=1&limit=50` — returns newest first (reverse in UI)
- `POST /messages` — `{ text }` — sends to couple room
- `POST /upload` — **media sharing** (multipart `file` + optional `text` caption). `multer` memory storage → streams to Cloudinary (`resource_type:"auto"`, folder `couple-care/chat/<coupleId>`), creates a `Message`, and **broadcasts `message:receive`** to the room via `realtime.getIo()` (so it renders live like socket text). Images ≤10 MB, files ≤25 MB, mime allowlist. Binary is **never** stored in Mongo.
- `GET /media` — all image/file messages for the couple (shared-media gallery).
- `PATCH /messages/:id/seen`
- `Message` schema has `type: text|image|file` + `mediaUrl/fileName/fileSize/mimeType/width/height`; `text` is required only when `type==="text"`.
- Real-time via Socket.io: events `message:send` → `message:receive`, `typing:start`, `typing:stop`, `message:seen`; couples join room keyed by `coupleId`. **Media goes via REST then server-emits `message:receive`** — `message:send` stays text-only (no second socket).
- Frontend: `MessageInput` has a 📎 attach button (preview + progress); `MessageBubble` renders image/file; `components/chat/SharedMedia` is the gallery (shown on PartnerProfile).

**Notifications** (`/api/v1/notifications`):
- `GET /` — user's notifications
- `PATCH /read-all`, `PATCH /:id/read`, `DELETE /:id`
- Crons: `mood_reminder` daily 8pm (if no mood logged); **birthday reminder daily 9am** (notifies the partner at 7d / 1d / day-of using `User.birthday`).
- Types: `mood_reminder | memory_reminder | anniversary_reminder | weekly_summary_ready | relationship_milestone | partner_mood_alert | birthday_reminder | system`
- **`createNotification` pushes in real time**: it emits `notification:new` to the recipient via the realtime registry (`utils/realtime`). Frontend `useRealtimeNotifications` (mounted in `AppLayout`) seeds the unread badge on load and increments it live.

**Couples** (`/api/v1/couples`): pair via unique `pairCode`. `User.currentCoupleId` references active couple.
- `POST /create`, `POST /join`, `GET /me`, `GET /dashboard`
- `PATCH /start-date` — `{ relationshipStartDate }` set the real dating date (either partner; captured on `CoupleSuccess` during onboarding)
- `GET /partner-profile` — partner fields + relationship + stats (`memoryCount`, `chatMessageCount`, `moodSummary`, `recentMoods`), **privacy-aware** (see Privacy below)
- `POST /unmatch` — **soft unmatch**: sets `relationshipStatus: "broken_up"`, clears both users' `currentCoupleId`, **keeps all data** (moods/memories/chat/calls); emits `couple:unmatched` to the partner so their app gates back to onboarding (`AppLayout` listens + reloads the user)
- **Two dates**: `relationshipStartedAt` (couple creation) vs `relationshipStartDate` (real dating date). `couple.helpers.getRelationshipStart`/`getDaysTogether` return the effective value (`relationshipStartDate || relationshipStartedAt`) — used by dashboard, journey, milestones, AI.

**Users** (`/api/v1/users`):
- `PATCH /profile` — name/bio/hobbies/likes/dislikes/profilePhoto/**birthday**
- `POST /upload-photo` — Cloudinary avatar upload
- `GET /privacy`, `PATCH /privacy` — the 6 visibility controls (see Privacy below)

**Presence** (Socket.io, no REST): true online/offline/last-seen, reusing the shared socket + `onlineUsers` map in `utils/realtime`.
- On connect: pushes the partner's current presence to the new socket and (if a fresh online transition) broadcasts this user online to the partner.
- On disconnect (last socket): persists `User.lastSeen` and broadcasts offline.
- `presence:get` (client → server) re-syncs the partner's presence on demand (e.g. when a screen mounts). Server emits `presence:update { userId, online, lastSeen, inCall }`.
- `inCall` is derived from the call `userActiveCall` map. **`lastSeen` is intentionally NOT privacy-controlled.**
- Frontend: `usePartnerPresence(partnerId)` hook + upgraded `OnlineStatus` (online / last seen / typing / in-call). The chat header was previously fed the user's OWN socket state (the "always online" bug) — now it uses real partner presence.

**Privacy** (Feature 6): `User.privacy` sub-doc with `moodVisibility`, `memoryVisibility`, `journeyVisibility`, `aiVisibility`, `profileVisibility`, `activityVisibility` — each `private | partner_only | shared`, default `partner_only`.
- Settings UI: "Privacy & Visibility" section on the Settings page using the `PrivacySelect` 3-way control.
- Enforced on partner-facing reads: `getPartnerMoods` (moodVisibility), partner profile (profileVisibility for fields, moodVisibility for the mood summary, activityVisibility for recent activity).
- In a strict 1:1 app, mood/profile/activity are the data with real cross-partner reads. Memories/journey are inherently shared (co-owned) and AI insights are self-generated, so those settings are stored prefs applied wherever a partner-facing surface exists — by design we do NOT hide co-owned data from the partner who shares it.

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
| `/partner` | PartnerProfile (partner profile panel) |
| `*` | → `/dashboard` (authenticated catch-all) |

`AppLayout` renders `<Outlet />` + `<BottomNav />`. BottomNav is `position: fixed; bottom: 0; height: 70px`. Every page must include `padding-bottom: calc(var(--bottom-nav-height) + 28px)` so content is not hidden under it.

### Service layer (`src/services/`)
One file per domain — pages import from services only, never from axios directly.

| File | Exports |
|---|---|
| `auth.service.js` | `requestOtp`, `verifyOtp`, `resendOtp`, `loginUser`, `getCurrentUser` |
| `dashboard.service.js` | `getDashboard` |
| `moods.service.js` | `getMyMoods`, `logMood`, `deleteMood` |
| `memories.service.js` | `getMemories`, `addMemory` |
| `ai.service.js` | `getHealthScore`, `getWeeklySummary`, `getMoodAnalysis` |
| `chat.service.js` | `getMessages`, `sendMessage`, `markMessageSeen`, `deleteMessage`, `uploadChatMedia`, `getSharedMedia` |
| `security.service.js` | security-related calls |
| `call.service.js` | socket signaling emitters: `initiateCall`, `acceptCall`, `rejectCall`, `sendBusy`, `endCall`, `sendOffer`, `sendAnswer`, `sendIceCandidate` (NOT axios — emits over the shared socket) |
| `webrtc.service.js` | `PeerSession` class (RTCPeerConnection wrapper), `acquireLocalStream`, `stopStream`, `getMediaConstraints` |
| `couple.service.js` | `createCouple`, `joinCouple`, `getMyCouple`, `setRelationshipStartDate`, `getPartnerProfile`, `unmatchPartner` |
| `privacy.service.js` | `getPrivacy`, `updatePrivacy` |
| `users.service.js` | `updateProfile` (incl. `birthday`), `uploadPhoto` |

All services return `response.data` (the full `{ success, data }` wrapper). Unwrap with `.data` in the caller.

### Hooks (`src/hooks/`)
- `usePartnerPresence(partnerId)` — live partner presence over the shared socket.
- `useRealtimeNotifications()` — seeds + live-increments the unread badge (mount once in `AppLayout`).

### Notable UI added
- `components/navigation/TopHeader` — app-like top bar (brand + chat/notifications/avatar) on the Dashboard; chat icon opens the partner chat directly (1:1, no chat list).
- `pages/Partner/PartnerProfile` (`/partner`) — partner panel; opened by tapping the partner avatar in the chat header or on the dashboard WelcomeCard.
- `components/ai/AIReport` — renders the bulleted AI report sections.
- `components/dashboard/UpcomingBirthdayCard` — shows when the partner's birthday is ≤30 days away.
- `components/settings/PrivacySelect` — 3-way visibility control used in the Settings "Privacy & Visibility" section.

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
- **Realtime registry** (`utils/realtime.js`) is the single owner of the `io` instance + `onlineUsers` map. Non-socket modules (e.g. `notification.service`) import `emitToUser` from it to push events — do NOT import `socket.js` for that (circular dep). `socket.js` calls `setIo(io)` on init.
- **Effective relationship date**: never compute "days together" from `relationshipStartedAt` directly — use `couple.helpers.getDaysTogether` / `getRelationshipStart` so the real dating date wins.
- **Presence is partner-based, not self**: feed `OnlineStatus`/headers from `usePartnerPresence`, not the local socket's `connected` flag (that was the original "always online" bug).
- **Batch migration**: after deploying the data-foundation changes, run once: `cd backend && node src/scripts/migrate-batch1.js` (idempotent — backfills `relationshipStartDate`, flips legacy `private` moods → `partner_only`, seeds `privacy` defaults).
- **Privacy is enforced on partner-facing reads only**; co-owned data (memories/journey) and self-only AI are not hidden from the partner by design.
- **Body limit is 15mb** (`app.js`): `express.json({ limit: "15mb" })` + `urlencoded`. The previous default 100kb silently 413'd base64 avatar/chat uploads — never revert it.
- **Cloudinary config is centralized** in `config/cloudinary.js` (single `cloudinary.config()`, exports `cloudinary.isConfigured()`). Avatar upload (`users.controller`) and chat media (`chat.media.controller`) both import it. Don't re-`config()` per-module. Both controllers short-circuit with a clear **500 "not configured"** when creds are missing, and on an actual Cloudinary throw return a **502 with Cloudinary's real message** (e.g. `Invalid cloud_name`) so the failing field is obvious. They also log `[cloudinary] … failed: <msg>`.
- **All three `CLOUDINARY_*` must belong to the same account**, and `CLOUDINARY_CLOUD_NAME` must be the **actual Cloudinary cloud name** (from the dashboard) — NOT the project name. Setting it to `couple-care` caused every upload to 502 with `Invalid cloud_name` in production. This is an ops/env issue, not code.
- **Frontend media upload must NOT set `Content-Type` manually** (`chat.service.uploadChatMedia`). With a `FormData` body the browser sets `multipart/form-data` **with the boundary**; hardcoding the header drops the boundary and the server can't parse the file. Let axios/browser set it. (`uploadPhoto` uses base64 JSON, so it's unaffected.)
- **`APP_URL` must be the FRONTEND origin** (Vercel) — it builds email links (`/reset-password?token=`, `/verify-email?token=`). `EMAIL_FROM` must be a Brevo-verified sender or OTP/reset emails silently fail. `forgotPassword` swallows Brevo errors and always returns generic success (no email enumeration); check server logs for `[email]` failures.
- **First-name display**: use `frontend/src/utils/getFirstName.js` for all partner/user name *display* (chat header, dashboard, call screens, journey, mood insights, partner profile). Full name is still stored and edited (`EditProfile`/`ProfileForm`). Notification/AI prompt text already uses first names server-side.
- **Branding**: `index.html` (title/meta/OG), `public/manifest.webmanifest`, heart `public/favicon.svg`, and PNG icons (`icon-192/512`, `icon-maskable-512`, `apple-touch-icon`) generated by `frontend/scripts/generate-icons.cjs` (pure-Node, no deps — rerun to regenerate).
- **Env validation at boot** (`server.js`): missing `MONGO_URI`/`JWT_SECRET` exits; missing email/Cloudinary/Groq vars warn.
