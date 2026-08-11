# Health Tracker

A personal health tracking app for Android with offline-first local storage and NAS backend sync.

## Features

- **Period / Cycle Tracking** — Log cycles, flow levels, and get cycle predictions
- **Weight Tracking** — Log weight with trend graphs
- **Food Logging** — Track meals (breakfast, lunch, dinner, snacks) with optional calories
- **Water Intake** — Quick-log water with daily totals and bar charts
- **Fitness / Gym** — Log workout duration, intensity, and mark activities you loved
- **Custom Reminders** — Alarms for water, food, and custom notifications
- **Progress Graphs** — Weight trends, daily water, weekly workout minutes, favorite activities
- **Offline First** — All data stored locally in SQLite; syncs to your NAS when connected

## Architecture

```
┌─────────────────┐         HTTPS          ┌──────────────────┐
│  Android App    │ ◄──────────────────►  │  Reverse Proxy   │
│  (React Native) │    (via your domain)   │  (Nginx/DSM)     │
│  SQLite (local) │                        └────────┬─────────┘
└─────────────────┘                                 │
                                                    ▼
                                          ┌──────────────────┐
                                          │  Docker Compose  │
                                          │  ┌────────────┐  │
                                          │  │  API :5000 │  │
                                          │  └─────┬──────┘  │
                                          │  ┌─────▼──────┐  │
                                          │  │ PostgreSQL │  │
                                          │  └────────────┘  │
                                          └──────────────────┘
                                                    NAS
```

## Quick Start — NAS Backend

### 1. Copy project to your NAS

```bash
scp -r "Health Tracker" user@your-nas:/volume1/docker/health-tracker
```

### 2. Configure environment

```bash
cd /volume1/docker/health-tracker
cp .env.example .env
nano .env
```

Set secure values:

```env
POSTGRES_PASSWORD=your-secure-db-password
JWT_SECRET=a-long-random-string-at-least-32-characters
DEFAULT_USER_EMAIL=wife@home.local
DEFAULT_USER_PASSWORD=her-secure-password
DEFAULT_USER_NAME=Her Name
API_PORT=5000
```

### 3. Start with Docker Compose

```bash
docker compose up -d --build
```

Verify:

```bash
curl http://localhost:5000/health
# {"status":"ok","timestamp":"..."}
```

### 4. Set up reverse proxy

**Synology DSM:** Control Panel → Login Portal → Advanced → Reverse Proxy

| Field | Value |
|-------|-------|
| Source protocol | HTTPS |
| Hostname | `health.yourdomain.com` |
| Port | 443 |
| Destination protocol | HTTP |
| Hostname | localhost |
| Port | 5000 |

**Nginx:** See `deploy/nginx.conf.example`

**Nginx Proxy Manager:** Add proxy host → Forward to `NAS_IP:5000` with SSL

### 5. Port forwarding (optional, for remote access)

If accessing from outside your home network, forward port 443 on your router to your NAS, and use a dynamic DNS service (No-IP, DuckDNS, etc.).

## Quick Start — Mobile App

### Prerequisites

- Node.js 20.19+
- Android Studio (for emulator) or physical Android device
- [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) app for quick testing (SDK 54)

### Install and run

```bash
cd mobile
npm install
npx expo start
```

Press `a` to open on Android emulator, or scan the QR code with Expo Go.

### Connect to your NAS

1. Open the app → Settings (gear icon)
2. Tap **Connect to Server**
3. Enter your reverse proxy URL: `https://health.yourdomain.com`
4. Login with the credentials from your `.env` file
5. Tap **Sync Now** to push/pull data

The app works fully offline. Sync happens when you pull-to-refresh on the home screen or tap Sync in settings.

## Building APK for Production

```bash
cd mobile
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Or build locally:

```bash
npx expo prebuild
cd android && ./gradlew assembleRelease
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/sync/pull?since=ISO_DATE` | Pull changes since timestamp |
| POST | `/api/sync/push` | Push local changes |
| GET | `/api/stats/summary?days=30` | Aggregated stats for graphs |

## Default Reminders

On first launch, the app creates these reminders:

| Time | Reminder |
|------|----------|
| 08:00 | Morning Water |
| 12:00 | Midday Hydration |
| 15:00 | Afternoon Water |
| 08:30 | Breakfast |
| 12:30 | Lunch |
| 19:00 | Dinner |

Customize them in Settings → Reminders.

## Data Sync Strategy

- All writes go to local SQLite immediately (offline-first)
- Records marked `synced = 0` until pushed to server
- Pull sync fetches server changes since last sync timestamp
- Conflict resolution: server wins if its `updated_at` is newer
- Soft deletes propagate via `deleted_at` field

## Troubleshooting

**App can't connect to server**
- Verify reverse proxy is working: `curl https://health.yourdomain.com/health`
- Ensure phone is on same network (or port 443 is forwarded for remote)
- Check Docker containers: `docker compose ps`

**Sync conflicts**
- Conflicts auto-resolve (server wins). Check Settings for last sync time.

**Notifications not working**
- Grant notification permission when prompted
- On Android 13+, ensure notifications are enabled in system settings
- Check Reminders screen — toggles must be ON

## Project Structure

```
Health Tracker/
├── backend/           # Node.js API (TypeScript)
│   ├── src/
│   │   ├── routes/    # auth, sync, stats
│   │   ├── middleware/
│   │   └── migrate.ts
│   └── Dockerfile
├── mobile/            # React Native Expo app
│   ├── app/           # Screens (expo-router)
│   ├── components/    # UI components
│   └── lib/           # database, sync, notifications
├── deploy/            # nginx config example
├── docker-compose.yml
└── README.md
```

## Security Notes

- Change all default passwords in `.env` before deploying
- Use HTTPS via reverse proxy (never expose API over plain HTTP publicly)
- JWT tokens expire after 365 days
- Database is not exposed outside Docker network
- This is designed for personal/home use, not multi-tenant production
