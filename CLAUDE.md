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

# Email — multi-provider, env-routable (see "Email transport" gotcha below)
EMAIL_FROM=                          # must be a VERIFIED sender for the chosen provider
EMAIL_PROVIDER=auto                  # auto | mailjet | sendgrid | brevo | smtp | smtp_first
MAILJET_API_KEY=                     # recommended on Render (HTTP API)
MAILJET_SECRET_KEY=
SENDGRID_API_KEY=                    # optional HTTP provider
BREVO_API_KEY=                       # optional HTTP provider / fallback
# SMTP_HOST= SMTP_USER= SMTP_PASS=   # SMTP path — does NOT work on Render (ports blocked)

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Web push (optional — gracefully disabled with a warning if unset)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=                       # e.g. mailto:you@domain.com
```

---

## Backend Architecture (`backend/src/`)

**Entry point**: `server.js` creates an HTTP server, connects MongoDB, starts Socket.io, and kicks off the cron notification scheduler. `app.js` configures Express middleware and mounts all routes under `/api/v1`.

**Module pattern** — each feature in `src/modules/<name>/`:
- `*.model.js` — Mongoose schema
- `*.service.js` — Business logic
- `*.controller.js` — HTTP handler (calls service, sends JSON)
- `*.routes.js` — Express router (auth middleware, validators, rate limiting)

**Modules**: `auth`, `users`, `couples`, `chat`, `moods`, `memories`, `histories`, `dashboard`, `ai`, `notifications`, `security`, `calls`, `push` (web push), `engagement` + V2 features (`bucket`, `letters`, `coach`, `story`, `sleep`, `surprise`), Profile Ecosystem (`gallery`, `profile`), and `moments` (private stories)

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
- **`APP_URL` must be the FRONTEND origin** (Vercel) — it builds email links (`/reset-password?token=`, `/verify-email?token=`). `EMAIL_FROM` must be a sender verified with the active provider or OTP/reset emails silently fail. `forgotPassword` swallows email errors and always returns generic success (no email enumeration); check server logs for `[email]` failures.
- **Email transport is multi-provider + env-routable** (`security/email.transport.js`). `sendEmail` tries providers in order and resolves on the first that delivers; `EMAIL_PROVIDER` picks the order (`auto` = Mailjet → SendGrid → Brevo → SMTP, first *configured* wins; or pin one: `mailjet`/`sendgrid`/`brevo`/`smtp`/`smtp_first`). **Render blocks outbound SMTP ports** — use an HTTP-API provider (Mailjet/SendGrid/Brevo) in production, never raw SMTP. `email.service.js` builds the OTP/reset messages and calls this transport. Startup logs a masked `emailConfigSummary` (provider order + which keys are set). Each provider is "skipped" when its keys are unset, so leaving extra `*_API_KEY`s empty is safe.
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

---

## CoupleCare Moments (Instagram-style stories, private to the couple)

Ephemeral, live-captured "Moments" shared **only** between the two partners (no feed/followers/explore). Reuses the whole existing spine — **no new SDK, no second socket, no health-algorithm changes.**

### Backend (`modules/moments/`)
- **Models:** `Moment` (couple-scoped, author-owned; Cloudinary `mediaUrl`+`publicId`, `type photo|video|voice`, `privacy partner_only|private|save_journey`, `views[]`+`firstViewedAt`, `reactions[]`, `aiSuggestion{text,moods}`, `expiresAt`, persistence flags `kept|savedToJourney|memoryId|highlightId`, `coupleMomentId`). `MomentHighlight` (co-owned named collection: `title,emoji,coverUrl,momentIds[]`). **No TTL index** — expiry is a save-aware cron (kept/highlighted/journey moments survive; `save_journey` auto-creates a Memory; the rest have the Cloudinary asset destroyed).
- **Service** (`moment.service.js`) is the single owner: `getCircles`, `createMoment`, `markViewed` (atomic, race-safe single notify), `reactToMoment`, `keep`, `saveToJourney` (→ `memory.service.createMemory`, which feeds health + engagement), `deleteMoment`, `expireMoments`, couple-moment detect/merge, highlights CRUD, `listForProfile`.
- **Cloudinary**: same multer-memory → `upload_stream` pattern as `gallery`/`chat.media` (controller holds the buffer; service stays storage-agnostic). Photos compressed client-side; video/voice capped at **20s** (client auto-stop + server re-checks Cloudinary's measured duration). Limits in `moment.constants.js` (10 Moments/day, sizes, reaction set, 4h couple-moment window).
- **Socket**: `moment.socket.registerMomentSocket(socket)` is called inside `chat/socket.js`'s connection handler (the ONE shared socket). Events: client `moment:view`/`moment:react`; server emits `moment:new|viewed|reaction|deleted|expired|couple-available|couple-created` via `realtime.emitToUser` (per-user, no rooms).
- **Engagement**: new `ACTIVITY_TYPES.MOMENT` (XP 12) through `recordActivity` (streak/XP/achievements `first_moment`,`moment_maker`). Health contribution is intentionally indirect (XP + the Journey Memory on save) — the deterministic `health.service` algorithm is unchanged.
- **Notifications**: new types `moment_new|moment_viewed|moment_reaction|couple_moment_ready` (enum + `URL_FOR_TYPE` → `/moments`). Real-time + push come free via `createNotification`.
- **Routes** `/api/v1/moments`: `GET /circles`, `POST /` (capture upload), `PATCH /:id/view`, `POST /:id/react`, `PATCH /:id/keep`, `PATCH /:id/save-journey`, `DELETE /:id`, `GET|POST /couple[/candidate]`, highlights under `/highlights`, `GET /profile/:ownerId`. Expiry cron runs every 10 min (`notification.scheduler`).

### Frontend
- **Service** `moments.service.js`; socket emitters `emitMomentView`/`emitMomentReaction` added to `socket.service.js`. Live state via `hooks/useMoments` (rides the shared socket through `useCoupleEvents`).
- **Components (`components/moments/`)**: `MomentsBar` (dashboard story row: self + partner circles + couple-moment offer), `MomentCircle` (animated gradient ring when unseen, faded when seen), `MomentViewer` (full-screen: per-moment progress bars driven **imperatively via a ref** for 60fps, tap=next/prev, hold=pause, swipe-down=close, swipe-up/Reply→chat, reactions, view receipt, author menu), `MomentCapture` (live-capture only — getUserMedia/MediaRecorder, no gallery picker; photo/video/voice; progress; post-upload AI mood suggestion), `MomentReaction`, `MomentHighlights`, `ProfileMoments` (Feature 17 grid; renders null when empty). Route `/moments` (lazy) hosts the bar + highlights; the bar is also injected at the top of the Dashboard. Reply sends a normal chat message via `emitMessageSend` then navigates to `/chat`.
- **Lint**: these files obey the React-compiler rules — mount fetches use the `.then(active-flag)` pattern, impure handlers (`Date.now`, getUserMedia) are wrapped in `useCallback`, and the viewer's progress bar is updated through a DOM ref (never per-frame React state).

---

## ❤️ Daily Couple Moment (auto daily recap → relationship diary)

Builds **on top of** Moments (does not redesign it). When BOTH partners share at least one **non-private** Moment on the same UTC calendar day, the app auto-creates a **lasting** `DailyCoupleMoment` — a recap that turns every shared day into a permanent timeline entry and is the data foundation for the Monthly / Yearly replays. Reuses the whole spine — **no new SDK, no second socket, no change to the deterministic health algorithm.**

### Backend (`modules/dailyMoment/`, mounted `/api/v1/daily-moment`)
- **Model `DailyCoupleMoment`** — ONE doc per couple per day, **unique `{coupleId, day}`** (the race guard). Denormalised snapshot: `authorIds`, `momentIds`, `counts{moments,photos,videos,voices}`, `messageCount`, `topMood` (mode of both partners' moods that day), `streak`, `xpAwarded`, `coverUrl`, `ai{summary,status,generatedAt}`, `finalized`. No binary in Mongo (only Moment refs + a Cloudinary cover URL).
- **`moment.constants` / `dayKey` alignment** — `day` is UTC `YYYY-MM-DD`, identical to `engagement.service.dayKey`, so the two systems agree on "the same day".
- **Service (`dailyMoment.service.js`) is the single owner.** `ensureForDay(coupleId, triggeringUserId, day?)` is the idempotent + race-safe engine: it's fired **fire-and-forget from `moment.service.createMoment`** (lazy `require` to avoid the moment↔dailyMoment circular load) and **must never throw back into the upload path**. It checks both partners posted, upserts the doc (swallows E11000), refreshes stats, and — **only when the create wins the race** — records engagement, notifies both, emits, and kicks off the background AI summary. Reads: `getToday` (dashboard recap or the share-together encouragement state), `getTimeline`, `getByDay`, `getById`, `getMonthlyReplay`, `getYearlyReplay`.
- **AI summary (`dailyMoment.ai.js`)** — `generateDailySummary` reuses the existing Groq engine + `ai.prompts.buildDailyMomentSummaryPrompt`. **Background + best-effort + hard-capped at 60 words** (`clampWords`), with a deterministic `fallbackSummary` so the card is never empty. Persisted to `ai.summary` and broadcast via `daily-moment:updated`.
- **Engagement** — new `ACTIVITY_TYPES.DAILY_MOMENT` recorded on creation (for achievements `first_daily_moment`, `daily_devotion`). **XP is NOT double-counted**: the authoritative XP is the engagement system's **day-based** mutual reward (`DAILY_XP_BOTH`=10), which already equals the card's "+10"; the new activity type can't inflate a day-based total. `xpAwarded` on the doc is display parity only.
- **Notifications** — new type `daily_moment_ready` (model enum + `URL_FOR_TYPE` → `/our-day`); real-time + web-push come free via `createNotification`.
- **Journey / Story integration is read-only assembly** — `story.service.getChapters` adds a `daily_moment` chapter kind from the `DailyCoupleMoment` docs (no duplicated Memory writes).
- **Dashboard** — `dashboard.service` embeds `dailyMoment` (today's recap/encouragement) so the card renders from the one dashboard fetch.
- **Cron** — `notification.scheduler` runs `finalizeYesterday` at **00:20 UTC**: freezes yesterday's recaps (`finalized`) and **reconciles** any couple that qualified but whose live trigger was missed (restart/race), so the timeline never gaps.
- **Replays** — `getMonthlyReplay(year,month)` / `getYearlyReplay(year)` aggregate over the daily docs (totals, most-common mood, longest streak, biggest achievement; yearly adds happiest month + best trip + favourite memory from `Memory`). Pure read aggregations — fast, cache-friendly.

### Frontend
- **Service** `dailyMoment.service.js`; live state via `hooks/useDailyMoment` (rides the shared socket through `useCoupleEvents`: `daily-moment:ready` / `daily-moment:updated` / `moment:new`). The dashboard seeds the hook from the payload (`<DailyMomentSection initial={...}>` renders only post-load) so there's **no extra fetch**.
- **`components/dashboard/DailyMomentCard`** — the "❤️ Our Day" card: recap state (cover wash, stat chips, AI line, glow) and the share-together nudge state (who-posted dots). Pure presentational.
- **`pages/OurDay/OurDayPage` (route `/our-day`, lazy)** — timeline of past recaps, full day recap (`?day=YYYY-MM-DD`: moments grid + AI), and the monthly/yearly **Replay** bottom-sheets. Theme-aware, glassmorphism, `prefers-reduced-motion` safe.
- **Lint** — obeys the React-compiler rules: child fetchers use `key={day}`/`key={scope}` remounts + the `.then(active-flag)` pattern (no synchronous `setState` in effects).
- **Memory Book (Feature 11)** is intentionally a *future* extension that composes the SAME sources — `story.service` chapters (which now include daily moments) + `DailyCoupleMoment` docs — into an exportable book; the data foundation is in place, the export/render is not yet built.

---

## 🌱❤️🌤 Relationship Lifecycle Platform (3 adaptive stages)

The whole app adapts to ONE derived value, the user's **lifecycle stage**, so partner-less users are never stranded at an onboarding wall. **No isolated features, no duplicated collections** — it reuses the engagement/health/AI/Cloudinary/socket spine.

### The Stage Engine (the spine)
- **`modules/users/stage.helper.js` → `resolveStage(user)`** is the single source of truth: `growing` (active `currentCoupleId`), `healing` (no current couple but ≥1 `relationshipStatus:"broken_up"` couple — most-recent wins), `preparing` (never matched). Past relationships are found by querying the existing `Couple` collection (**archive-in-place — no archive collection**).
- `auth.controller.getCurrentUser` ships `stage` + `stageMeta` on `/auth/me`, so the frontend reads `user.stage` with **zero extra fetch**. Client mirror: `utils/stage.js` + `hooks/useStage.js`.
- **Routing**: `/dashboard` is OUT of `RequireCouple` and adapts per stage (`pages/Dashboard/Dashboard.jsx` is a thin switch → `GrowingDashboard` [= the original Stage-2 dashboard, unchanged] / `PreparingDashboard` / `HealingDashboard`). `RequireCouple` now sends solo users to their **stage home** (`/dashboard`), never the onboarding wall. `BottomNav` is config-driven + **stage-aware** (growing tabs unchanged).

### Stage 1 — 🌱 Preparing For Love (`modules/growth/`, solo)
- **User-scoped** XP/streak/achievements live on the **User doc** (`personalXp`, `growthStreak`, `growthAchievements`) — the couple `Engagement` is `coupleId`-keyed and can't hold solo progress. `growth.engagement.recordGrowthActivity(userId, type, meta)` is the single entry point (never throws); **XP is once-per-type-per-day, caller-gated via `meta.awardXp`** (the engine no longer self-dedupes — callers know if it's the first occurrence). Reuses `engagement.constants.levelForXP`.
- `GrowthJournal` (journal/reflection/gratitude) + `GrowthChallenge` (deterministic daily pick, unique `{userId,day}`) collections. `growth.service` owns journal CRUD, daily challenge, the 3 self-knowledge quizzes (readiness / love-language / attachment → cached on User), solo mood summary, and deterministic daily content (quote/prompts in `growth.constants`).
- Routes `/api/v1/growth` (`GET /`, `/tip`, `/mood-summary`, journal CRUD, `/challenge/today|complete`, `/quizzes`, `/readiness`, `/love-language`, `/attachment`).
- AI: `ai.context.personal.buildPersonalContext` (the couple context builder throws without a couple) + `buildPrepCoachPrompt`/`buildDailyTipPrompt`; `growth.ai.getDailyTip` (best-effort, word-capped, deterministic fallback).
- Frontend: `services/growth.service`, `components/growth/*` (shared `growth.css`), full `PreparingDashboard`, pages `/growth` (GrowthHub), `/journal`, `/ai-coach` (PrepCoachPage). Live via `useCoupleEvents("growth:update")`.

### Stage 2 — ❤️ Growing Together (unchanged)
The entire existing couple app. The only change is that the dashboard/nav now come via the stage switch; `GrowingDashboard` is the original `Dashboard.jsx` body verbatim.

### Stage 3 — 🌤 Growing After Goodbye (`modules/lifecycle/`, solo)
- **Relationship Summary is archived in place on the `Couple` doc** (`endedAt`, `summary` [denormalised stats blob], `aiReflection{text,status,generatedAt}`, `summaryFinalized`). `lifecycle.summary.service.computeRelationshipSummary(coupleId)` is **deterministic aggregation** over existing collections (messages/memories/moments/gallery/bucket/story/achievements/longest-streak/XP/mood-trend/most-active-month/favourite-memory/duration) + a **background ≤80-word AI reflection** (`lifecycle.ai`, deterministic fallback). Fired **fire-and-forget from `couple.service.unmatchPartner`** — **must never throw into the unmatch path**.
- **Private Growth Report** (`GrowthReport` model in `lifecycle.model`) — belongs ONLY to the user, **never shared with any partner** (enforced in code, not a setting). Questionnaire → AI report.
- **CoupleCare Journey = COUNT only** (`lifecycle.service.getJourney`) — never past-partner identities/chats/media.
- Routes `/api/v1/lifecycle` (`GET /summary`, `/journey`, `/growth-report[/questions]`, `POST /growth-report`).
- Frontend: `services/lifecycle.service`, full `HealingDashboard` (gentle tip, healing progress, mood recovery, reflection, challenge, **recovery coach**, summary teaser, growth report, reconnect), pages `/summary` (RelationshipSummaryPage), `/growth-report` (GrowthReportPage). Healing nav: Home · Heal · Coach · Reflect · Profile. `AppLayout`'s `couple:unmatched` handler reloads the user → stage flips to healing **live**.

### Stage-aware coach (one module, three personas)
`coach.service` is now **stage-aware** (`resolveCoachPersona`): growing → couple Relationship Coach (unchanged), preparing → Preparation Coach, healing → Recovery Coach. `CoachConversation.coupleId` is now **optional** (null for solo threads). The same `CoachChat` component is reused everywhere — only copy/suggestions differ (`PrepCoachPage` swaps them and is stage-aware itself).

### Privacy
`User.privacy` gains opt-in lifecycle keys (`summaryVisibility`, `healingVisibility`, `recoveryVisibility`, `aiReflectionVisibility`, `loveLanguageVisibility`, `attachmentVisibility`; `journeyCountVisibility` reused). Whitelisted in `users.controller` `PRIVACY_KEYS`; surfaced in the Privacy page **Lifecycle** section. The Growth Report is **hard-private** regardless of settings.

### Crons / notifications
Daily growth nudge (6pm) for solo users with a live `growthStreak` who haven't acted today. New notification types: `growth_reminder`, `journal_reminder`, `challenge_ready`, `readiness_progress`, `relationship_ended`, `summary_ready`, `healing_checkin`, `reconnect_available` (+ `URL_FOR_TYPE`).

---

## 🧠 CoupleCare Intelligence Engine (CCIE) — `backend/src/intelligence/`

All scoring lives in ONE configurable, deterministic, explainable, event-driven layer. Algorithm logic lives ONLY here — domain modules call the facade, never re-implement scoring. **Every score is reproducible + traceable; no random values; the couple Relationship Health stays identical for both partners.**

### Layout
- **`config/`** — `weights.js` (per-engine component weights — **no engine hardcodes a weight**; today's 7 health weights are the defaults, new inputs are ADDITIVE), `thresholds.js` (level cutoffs, saturation denominators, anti-gaming caps, confidence anchors), `rules.js` (suggestion map + sentiment lexicon + emoji valence), `scenarios.js` (context scenarios + modifiers), `index.getConfig()` (frozen; test override via `getConfig({weights})`).
- **`lib/`** — `normalize.js` (pure, **`now`-injectable** math — reproducible in tests), `sentiment.js` (deterministic lexicon scorer), `derive.js` (responsiveness/sleep-sync/conflict-recovery/activity-vs-baseline), `features.js` (**the ONLY DB layer** — `gatherHealth/Emotion/MemoryFeatures`; every extra query is guarded + null-degrading).
- **`engines/`** — each = a pure `score(features, cfg)` (DB-free → unit-testable) → `{ score, level, confidence, breakdown, factors, reasons, trend }`: `relationshipHealth` (couple, identical both partners — classic 7 ported VERBATIM + additive calls/video/voice/stories/sleep/bucket/aiCoach/achievements/responsiveness/conflictRecovery/trust/growth, each counted only when data exists = graceful degrade), `emotion` (per-user multi-signal: mood+chat sentiment+tempo+journal+sleep; weekly/monthly; **never claims certainty**), `trust` (couple — ports the Trust Center sub-scores + supportiveness + overall), `growth` (couple — lifetime accomplishments + velocity), `memory` (deterministic daily/weekly/monthly/yearly timeline assembly).
- **`meta/`** — `context` (scenario detection + component MODIFIERS applied before weighting), `confidence` (0–100 from data sufficiency — additive, never changes the score), `explainability` (top +/- contributors + suggestions vs last snapshot), `antiGaming` (`sanitizeMessages/Moods` — burst/dup collapse, per-day caps, low-content gating — no-op on clean data so genuine couples are unchanged), `learning` (self-history trend via `IntelSnapshot` — compares a couple/user to its OWN past, never cross-couple).
- **`events/`** — `bus.js` (in-process EventEmitter + `publish()`, best-effort), `events.js` (constants), `subscribers.js` (debounced per-couple incremental recompute, registered at server boot).
- **`intelSnapshot.model.js`** — the time-series (`{subjectId,scope,engine,day,score,confidence,breakdown,factors,context}`, unique `{subjectId,engine,day}`).
- **`index.js`** — the facade: `getHealth/getTrust/getGrowth/getEmotion/getMemory`. Orchestrates gather → score → self-history trend → snapshot.

### Integration (contracts preserved)
- `couples/health.service` is now a **thin adapter**: delegates to `intelligence.getHealth`, owns the Couple cache (`healthScore/Level/Breakdown` + additive `healthConfidence/Context/Factors`), broadcasts. Output is `{score,level,breakdown}` + additive CCIE fields. The 5 call-sites are untouched.
- `profile.service.getTrustCenter` delegates scoring to `trust.engine` (built from data it already loads — **zero extra queries**, identical sub-scores; supportiveness+overall added).
- **Event system LIVE**: `engagement.recordActivity` (the universal couple choke-point) + completed calls `publish()` → debounced health recompute, so a chat/call/goal/mood now updates the Love Meter live. Publishing is best-effort and never breaks the triggering action.
- **Read-only API** `/api/v1/intelligence/health|trust|growth|emotion|memory/:period|config` (API only, **no UI**). `/config` exposes the live weights/thresholds for full transparency.
- **Nightly cron (02:00 UTC)** recomputes every active couple's health (cache + daily `IntelSnapshot`) so learning/memory trends stay fresh on quiet days.

### Tests
`npm test` → `node --test` (built-in, **zero new deps**), 32 specs in `intelligence/__tests__/` (pure functions, fixed-clock fixtures, no DB): determinism, **partner-order invariance** (swap A/B ⇒ identical health/trust), golden values, confidence monotonicity, anti-gaming (spam ≤ genuine variety), context detection, learning trend, graceful degrade, the brief's edge cases (inactive/new/long-distance/busy/spam). Adding a test: pass a fixed `now` and call the engine's pure `score()`.

### Gotchas
- **Determinism is sacred**: no LLM in any SCORE path (LLM only narrates memory text); couple engines use couple-symmetric inputs + sorted partner order. Same couple state + same day ⇒ same output. Don't introduce `Date.now()` inside an engine — take `now` from `features`.
- **Weights are config-only**: tune `config/weights.js`; never hardcode in an engine. New health inputs are additive (normalised by the active-weight sum) so a data-less couple scores exactly as the original 7-component formula (regression-free), while richer couples blend new signals in (scores shift by design).
- **`features.js` is the only DB layer** — keep engines pure. Guard every new query so a missing collection degrades a component to null, never crashes scoring.

---

## 🛡 Trust & Security Center (account security)

A dedicated account-security surface (Instagram/Google/Apple-style), distinct from the couple-facing `/trust-center`. Reachable **Profile → Settings → Trust & Security** (and a Profile quick link). Route `/security` (lazy, in the AppLayout group — reachable **without a partner**).

### The one structural change: sessions make the JWT revocable
The JWT was stateless (`{ userId }`); logout was client-only, so "log out this device / all others" was impossible. Now:
- **`utils/jwt.generateToken(userId, sid)`** embeds an optional session id (`sid`). **Tokens minted before this (no `sid`) are grandfathered** — never force-logged-out on deploy.
- **`middleware/authMiddleware`** — if a token has `sid`, it must map to an ACTIVE (non-revoked) `Session`, else **401**; it also throttled-touches `lastActive`. No `sid` ⇒ legacy path, allowed. jwt lib errors are normalized to 401.
- **`modules/security/session.model.js`** (`Session`) — one row per login: `tokenId` (= JWT `sid`), device/deviceType/browser/os (UA-parsed), `ip`(server-only)/`ipMasked`/`location` (offline **geoip-lite**), `lastActive`, `revokedAt`/`revokedReason`. `session.service` owns create/list/revoke/touch + new-device detection.
- **`modules/security/request.context.js`** — `buildContext(req)` → device/ip-mask/geo, from `user-agent` + `X-Forwarded-For` (app has `trust proxy` set). Deps: `ua-parser-js`, `geoip-lite`.
- Login (`auth.service.loginUser`) + OTP verify (`verifyRegistration`) now take a `ctx` and call `issueSessionToken` (resilient: if session create fails, falls back to a grandfathered token with no `sid` — login never breaks). `changePassword` **revokes all OTHER sessions**; `resetPassword` **revokes ALL** (leaked-token defense) and both set `User.passwordChangedAt`.

### Security audit log
`SecurityEvent` (append-only) + `securityEvent.service.logEvent` (**best-effort, never throws**). Logged: login / failed_login / new_device / logout / password_changed / password_reset / email_verified / otp_verified / verification_sent / pair_connected / partner_unmatched / session_revoked / sessions_revoked_all. Pair/unmatch events are logged from `couple.service` (lazy require, swallowed).

### API (`/api/v1/security`, all `authenticateUser`)
`GET /overview` (email/verified/2FA-future/created/passwordChangedAt/activeSessions + **deterministic trust score**), `GET /sessions`, `GET /activity?limit`, `POST /logout` (revoke current), `POST /sessions/logout-others` (password), `DELETE /sessions/:id` (password), `POST /delete-account` (password). Read endpoints use a looser `readLimiter`; password/destructive ones stay on `authLimiter`. Password policy enforced server-side (`assertStrongPassword`: 8+ / upper / lower / number / special — **weak rejected**).

- **Trust score** is deterministic: base 100, −30 unverified email, −8 no-2FA (the standing nudge → clean account = **92%**), −8/−7 for >3/>5 sessions, −10 password >180d. Returns `{score, level, checks[]}`.
- **Delete account** = password-confirmed hard delete: soft-unmatch partner (keeps co-owned couple data), revoke+delete sessions, delete SecurityEvents / PushSubscriptions / PendingRegistration, then the User.

### Frontend
- `services/security.service.js` gains `getSecurityOverview/getSessions/getSecurityActivity/changePassword/revokeSession/logoutOtherDevices/logoutCurrentSession/deleteAccount`.
- `pages/Security/SecurityCenter` (all 10 sections: trust hero, account security, change-password w/ strength meter, "Where you're logged in" + device mgmt, lazy account activity, recovery, privacy quick-links, danger zone). Components `components/security/{PasswordStrength,SessionCard,TrustScoreRing,ConfirmDialog}` + `utils/passwordStrength.js` (shared 5-rule model mirroring the backend). Activity is **lazy-loaded on expand**; ConfirmDialog is **mounted only when open** (fresh state, no reset effect).
- **`AuthContext.logout` now revokes the current session server-side** (best-effort, then clears the token) — no longer a pure client wipe.
- **axios response interceptor**: an authenticated **401** (e.g. this session was revoked on another device) clears the token and bounces to `/login` — so a revoked token can't linger. Auth endpoints (login/otp/reset) are excluded.
- **Known limit**: the Socket.io handshake still uses plain `jwt.verify` (no session check). A revoked device's live socket survives until it drops, but its next REST 401 clears the token, so it can't re-establish. Acceptable; not wired to avoid churn on the one shared socket.
