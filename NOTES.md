# Daily Wellness Check-In — Project Notes & Architecture Overview

## How to Run

### 1. Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 2. Setup & Installation

#### Backend Setup
```bash
cd server
npm install
npm run dev
```
The server will start on `http://localhost:5000` and automatically initialize the SQLite database (`wellness.db`).

#### Frontend Setup (in a separate terminal)
```bash
cd client
npm install
npm run dev
```
The Vite React application will start on `http://localhost:5173`.

---

## Tech Stack
- **Frontend**: React 18, Vite, Lucide React, Modern Vanilla CSS (Glassmorphism design system)
- **Backend**: Node.js, Express 4
- **Database**: SQLite (`better-sqlite3` with WAL mode enabled)
- **Validation**: Zod (backend input schemas)
- **Security & Passwords**: `bcryptjs` (Cost factor 10), `express-session`, `helmet`, `cors`, `express-rate-limit`

---

## Edge Cases Handled
- **Future Dates Rejected**: Backend Zod & date validation rejects check-in attempts for future dates.
- **Data Validation & Sanitization**: Sleep hours (0-24), mood (1-5), and energy (1-5) are strictly validated with Zod. Malformed or out-of-range inputs return clear error responses.
- **Atomic Upserts**: Duplicate check-in submissions for the same date overwrite existing entries atomically using SQL `ON CONFLICT(user_id, date) DO UPDATE`, preventing duplicate rows.
- **Timezone Safety**: Dates are client-supplied (`?date=YYYY-MM-DD`), preventing discrepancies when users check in near midnight in different time zones.
- **Day Definition**: Local device date is used consistently for "today" in both frontend and backend.
- **7-Day History Gap Representation**: Missing days in the 7-day trend array are rendered as dashes (`-`) with `null` values instead of being treated as `0`.
- **Per-User Isolation**: Every database query filters strictly by `req.session.userId`, enforcing total data isolation between users.
- **Generic Auth Errors**: Login failures return a unified "Invalid email or password" response to prevent user enumeration attacks.
- **Account Lockout**: 5 consecutive failed login attempts trigger a 15-minute lockout (`locked_until`).
- **Rate Limiting**: Stricter rate limits (5 requests per 5 mins) are enforced on the login endpoint.
- **Session Security**: Cookies are configured with `httpOnly`, `sameSite: 'lax'`, and `secure` in production.
- **Server Downtime Graceful Recovery**: Frontend gracefully displays connection error banners if the server is unreachable instead of crashing or showing blank screens.

## Error Codes
- **400 Bad Request**: Invalid date format, malformed payload, out-of-range sleep hours/mood/energy, or future-date submission.
- **401 Unauthorized**: Missing or invalid session for protected routes, or failed login credentials.
- **409 Conflict**: Signup email already exists.
- **429 Too Many Requests**: Login rate limit exceeded.
- **500 Internal Server Error**: Unexpected backend failure.
- **0 Network Error**: Frontend request could not reach the backend at all; shown as a connection error banner.

---

## Design Choices & Architecture
- **Storage**: SQLite (`better-sqlite3`) — provides zero-dependency, ultra-fast embedded relational storage suitable for small to mid-sized structured wellness data.
- **Save Confirmation**: After saving a check-in, the React frontend re-fetches today's check-in and 7-day trend from the backend to ensure the server remains the single source of truth.
- **Day Definition**: Dates are generated from the user's local browser date and explicitly passed to the backend, avoiding server clock mismatch bugs.

---

## AI Usage Disclosure
- AI assistance was used for initial architectural planning, refining security middleware configurations, crafting pure score calculation functions, and optimizing glassmorphism CSS layout components.