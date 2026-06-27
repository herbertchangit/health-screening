# Talk with Doc

Talk with Doc is a cross-platform health-screening event and appointment application. Patients can discover events and book doctors, doctors can join events and manage time slots, and administrators can manage users, doctors, events, appointments, and news.

The repository contains:

- `frontend/` — Expo/React Native application for Android, iOS, and web
- `backend/` — FastAPI HTTP API backed by MongoDB
- `*_test.py` and `test_result.md` — API test scripts and historical test notes

See [Architecture](docs/ARCHITECTURE.md) for the system design, data model, runtime flows, security boundaries, and known constraints.

For hosting setup without VPS or Docker, environment variables, HTTPS notes, and backup guidance, see [Deployment Guide](docs/DEPLOYMENT.md).

## Local configuration

The backend reads `backend/.env`:

```dotenv
MONGO_URL=mongodb://localhost:27017
DB_NAME=talkwithdoc_db
JWT_SECRET=replace-with-a-long-random-secret
```

The frontend reads this Expo public environment variable:

```dotenv
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

The API URL must be reachable from the target device. On a physical phone, `localhost` refers to the phone, not the development computer.

## Development

Run MongoDB, then start the API from `backend/`:

```bash
python -m pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Start the app from `frontend/`:

```bash
yarn install
yarn start
```

The API health endpoint is `GET /api/health`; interactive OpenAPI documentation is available at `/docs` while FastAPI is running.

## Hosted deployment preview

Use managed hosting instead of maintaining a server:

- MongoDB Atlas or another hosted MongoDB service for the database
- A managed Python web service for `backend/`
- A static frontend host for `frontend/dist`

See [Deployment Guide](docs/DEPLOYMENT.md) for the exact build commands and environment variables.
