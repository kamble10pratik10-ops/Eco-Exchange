## Exo Exchange – OLX-style Buy/Sell Platform

Fullstack project using **FastAPI (Python)** for the backend and **React + Vite** for the frontend, where users can post and browse second‑hand product listings.

### Tech Stack
- **Backend**: FastAPI, SQLAlchemy, SQLite, JWT auth
- **Frontend**: React + Vite + TypeScript, CSS (custom)

### Project Structure
- `backend/` – FastAPI app
  - `main.py` – API entrypoint (auth + listings endpoints)
  - `models.py` – SQLAlchemy models (`User`, `Listing`)
  - `schemas.py` – Pydantic schemas for requests/responses
  - `database.py` – SQLite engine, session, base
  - `auth.py` – Password hashing + JWT helpers
- `frontend/` – Vite React app
  - `src/App.tsx` – Landing page and layout shell
  - `src/App.css` – Main UI styling

### How to Run

#### 1. Backend (FastAPI)
From the project root (`Exo-Excahnge`):

```bash
.\venv\Scripts\activate
cd backend
uvicorn backend.main:app --reload
```

The API will run at `http://127.0.0.1:8000`.

Useful endpoints:
- `GET /health` – health check
- `POST /auth/register` – create user
- `POST /auth/token` – login, returns JWT
- `GET /listings` – list active listings
- `POST /listings` – create listing (requires Bearer token)

#### 2. Frontend (React + Vite)

```bash
cd frontend
npm install        # already done once, repeat only if needed
npm run dev
```

Open the shown URL (usually `http://localhost:5173`) to see the basic Exo Exchange UI.

### Next Steps You Can Build
- Hook React to `/listings` to show real data from FastAPI.
- Add forms for login/register and posting listings.
- Add search/filter by city, category, and price.
- Add image upload support and messaging between buyers and sellers.

