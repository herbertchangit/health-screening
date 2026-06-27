# Deployment Guide: No VPS, No Docker

This app can be hosted with managed services only:

- Database: MongoDB Atlas or another hosted MongoDB service
- Backend: managed Python web service
- Frontend: static web hosting

The frontend and backend are deployed separately. The frontend calls the backend through `EXPO_PUBLIC_BACKEND_URL`.

## Recommended deployment shape

```text
User Browser
  -> Static frontend host
  -> Managed Python API host
  -> Hosted MongoDB
```

Example host choices:

- Frontend: Netlify, Vercel, Cloudflare Pages, or similar static host
- Backend: Render, Railway, Heroku-style Python web service, or similar managed app host
- Database: MongoDB Atlas

## 1. Create hosted MongoDB

Create a MongoDB database and copy the connection string.

Example:

```dotenv
MONGO_URL=mongodb+srv://username:password@cluster-name.mongodb.net/?retryWrites=true&w=majority
DB_NAME=talkwithdoc_db
```

Keep the connection string private. Do not put it in frontend environment variables.

## 2. Deploy the backend

Use `backend/` as the backend service root.

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

If your host does not provide `$PORT`, use:

```bash
uvicorn server:app --host 0.0.0.0 --port 8001
```

Backend environment variables:

```dotenv
ENVIRONMENT=production
MONGO_URL=mongodb+srv://username:password@cluster-name.mongodb.net/?retryWrites=true&w=majority
DB_NAME=talkwithdoc_db
JWT_SECRET=generate-a-long-random-secret-at-least-32-characters
SEED_DEMO_USERS=false
CORS_ORIGINS=https://your-frontend-domain.com
```

Generate a JWT secret locally:

```bash
openssl rand -hex 32
```

After deployment, test:

```text
https://your-backend-domain.com/api/health
```

Expected response:

```json
{
  "status": "healthy"
}
```

## 3. Deploy the frontend

Use `frontend/` as the frontend project root.

Set this frontend environment variable:

```dotenv
EXPO_PUBLIC_BACKEND_URL=https://your-backend-domain.com
```

Do not include `/api` in this value. The app adds `/api` automatically.

Build command:

```bash
npm run build
```

Publish/output directory:

```text
dist
```

The repository includes:

- `netlify.toml` for Netlify-style static hosting
- `frontend/vercel.json` for Vercel-style static hosting

Both are configured for Expo web output and single-page app route fallback.

## 4. Configure CORS after frontend URL is known

Once the frontend is live, update the backend:

```dotenv
CORS_ORIGINS=https://your-frontend-domain.com
```

If you use multiple frontend domains:

```dotenv
CORS_ORIGINS=https://app.your-domain.com,https://your-preview-domain.netlify.app
```

Restart/redeploy the backend after changing CORS.

## 5. Production checklist

- `ENVIRONMENT=production`
- Strong `JWT_SECRET` set
- `SEED_DEMO_USERS=false`
- `MONGO_URL` stored only in backend environment variables
- `CORS_ORIGINS` matches the frontend domain exactly
- Frontend `EXPO_PUBLIC_BACKEND_URL` points to the backend domain without `/api`
- HTTPS enabled on both frontend and backend

## 6. Updating the app

Commit and push code changes. Managed hosts normally rebuild automatically from GitHub.

Manual rebuild commands:

Backend:

```bash
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port $PORT
```

Frontend:

```bash
npm run build
```

## 7. Backups

Use your hosted MongoDB provider backup feature. For MongoDB Atlas, enable scheduled backups or snapshots from the Atlas dashboard.

If you export manually from a machine with MongoDB tools installed:

```bash
mongodump --uri="mongodb+srv://username:password@cluster-name.mongodb.net/talkwithdoc_db" --archive=talkwithdoc.archive
```

Restore:

```bash
mongorestore --uri="mongodb+srv://username:password@cluster-name.mongodb.net/talkwithdoc_db" --archive=talkwithdoc.archive --drop
```

## 8. Troubleshooting

- Blank frontend page: confirm the frontend build output directory is `dist`.
- API request fails: confirm `EXPO_PUBLIC_BACKEND_URL` is the backend domain without `/api`.
- CORS error: confirm backend `CORS_ORIGINS` exactly matches the frontend URL, including `https://`.
- Login fails after deploy: confirm `JWT_SECRET` is set and the backend restarted.
- No data saved: confirm `MONGO_URL` points to the hosted database and the database user has read/write permission.
- Photos not showing: uploaded photos are stored in MongoDB as base64 data, so confirm MongoDB data is persistent.
