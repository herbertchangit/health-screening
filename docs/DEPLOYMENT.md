# Deployment Guide: VPS with Docker

This is the recommended deployment path when the host supports Docker.

The Docker setup runs:

- `frontend`: Expo web build served by nginx
- `backend`: FastAPI served by Uvicorn
- `mongo`: MongoDB with persistent Docker volume

Browser requests use the same domain:

```text
https://talkwithdoc.jingjiqingcheng.com
https://talkwithdoc.jingjiqingcheng.com/api/health
```

The frontend calls `/api`, and nginx proxies `/api/*` to the backend container.

## 1. VPS requirements

Install Docker and Docker Compose on the VPS.

Typical Ubuntu setup:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and log back in after adding your user to the Docker group.

## 2. Clone the repo

```bash
git clone https://github.com/herbertchangit/health-screening.git
cd health-screening
```

## 3. Create production environment

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
JWT_SECRET=replace-with-a-long-random-secret
DB_NAME=talkwithdoc_db
SEED_DEMO_USERS=false
CORS_ORIGINS=https://talkwithdoc.jingjiqingcheng.com
FRONTEND_PORT=80
```

Generate a strong JWT secret:

```bash
openssl rand -hex 32
```

Replace `JWT_SECRET` with that generated value.

Do not use the example secret in production.

## 4. Build and start

```bash
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs -f backend
```

Health check:

```bash
curl http://localhost/api/health
```

Public URL:

```text
http://talkwithdoc.jingjiqingcheng.com
```

## 5. Add HTTPS

Use a reverse proxy on the VPS or your hosting control panel SSL feature.

If using Caddy on the VPS, an example `Caddyfile`:

```caddyfile
talkwithdoc.jingjiqingcheng.com {
    reverse_proxy 127.0.0.1:80
}
```

If using nginx/certbot on the VPS, proxy HTTPS traffic to:

```text
http://127.0.0.1:80
```

## 6. DNS

Point your domain to the VPS public IP:

```text
Type: A
Name: talkwithdoc
Value: <your-vps-public-ip>
```

If you use the root domain or another subdomain, update `CORS_ORIGINS` in `.env`.

With this Docker setup, a separate `api.` subdomain is not required because the API is available under the same domain at `/api`.

## 7. Updating the app

```bash
git pull
docker compose up -d --build
```

## 8. Backups

MongoDB data is stored in the Docker volume `mongo_data`.

Create a backup:

```bash
docker compose exec mongo mongodump --archive=/tmp/talkwithdoc.archive
docker compose cp mongo:/tmp/talkwithdoc.archive ./talkwithdoc.archive
```

Restore:

```bash
docker compose cp ./talkwithdoc.archive mongo:/tmp/talkwithdoc.archive
docker compose exec mongo mongorestore --archive=/tmp/talkwithdoc.archive --drop
```

## 9. Troubleshooting

- Blank page: check `docker compose logs frontend`.
- API not working: check `docker compose logs backend`.
- Login fails: check `JWT_SECRET`, backend logs, and MongoDB health.
- CORS error: set `CORS_ORIGINS` to the exact frontend URL.
- Icons show as boxes: rebuild and ensure the font file exists in frontend assets.
- Port 80 already in use: change `FRONTEND_PORT` in `.env`, for example `FRONTEND_PORT=8080`.

## Alternative: separate managed hosting

If Docker is not available, deploy separately:

- Frontend static host: `frontend/dist`
- Backend Python web service: `backend`
- Database: MongoDB Atlas

Frontend env:

```dotenv
EXPO_PUBLIC_BACKEND_URL=https://your-backend-domain.com
```

Backend env:

```dotenv
ENVIRONMENT=production
MONGO_URL=mongodb+srv://...
DB_NAME=talkwithdoc_db
JWT_SECRET=your-long-secret
SEED_DEMO_USERS=false
CORS_ORIGINS=https://talkwithdoc.jingjiqingcheng.com
```
