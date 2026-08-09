# Daily Wellness Check-In Tracker

A modern, full-stack Daily Wellness Check-In web application built with **React**, **Vite**, **Node.js**, **Express**, and **SQLite**. Designed with secure-at-the-basics authentication, per-user data isolation, rate limiting, account lockout, and a sleek dark glassmorphism health dashboard.

---

## Key Features

- 🔒 **Secure Authentication**: Password hashing with `bcryptjs` (cost factor 10), server-side session management (`express-session` with SQLite store), `httpOnly` cookies, rate limiting, account lockout after 5 failed login attempts, and generic error messages against user enumeration.
- 🛡️ **Per-User Data Isolation**: Every database operation strictly scopes queries to `req.session.userId`, preventing unauthorized cross-user data access.
- ⚡ **Atomic SQL Upserts**: Daily check-ins use `INSERT ... ON CONFLICT(user_id, date) DO UPDATE` to atomically record or update daily stats without creating duplicate records.
- 📊 **Real-Time Score Calculation**: Pure function calculating daily wellness scores (0–100) based on weighted metrics:
  - **Sleep Hours** (40% weight, optimal 7–9h window)
  - **Mood Rating** (30% weight, 1–10 scale)
  - **Energy Level** (30% weight, 1–10 scale)
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

## Deploying on Render

This app is easiest to deploy as a single Render **Web Service** for the backend plus built frontend assets, because the client currently calls `/api` with a relative base path.

### Required configuration

- **Node version**: Use Node 18 or newer.
- **Session secret**: Set `SESSION_SECRET` to a long random value in Render.
- **CORS origin**: Set `CORS_ORIGIN` to `https://daily-wellness-tracker-frontend.onrender.com`.
- **SQLite file path**: Set `DATABASE_PATH` to a persistent mounted disk path such as `/var/data/wellness.db`.
- **Persistent disk**: Attach a Render Disk if you want check-ins and users to survive restarts. The default ephemeral filesystem will lose the SQLite file when the service redeploys.

### Render service settings

1. Create a new **Web Service** from this GitHub repo.
2. Set the **Root Directory** to `server` if the backend is the service entrypoint.
3. Use the backend install command `npm install`.
4. Use the backend build command only if you add one; otherwise leave it empty.
5. Use the start command `npm start`.
6. Add environment variables:
   - `NODE_ENV=production`
   - `SESSION_SECRET=<strong-random-secret>`
   - `CORS_ORIGIN=https://daily-wellness-tracker-frontend.onrender.com`
   - `DATABASE_PATH=/var/data/wellness.db` if you mount a disk there

### Frontend deployment options

1. **Recommended**: serve the built client from the backend so the browser and API share one origin.
   - Build the client with `npm run build` inside `client`.
   - Serve the generated `client/dist` folder from the backend.
   - Keep the client API calls on `/api`.
2. **Alternative**: deploy the client as a separate Render static site.
   - Set `VITE_API_BASE_URL` in the client environment to `https://daily-wellness-tracker.onrender.com/api`.
   - The client now reads that variable in `client/src/api.js`, and falls back to `/api` for local development.

### Important caveat

Keep the backend Render service root set to `server` so it runs the server package and the new `src/index.js` entrypoint.

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
| `POST` | `/api/checkin` | Atomic upsert checkin (`date`, `sleep_hours`, `mood`, `energy`) | Yes |
| `GET` | `/api/checkin/today` | Fetch checkin for today or target `?date=YYYY-MM-DD` | Yes |
| `GET` | `/api/checkin/last7days` | Fetch 7-day trend history ending on `?date=YYYY-MM-DD` | Yes |

---

## Security Implementation Summary

- **BCrypt Hashing**: Passwords are hashed with `bcryptjs` (salt cost factor 10) prior to insertion into SQLite. Plaintext passwords are never stored or logged.
- **Account Lockout**: After 5 consecutive failed login attempts, the user's account is locked out for 15 minutes (`locked_until`).
- **Generic Error Responses**: Failed logins return an identical `"Invalid email or password"` message to prevent account enumeration.
- **Strict Input Validation**: Zod schemas sanitize and validate types, ranges, and formats for email, passwords, sleep hours (0-24), mood (1-10), energy (1-10), and dates.
- **CORS & Cookies**: Configured with `credentials: true` and `httpOnly: true`, `sameSite: 'lax'`, and `secure` in production.

---

## Verification & Testing

Run the automated integration test script against the running server:
```bash
cd server
node test_api.js
```
The script validates user registration, session authentication, atomic check-in upserts, 7-day trend calculations, future date rejection, and logout.

---

## License

MIT License. Developed for Daily Wellness Tracking.
