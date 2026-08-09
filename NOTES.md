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
- **Data Validation & Sanitization**: Sleep hours (0-24), mood (1-10), and energy (1-10) are strictly validated with Zod. Malformed or out-of-range inputs return clear error responses.
- **Atomic Upserts**: Duplicate check-in submissions for the same date overwrite existing entries atomically using SQL `ON CONFLICT(user_id, date) DO UPDATE`, preventing duplicate rows.
- **Timezone Safety**: Dates are client-supplied (`?date=YYYY-MM-DD`), preventing discrepancies when users check in near midnight in different time zones.
- **7-Day History Gap Representation**: Missing days in the 7-day trend array are rendered as dashes (`-`) with `null` values instead of being treated as `0`.
- **Per-User Isolation**: Every database query filters strictly by `req.session.userId`, enforcing total data isolation between users.
- **Generic Auth Errors**: Login failures return a unified "Invalid email or password" response to prevent user enumeration attacks.
- **Account Lockout**: 5 consecutive failed login attempts trigger a 15-minute lockout (`locked_until`).
- **Rate Limiting**: Stricter rate limits (5 requests per 5 mins) are enforced on the login endpoint.
- **Session Security**: Cookies are configured with `httpOnly`, `sameSite: 'lax'`, and `secure` in production.
- **Server Downtime Graceful Recovery**: Frontend gracefully displays connection error banners if the server is unreachable instead of crashing or showing blank screens.

---

## Design Choices & Architecture
- **Storage**: SQLite (`better-sqlite3`) — provides zero-dependency, ultra-fast embedded relational storage suitable for small to mid-sized structured wellness data.
- **Save Confirmation**: After saving a check-in, the React frontend re-fetches today's check-in and 7-day trend from the backend to ensure the server remains the single source of truth.
- **Day Definition**: Dates are generated from the user's local browser date and explicitly passed to the backend, avoiding server clock mismatch bugs.

---

## AI Usage Disclosure
- AI assistance was used for initial architectural planning, refining security middleware configurations, crafting pure score calculation functions, and optimizing glassmorphism CSS layout components.

---

## 10-Hour Build Trade-Offs & Future Enhancements
Due to time constraints for this demo-level build, the following simplifications were made:
- **No CAPTCHA**: In a production environment, Cloudflare Turnstile would be integrated on login/signup to mitigate automated bot registrations and credential stuffing.
- **No Multi-Factor Authentication (MFA)**: Would add TOTP-based MFA (`otplib` + `qrcode`) for elevated account protection.
- **No Email Verification / Password Reset**: Self-serve password resets and email verification flows would be added using a transactional email service (e.g. Resend or SendGrid).
- **Single-Instance Session Store**: SQLite-backed session storage is ideal for single-instance deployments. Scaling across multiple backend nodes would require a centralized store like Redis.
- **Render Ephemeral Storage**: On free-tier cloud hosting without persistent disks, the SQLite file resets upon redeployment. A persistent disk attachment (~$1/mo) would provide long-term persistence.
- **Audit Logging**: Would introduce structured event logging for authentication failures, lockouts, and rate limit triggers.
- **Automated Test Suite**: Integration tests (using Jest or Supertest) for the auth flow and check-in endpoints would be added for continuous verification.
