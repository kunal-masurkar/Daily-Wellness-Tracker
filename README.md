# Daily Wellness Check-In Tracker

A modern, full-stack Daily Wellness Check-In web application built with **React**, **Vite**, **Node.js**, **Express**, and **SQLite**. Designed with secure-at-the-basics authentication, per-user data isolation, rate limiting, account lockout, and a sleek dark glassmorphism health dashboard.

---

## Key Features

- 🔒 **Secure Authentication**: Password hashing with `bcryptjs` (cost factor 10), server-side session management (`express-session` with SQLite store), `httpOnly` cookies, rate limiting, account lockout after 5 failed login attempts, and generic error messages against user enumeration.
- 🛡️ **Per-User Data Isolation**: Every database operation strictly scopes queries to `req.session.userId`, preventing unauthorized cross-user data access.
- ⚡ **Atomic SQL Upserts**: Daily check-ins use `INSERT ... ON CONFLICT(user_id, date) DO UPDATE` to atomically record or update daily stats without creating duplicate records.
- 📊 **Real-Time Score Calculation**: Pure function calculating daily wellness scores (0–100) using the assignment formula:
   - `wellnessScore = round((sleepFactor × 40) + (mood × 6) + (energy × 6))`
   - **Sleep Hours** contribute through `sleepFactor` with the exact PDF ranges
   - **Mood Rating** and **Energy Level** use the 1–5 scale
- 📈 **7-Day Trend Analysis**: Interactive 7-day visual history cards displaying recorded scores and clear dash (`-`) representations for missing days.
- 🌐 **Timezone-Safe Dates**: Client-supplied date strings (`YYYY-MM-DD`) ensure accurate check-ins across timezones and reject future dates.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Lucide React, Modern Vanilla CSS (Glassmorphic Dark Mode) |
| **Backend** | Node.js, Express 4, Helmet, CORS, Express Rate Limit |
| **Database** | SQLite (`sql.js` WebAssembly engine with automatic disk persistence) |
| **Validation** | Zod (strict schema validation on all inputs) |
| **Security** | `bcryptjs`, `express-session`, HTTP-only cookies, Rate Limiters |

---

## Project Structure

```
Daily-Wellness-Tracker/
├── client/                 # React + Vite Frontend App
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthForms.jsx   # Login & Signup views
│   │   │   └── Dashboard.jsx   # Hero score card, checkin sliders, 7-day trend
│   │   ├── api.js              # Fetch service layer (credentials: include)
│   │   ├── App.jsx             # Main app state & session router
│   │   ├── index.css           # Glassmorphism design system
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # Node.js + Express Backend Server
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js         # requireAuth session guard
│   │   │   └── rateLimiter.js  # Login & general rate limiters
│   │   ├── routes/
│   │   │   ├── auth.js         # Signup, Login, Logout, Me endpoints
│   │   │   └── checkin.js      # Upsert checkin, today, last7days endpoints
│   │   ├── utils/
│   │   │   ├── score.js        # Pure wellness score algorithm
│   │   │   └── sessionStore.js # SQLite session store
│   │   ├── db.js               # SQLite database setup & table schemas
│   │   └── index.js            # Express server entry point
│   ├── package.json
│   └── test_api.js             # Automated API test script
│
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── NOTES.md                # Build plan notes & security trade-offs
└── README.md               # Project documentation
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

---

### Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/kunal-masurkar/Daily-Wellness-Tracker.git
   cd Daily-Wellness-Tracker
   ```

2. **Backend Setup**:
   ```bash
   cd server
   npm install
   npm run dev
   ```
   *The server runs on `http://localhost:5000` and automatically initializes `wellness.db`.*

3. **Frontend Setup** *(in a separate terminal window)*:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   *The Vite frontend client runs on `http://localhost:5173` with automatic `/api` proxying to port 5000.*

---

## API Endpoints Reference

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user (`email`, `password` min 10 chars) | No |
| `POST` | `/api/auth/login` | Authenticate user (Rate limited: 5 attempts/5min) | No |
| `POST` | `/api/auth/logout` | Destroy active session and clear cookie | Yes |
| `GET` | `/api/auth/me` | Fetch active logged-in user profile | Yes |

### Check-In Routes (`/api/checkin`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/checkin` | Atomic upsert checkin (`date`, `sleepHours`, `mood`, `energy`) | Yes |
| `GET` | `/api/checkin/today` | Fetch checkin for today or target `?date=YYYY-MM-DD` | Yes |
| `GET` | `/api/checkin/last7days` | Fetch 7-day trend history ending on `?date=YYYY-MM-DD` | Yes |

---

## Security Implementation Summary

- **BCrypt Hashing**: Passwords are hashed with `bcryptjs` (salt cost factor 10) prior to insertion into SQLite. Plaintext passwords are never stored or logged.
- **Account Lockout**: After 5 consecutive failed login attempts, the user's account is locked out for 15 minutes (`locked_until`).
- **Generic Error Responses**: Failed logins return an identical `"Invalid email or password"` message to prevent account enumeration.
- **Strict Input Validation**: Zod schemas sanitize and validate types, ranges, and formats for email, passwords, sleep hours (0-24), mood (1-5), energy (1-5), and dates.
- **CORS & Cookies**: Configured with `credentials: true` and `httpOnly: true`, `sameSite: 'lax'`, and `secure` in production.

---

## Verification & Testing

Run the automated integration test script against the running server:
```bash
cd server
node test_api.js
```
The script validates user registration, session authentication, atomic check-in upserts, 7-day trend calculations, future date rejection, and logout.

## CI/CD Practice Flow

This repo now supports a simple CI practice loop:

1. Push code and let GitHub Actions run the workflow in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
2. The workflow installs both apps, builds the client, starts the server, checks `/health`, and runs the API smoke test.
3. To test a deployed environment, run the manual smoke workflow in [`.github/workflows/deploy-smoke.yml`](.github/workflows/deploy-smoke.yml) or point the smoke test at your deployed server:
   ```bash
   cd server
   BASE_URL=https://your-deployment-url npm run test:api
   ```

Because the same smoke test works locally and against a deployment, you can reuse one check for both CI and release verification.

---

## License

MIT License. Developed for Daily Wellness Tracking.
