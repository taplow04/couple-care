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
- `GET /health-score` → `{ score: 0–100, level, breakdown }` — **a COUPLE metric: identical for both partners.** `generateHealthScore` delegates to `couples/health.service.computeCoupleHealth(coupleId)` (deterministic, couple-wide inputs). Do NOT compute the score from a single user's moods.
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
- `Message` schema has `type: text|image|file|audio|video` + `mediaUrl/fileName/fileSize/mimeType/width/height/mediaDuration` + `reactions: [{ userId, emoji }]` + `replyTo` (ref Message); `text` is required only when `type==="text"`. Voice notes are `audio` (MediaRecorder → Cloudinary, `audio/webm` mime allowed); short clips are `video`.
- **Reactions / reply**: `message:react` socket event toggles one emoji per user (set is `❤️ 👍 😂 😢 😍`) and broadcasts `message:reaction { messageId, reactions }`. `message:send` + the media upload accept an optional `replyTo` (populated on broadcast/history). Frontend: `emitReaction` (socket.service), `components/chat/MessageReaction` (picker + aggregated badge), long-press `MessageOptions` (Reply/Copy/Forward(stub)/Delete), double-tap a text/audio bubble = ❤️.
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
- **Relationship Health is a COUPLE metric** — `couples/health.service.js` is the single source of truth. `computeCoupleHealth(coupleId)` is **deterministic** and uses only couple-wide inputs (both partners' moods, couple memories/messages, days together), so User A and User B always get the **identical** score. Weighted algorithm: Mood Health 25% · Communication 20% · Memory 15% · Longevity 10% · Mood Compatibility 10% · Engagement 10% · AI Trend 10%. The "AI Trend" 10% is **deterministic trend math, NOT an LLM call** (an LLM would differ per request and break the equality rule). Result is cached on the `Couple` doc (`healthScore/healthLevel/healthBreakdown/healthUpdatedAt`). `dashboard.service` includes `health` in its payload; the frontend `HealthScoreCard` uses `aiScore ?? health` (no per-user fallback — that was the original divergence bug).
- **Real-time health propagation**: `health.service.recomputeAndBroadcast(coupleId, type)` is called after mood create/delete (`mood.service`) and memory create/delete (`memory.service`); it recomputes and emits `health:update` + `couple:activity` to **both** partners via `realtime.emitToUser` (no room-join needed). Frontend pages subscribe via the `useCoupleEvents` hook (Dashboard, MoodAnalytics, Journey) so both partners' screens update live.
- **Web Push** (`modules/push/`): `push.service.sendPushToUser(userId, payload)` fans out a web-push to all a user's registered devices (`PushSubscription` collection, `endpoint` unique) and prunes dead 404/410 subs. Wired into `notification.service.createNotification` (mood alerts, reminders, AI, birthdays), chat `socket.js message:send` + `chat.media.controller` (new message/photo/file), and `call:initiate` (incoming-call push). Needs env `VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT` — **gracefully disabled (warns) if unset**. Routes: `GET /push/vapid-public-key`, `POST /push/subscribe|unsubscribe`. Frontend: `public/sw.js` (service worker — `push`/`notificationclick`; suppresses call pushes when a window is focused), `services/push.service.js` (subscribe flow), registered in `main.jsx` (PROD only), opt-in via Settings toggle, auto re-subscribe in `AppLayout` when permission granted. **iOS push works only for installed PWAs (Safari 16.4+).**
- **Bottom nav** (`BottomNav.jsx`): Home · Mood · **AI Center** · Journey · **Profile (real avatar)**. "Alerts" removed. Notifications reachable via the **global `NotificationBell`** (fixed top-right, rendered in `AppLayout` on every main page except `/dashboard` — which has it in `TopHeader` — and except immersive `/chat`,`/call/*`). `TopHeader` no longer shows the profile avatar. `AppLayout` hides `BottomNav` on chat/call (immersive).
- **Chat keyboard (mobile)**: `.chat-page` is `height: var(--app-height, 100dvh)`; `hooks/useVisualViewport` sets `--app-height` from `window.visualViewport.height` so the input stays above the on-screen keyboard (iOS Safari + Android Chrome). Chat/message inputs must be **≥16px font** (`.msg-input__field`) or iOS auto-zooms on focus. `index.html` viewport has `interactive-widget=resizes-content`.
- **Dashboard CLS**: the Health card reads the couple `health` from the primary dashboard payload (no async wait → no ring flash); `AIInsightCard`/`RecentMemoriesCard` have reserved `min-height`; page wrappers use `100dvh`.
- **`connectSocket` MUST stay idempotent** (`socket.service.js`): return the existing instance whether connected OR connecting; only rebuild if the auth token changed. The old version disconnected an in-flight socket and made a new one on every concurrent mount call, orphaning listeners → flaky presence, missed `notification:new`/`message:receive`. **Never recreate the socket on mount.** Many hooks call `connectSocket` (presence, unread, notifications, chat, calls) and all must share one instance.
- **Presence is correct given a stable socket** — the only bug was the socket churn above. On Render free tier the backend sleeps after ~15min idle → all sockets drop (everyone "offline") until wake; mitigate with an external keep-alive ping, not code.
- **Unread chat badge**: `GET /chat/unread-count` (partner messages with `seen:false`); `PATCH /chat/seen-all` clears them (called by `ChatPage` on open). Frontend `ChatUnreadContext` + `useChatUnread` (mounted in `AppLayout`) seed from the API and live-increment on `message:receive` when off `/chat`. `TopHeader` chat icon shows the unread badge + a green online dot from `usePartnerPresence(partner._id)`.
- **Missed-call push**: `socket.js` sends a `sendPushToUser` "Missed call" on the ring-timeout and offline-at-initiate branches (incoming-call push already exists). Push opt-in is driven by `components/push/PushPrompt` (banner) + the Settings toggle; nothing arrives without a saved subscription even though VAPID is configured.
- **Theme system (light/dark/system)**: `context/ThemeContext.jsx` (mounted in `main.jsx` inside `AuthProvider`) sets `document.documentElement[data-theme]` and persists to `localStorage("cc-theme")` **and** `User.settings.theme` (server-synced; whitelisted in `security.service.updateSettings`). `index.html` has a tiny inline boot script that applies the saved theme **before first paint** (no flash). `styles/variables.css` holds light defaults in `:root` and a `:root[data-theme="dark"]` override block (plus typography/spacing/gradient/glass tokens). **Components must consume tokens, not hardcoded colors**, or they break in dark mode (e.g. the original `NotificationBell` hardcoded a white bg → its `var(--text)` icon went invisible in dark mode). UI: `components/common/ThemeToggle` in the Settings **Appearance** section. Server sync uses set-state-during-render (not an effect) to satisfy the React-compiler lint (`set-state-in-effect` / no-refs-in-render).
- **Love-chat theme**: chat surfaces use theme-aware tokens `--chat-bg` (pink→lavender light / deep romantic dark, **no pure black**), `--chat-glow-*` (two GPU-cheap blurred radial pseudo-elements behind the thread), and `--chat-bubble-*`. Header + composer are **frosted glass** (`--glass-bg` + `backdrop-filter`); own bubbles are a pink→violet gradient with a warm glow, partner bubbles a translucent glass panel; bubbles animate in via `msg-in`. Keep `backdrop-filter` off individual bubbles (perf).
- **Voice notes are tap-to-record, NOT hold/slide** (`components/chat/VoiceRecorder`): tap mic → records (live waveform via Web Audio `AnalyserNode` + timer); explicit **Cancel (trash)** and **Send (stop)** buttons. The old hold + slide-to-cancel gesture was unreliable on desktop — don't reintroduce it. Playback via `components/chat/VoiceMessage` (play/seek/speed). Images are compressed client-side before upload (`utils/compressImage.js`).
- **Universal back button**: `components/common/BackHeader` (sticky, glass, safe-area aware) navigates via React Router with a safe `fallback` route when there's no history (deep-link/refresh). Adopted on **secondary** pages only (Settings, Notifications, Mood Analytics, Partner Profile, Memories, AI) + a back chevron on the chat header. **Bottom-nav tab roots (Dashboard/Moods/AI Center/Journey/Profile) intentionally have NO back button** (standard mobile UX).
- **Native-app feel (PWA layer)** in `styles/global.css`: app-wide `user-select: none` (re-enabled for `input/textarea/[contenteditable]` + `.selectable`), `-webkit-tap-highlight-color: transparent`, `-webkit-touch-callout: none`, `img { -webkit-user-drag: none }`, `touch-action: manipulation` (kills double-tap zoom but **keeps pinch-zoom** — no `maximum-scale` lock), and `overscroll-behavior: none` (no pull-to-refresh / bounce). Don't reintroduce `maximum-scale=1` (a11y).
- **Service worker caching** (`public/sw.js`): conservative to avoid the "stuck on old build" trap — **network-first for navigations** (online users always get the latest shell; cached `index.html` is only an offline fallback), **cache-first only for immutable hashed `/assets/*`** + static icons, old caches purged on `activate`. **API/socket/Cloudinary/cross-origin are never cached.** **Bump `CACHE` (the version string) on any release that must invalidate stale clients** — changing `sw.js`'s bytes is what makes the browser re-install the SW and purge old caches. If a deploy "isn't reflected" for users, bumping `CACHE` is the fix (currently `couple-care-v2`). Manifest has `shortcuts` (Chat/Mood/Journey).
- **Route code-splitting** (`App.jsx`): only the auth pages + `Dashboard` are eagerly imported; every other page is `React.lazy` + a single `<Suspense fallback={<Loader fullScreen />}>`. Keeps the initial bundle ~340 KB. New pages should be added as `lazy()` imports too.

---

## CoupleCare V2.0 — Relationship Engagement System

V2.0 turns the app into a daily companion. **The non-negotiable rule: no isolated features.** Eight systems all feed ONE shared engagement loop.

### The engagement backbone (`modules/engagement/`) — the spine
Every feature calls ONE entry point: **`engagement.service.recordActivity(coupleId, userId, type, meta)`** (modeled on `health.service.recomputeAndBroadcast`). It logs an `ActivityLog`, updates the couple **Streak** + **XP**, evaluates **Achievements**, and emits `engagement:update` + `achievement:unlocked` to BOTH partners via `realtime.emitToUser`. **It never throws** (engagement must never break the action that triggered it). Already wired into mood/memory/chat writes; new features call it in their own services.
- **Activity types & XP** live once in `engagement.constants.js`. **Streak is weighted (not chat-only)**: any activity keeps it alive; it's **day-based** (UTC `YYYY-MM-DD`), updated on the first activity of the day; non-punishing.
- **XP is awarded once per activity TYPE per day** (varied activity earns more, spamming one action does not inflate). Level curve is deterministic (`levelForXP`): L2=100, L3=300, L4=600, L5=1000 cumulative XP.
- **Achievements**: catalog (definitions + `check(stats)`) is code in `achievements.catalog.js`; the `Achievement` collection only stores unlocks (unique `{coupleId, key}`). 16 couple badges.
- `recordActivity` does **NOT** recompute health (mood/memory already do via `recomputeAndBroadcast`, and bucket/sleep aren't health inputs) — avoids double work. The **Love Meter** blends health + streak on the client.
- Read API: `GET /engagement`, `GET /engagement/achievements`. Engagement summary is also embedded in the **dashboard payload** (`engagement`) so the StreakCard/LoveMeter render from one fetch. Frontend: `useEngagement` hook (shared socket, live), `components/engagement/*` (StreakCard, XPBar, LoveMeter, AchievementToast — mounted globally in `AppLayout`).
- Streak reminder cron (7pm) only nudges couples with a live streak who haven't acted today (encouraging).

### Shared AI context (`modules/ai/ai.context.js`)
`buildRelationshipContext(userId)` + `formatContext(ctx)` assemble a compact snapshot (partner profile, days together, health, both partners' moods, memories, bucket list) reused by ALL V2 AI features. **Reuse the existing `ai.engine` only** — `generateAIResponse` (single prompt) and `generateChatResponse` (messages array, for the coach). All prompts centralize in `ai.prompts.js` (`buildLoveLetterPrompt`, `buildCoachReplyPrompt`, `buildSurprisePrompt`, `buildSleepAnalysisPrompt`). No new AI service/SDK.

### Feature modules (all couple-scoped, follow the standard module pattern)
| Module | Routes | Notes |
|---|---|---|
| `bucket` | `/bucket` (CRUD + `/stats`, `PATCH /:id/complete`) | Co-owned `BucketItem` (9 categories). Completing fires `recordActivity(BUCKET_COMPLETE)` + `bucket_completed` partner notif. |
| `letters` | `/letters` (`/generate`, save, list, `/:id/share`, delete) | `LoveLetter` (7 types). Save → `LOVE_LETTER` activity; share → `love_letter_received` notif. Couple-visible. |
| `coach` | `/coach/conversations` (+ `/:id/message`, id `"new"` starts fresh) | `CoachConversation` (per-user private threads). Interactive chat using context system prompt + windowed history → `generateChatResponse`. `COACH` activity. |
| `story` | `/story/chapters` (CRUD) | **Story Timeline.** `getChapters` ASSEMBLES chapters from start + memories + day-milestones + completed bucket + letters + achievements; `StoryChapter` collection holds only CUSTOM chapters. Rendered as a section in the existing **Journey page** (not a new page). |
| `sleep` | `/sleep` (+ `/partner`, `/analysis`) | `SleepLog` (per-user, couple-scoped). `getAnalysis` computes avg hours/quality/partner-sync %, then narrates via AI (Strengths/Opportunities/Suggestions → reuses `AIReport`). `SLEEP` activity. |
| `surprise` | `/surprise/today`, `/surprise/open` | `SurpriseBox`, **unique `{userId, day}` index = one open/day** (DB-enforced; `openToday` is idempotent + race-safe). AI reward via `buildSurprisePrompt`. `SURPRISE_OPEN` activity. |

### New notification types
`streak_reminder`, `streak_milestone`, `achievement_unlocked`, `bucket_completed`, `surprise_ready`, `love_letter_received`, `sleep_reminder` — added to `notification.model` enum + `notification.service` `URL_FOR_TYPE`.

### New collections
`Engagement` (1/couple), `ActivityLog`, `Achievement`, `BucketItem`, `LoveLetter`, `CoachConversation`, `SleepLog`, `SurpriseBox`, `StoryChapter`. No migration required — all created on first write; `getOrCreateEngagement` upserts the per-couple doc.

### Frontend surfaces
New services (one per domain): `engagement`, `bucket`, `letters`, `coach`, `sleep`, `surprise`, `story`. New routes: `/bucket-list`, `/sleep`. New **AI Center tabs**: `Ask AI` (CoachChat) + `Letter` (LoveLetterGenerator) — existing tabs untouched. Dashboard adds SurpriseBox, StreakCard, LoveMeter (replaces the static HealthScoreCard), BucketListCard, SleepCard. Journey adds the Story Timeline section.

---

## Profile Ecosystem (people-centric layer)

Turns the app from chat-centric to people-centric: a rich **Personal Profile**, an enhanced **Relationship Profile**, **Trust Center**, **Relationship Passport**, granular **privacy**, and Instagram-style **avatar navigation**. Built by reusing engagement/health/helpers — **no data duplication**.

### Backend
- **Schema (extended, non-breaking):** `User` gains `coverPhoto`, optional `username` (sparse-unique), and 8 new `privacy` keys (`bio/birthday/sleep/gallery/video/journeyCount/transparency/relationshipGallery` Visibility) on top of the original 6. `Couple` gains `coverPhoto` + `relationshipPhoto`.
- **New collection `GalleryItem`** (`modules/gallery`): `ownerId, coupleId, scope (personal|relationship), type (image|video), url, publicId, caption, visibility`. Cloudinary stream upload (multer memory, `resource_type:auto`), `destroy(publicId)` on delete. Routes `/api/v1/gallery` (`POST`, `GET /`, `GET /relationship`, `GET /stats`, `PATCH/:id`, `DELETE/:id`).
- **New aggregator `modules/profile`** (READ-ONLY, `/api/v1/profile`): `GET me|partner|journey|relationship|trust|passport`. Assembles everything from `getCachedHealth`, `getEngagementForUser`, `couple.helpers`, gallery + mood/memory/message counts. **`/partner` is privacy-aware** via `users/privacy.helper.canPartnerView` (`value !== "private"`). **CoupleCare Journey = COUNT only** (couples the user has been in) — never names/chats/photos of past relationships. Trust Center scores (communication/participation/consistency/transparency) are **deterministic**, CoupleCare-only — no LLM, no external/device tracking.
- `users.uploadPhoto` takes `type:"avatar"|"cover"` (cover = wide transform). `updateProfile` accepts `username`/`coverPhoto`. `PATCH /couples/photos` sets the couple cover/relationship picture (either partner; emits `couple:profile-updated`).

### Frontend
- **`components/common/Avatar`** is the single avatar renderer + nav entry point: tap self → `/profile`, partner → `/partner` (resolves via `useAuth`). Swapped into WelcomeCard (self); ChatHeader/BottomNav already navigate.
- **New services:** `gallery`, `profile`. New routes (lazy): `/privacy` (no couple needed), `/relationship`, `/passport`, `/trust-center`. `/profile` replaced with the full Personal Profile; `/partner` rewritten to the rich privacy-aware view.
- **Components:** `gallery/{GalleryGrid,MediaViewer,PersonalGallery}` (MediaViewer remounts via `key={item._id}` — no reset effect), `profile/{ProfileHeader,ProfileStats,JourneyCard}`, `passport/PassportCard`. Gallery images are client-compressed (`utils/compressImage`); video accepted up to 25 MB.
- Privacy page = 12 granular `PrivacySelect` controls (Only Me / Partner / Shared), persisted via `PATCH /users/privacy`.
