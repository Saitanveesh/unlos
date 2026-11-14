# UNLOS — Online Learning Platform

UNLOS is a working, single-server learning website with student accounts, course lessons, quizzes, saved progress and an instructor studio. It uses a Node.js HTTP server and an embedded SQLite database. There are no runtime npm dependencies or build steps.

## Functionality

| Students | Instructors |
| --- | --- |
| Register and log in | Create courses as unpublished drafts |
| Browse and search the catalog | Publish or unpublish courses |
| Enroll in courses | Edit and delete courses |
| Read lessons and take graded quizzes | Add, edit and delete lessons |
| Resume progress after restart | Author and replace question-based quizzes |
| View learning dashboard | View student, course and enrollment counts |
| Update profile and change password | Control public course visibility |

The starter catalog contains **4 courses and 14 lessons** with short quizzes. Progress, accounts, enrollment and quiz attempts are persisted in a SQLite database.

## Start locally

You need **Node.js 22.13+**; Node.js 24 is recommended.

```bash
git clone https://github.com/Saitanveesh/unlos.git
cd unlos
npm start
```

Open **http://localhost:3000**. The database is created at `.storage/unlos.sqlite` on first startup.

To create the instructor login, copy `.env.example` to `.env`, change **both** `ADMIN_EMAIL` and `ADMIN_PASSWORD`, and launch with:

```bash
node --env-file=.env server.js
```

The instructor user is created only if its email does not already exist. An existing user's role is **not** elevated by environment variables. Do not commit `.env`.

Run automated checks with:

```bash
npm test
```

## Docker demo

For a reproducible deployment, install Docker and Docker Compose, create `.env` with the instructor credentials, then:

```bash
docker compose up -d --build
docker compose ps
```

The app listens on **http://localhost:3000**. Compose binds to loopback intentionally. Student data is stored on the persistent `unlos-data` Docker volume, not in the container filesystem.

**Important:** The default `NODE_ENV=development` is for local HTTP demos. For a public deployment, put the app behind an HTTPS reverse proxy, set `NODE_ENV=production`, configure backups and monitoring, and use a server with persistent volume storage. A production session cookie is Secure, so sign-in must happen through **HTTPS**.

## Deployment and data

- `PORT`: HTTP port (default 3000).
- `DB_FILE`: writable SQLite file path (default `.storage/unlos.sqlite`).
- `DATA_FILE`: optional old JSON file path, used **only** to import data when SQLite is empty.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: initial instructor account; password must be 12+ characters.
- `NODE_ENV=production`: Secure session cookies and HSTS. Requires HTTPS.

Previous `.storage/unlos.json` data is imported automatically on first startup if the new SQLite database is empty. Keep the original JSON backup until the data has been verified. Never share a live database or `.env` in GitHub.

For release steps, limitations and the handover checklist, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Important API endpoints

`GET /api/health`, `GET /api/courses`, `GET /api/courses/:slug`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`, `GET /api/dashboard`, `POST /api/courses/:slug/enroll`, `POST /api/lessons/:id/complete`, `POST /api/lessons/:id/quiz`, `PATCH /api/account/profile`, `POST /api/account/password`, `GET /api/admin/overview`, `POST /api/admin/courses`, `PATCH/DELETE /api/admin/courses/:slug`, `POST /api/admin/courses/:slug/lessons`, and `PATCH/DELETE /api/admin/lessons/:id`.

API authorization is checked on the server. Answers are graded server-side and quiz answer keys are excluded from course responses.

## Scope and limitations

UNLOS is suitable for a classroom demonstration, a small private pilot, or a single-server client proof of concept. It is **not yet a fully operated commercial learning service**: public hosting, verified email, password recovery, accessible video streaming, payments, backups, retention policies, legal documents, operational monitoring, load testing and independent security testing remain outside this release. SQLite stores individual entity records transactionally but the server rewrites the current document collections during updates; use a normalized database and concurrency design for significant production traffic.

The code is currently held in the developer's repository; transfer of repository ownership and live infrastructure will be a separate handover step.
