# UNLOS — Online Learning Platform

UNLOS is a complete, lightweight course website developed for an academic demonstration. It includes a responsive student interface, real HTTP APIs and local persistent storage. There is **no build step, database server, or third-party package** to install.

## Features

- Homepage, course catalog, category filters and search
- Course overviews, reading lessons and knowledge-check quizzes
- Registration, login, logout and server-side sessions
- Student enrollment, lesson completion, quiz attempt history and dashboard
- Instructor-only course and lesson creation
- Four preloaded courses with 14 lessons and answer-checked quizzes
- Responsive desktop/mobile layout, keyboard focus states and helpful error messages
- Node.js HTTP server with built-in storage, hashed passwords and strict session cookies

## Quick start

**Requirement:** Node.js 20 or newer.

```bash
git clone https://github.com/Saitanveesh/unlos.git
cd unlos
npm start
```

Open **http://localhost:3000**. Create a student account with any valid email and a password of at least eight characters; registration is local to this application. The `.storage/unlos.json` database file is created on first launch and will retain users, courses, enrollments and quiz results on restart. It is excluded from Git.

To change the port on Linux/macOS:

```bash
PORT=4000 npm start
```

On Windows PowerShell:

```powershell
$env:PORT=4000
npm start
```

For automated tests:

```bash
npm test
```

## Instructor account

An instructor is optional. Set both `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your operating system's environment before starting the server. The password must contain at least 12 characters. The account is created on first launch if the email doesn't already exist.

Example (PowerShell):

```powershell
$env:ADMIN_EMAIL="instructor@example.com"
$env:ADMIN_PASSWORD="choose-your-own-long-password"
npm start
```

Sign in to see **Course management**. Create courses and add text-based lessons. Only instructor accounts can access the content authoring endpoints. Do not commit private credentials to the public repository.

## Project layout

```text
unlos/
├── server.js          # Routes, authentication, persistence and static hosting
├── lib/courses.js     # Initial course catalog and lessons
├── public/
│   ├── index.html     # App shell
│   ├── app.js         # UI, navigation, forms and interactions
│   ├── styles.css     # Responsive design system
│   └── favicon.svg
├── tests/smoke.test.js
├── .env.example
└── package.json
```

## API overview

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Server status |
| `/api/me` | GET | Current user |
| `/api/auth/register` | POST | Create a student account |
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | End session |
| `/api/courses` | GET | Public course catalog |
| `/api/courses/:slug` | GET | Course details and lesson content |
| `/api/courses/:slug/enroll` | POST | Enroll signed-in user |
| `/api/dashboard` | GET | Student progress |
| `/api/lessons/:id/complete` | POST | Save lesson completion |
| `/api/lessons/:id/quiz` | POST | Submit an answer and receive a grade |
| `/api/admin/courses` | POST | Instructor creates course |
| `/api/admin/courses/:slug/lessons` | POST | Instructor adds lesson |

All state-changing actions are done through the backend; the browser does not fake quiz results or progress. Quiz answer keys are not sent in course GET responses.

## Deployment notes

This implementation is a **single-server teaching/demo application**. Run behind HTTPS for public deployments with `NODE_ENV=production` (which marks cookies `Secure`). Mount a persistent storage volume and set `DATA_FILE` to a writable location; ephemeral hosting storage will erase accounts and progress. The JSON file store is appropriate for one server process and light classroom use; use PostgreSQL or another transactional database before running multiple instances or serving substantial traffic. Email verification, password reset, uploaded videos and third-party payments are intentionally not included.

The sample curriculum is introductory material created for this demonstration. It is not accredited certification content.
