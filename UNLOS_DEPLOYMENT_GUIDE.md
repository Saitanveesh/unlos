# UNLOS — Complete Vercel & Turso Deployment Guide

This guide walks you step-by-step through deploying **UNLOS** to **Vercel** on the **100% Free Hobby Plan**, paired with **Turso** for zero-cost, persistent SQLite cloud storage.

---

## Architecture Overview

```
                      +-----------------------------+
                      |         End User            |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |    Vercel Edge Anycast CDN  |
                      |   (public/ HTML, CSS, JS)   |
                      +--------------+--------------+
                                     |  /api/*
                                     v
                      +-----------------------------+
                      |  Vercel Serverless Function |
                      |       (api/index.js)        |
                      +--------------+--------------+
                                     |  libSQL HTTPS
                                     v
                      +-----------------------------+
                      |    Turso Cloud Database     |
                      |   (Persistent Free SQLite)  |
                      +-----------------------------+
```

- **Frontend & Assets:** Served directly from Vercel's global Anycast Edge Network with sub-millisecond TTFB and zero cold-start delay.
- **Backend API:** Runs in lightweight Node.js 22 Vercel Serverless Functions (`api/index.js`).
- **Database:** Turso libSQL cloud SQLite database (Free Tier: 9 GB storage, 500 databases, 1B reads/month, zero credit card required).

---

## Step 1: Set Up Free Cloud SQLite Database on Turso (Recommended)

To ensure student accounts, registrations, enrollments, and quiz progress persist durably across serverless cold starts, set up a free database on Turso.

### Option A: Using the Turso Web Console (Fastest)
1. Go to [https://turso.tech/](https://turso.tech/) and click **Sign Up** (Free).
2. Log in using your GitHub account.
3. In the dashboard, click **Create Database**.
4. Set the database name to: `unlos-db`.
5. Select a region close to your primary audience (e.g., `iad` for US East, `fra` for Europe, `sin` for Asia).
6. Click **Create Database**.
7. Copy your database connection URL. It looks like:
   ```
   libsql://unlos-db-yourusername.turso.io
   ```
8. Click **Generate Token** (or **Tokens** tab) and copy your authorization token.

### Option B: Using the Turso CLI
```bash
# Install Turso CLI
# On macOS / Linux:
curl -sSfL https://get.tur.so/install.sh | bash
# On Windows (PowerShell):
irm https://get.tur.so/install.ps1 | iex

# Authenticate
turso auth signup

# Create database
turso db create unlos-db

# Get the Database URL
turso db show unlos-db --url

# Generate an Auth Token
turso db tokens create unlos-db
```

> **Optional: Migrate existing local SQLite database:**
> If you have existing accounts or courses in `.storage/unlos.sqlite` that you wish to transfer to Turso, run:
> ```bash
> TURSO_DATABASE_URL="libsql://unlos-db-yourusername.turso.io" TURSO_AUTH_TOKEN="your-token" npm run migrate:turso
> ```

---

## Step 2: Push Changes to Your GitHub Repository

Ensure your local changes are committed and pushed to your GitHub repository:
`https://github.com/anshkatiyar276-arch/unlos`

```bash
# Check git status
git status

# Stage the Vercel compatibility files
git add package.json vercel.json api/ server.js lib/ store.js scripts/ .env.example .gitignore tests/ *.md

# Commit
git commit -m "feat: complete Vercel serverless compatibility with Turso cloud SQLite support"

# Push to your main branch
git push origin main
```

---

## Step 3: Connect and Deploy on Vercel

1. Log in to [Vercel](https://vercel.com/) with your GitHub account.
2. From the Vercel Dashboard, click **Add New…** → **Project**.
3. Under **Import Git Repository**, locate `anshkatiyar276-arch/unlos` and click **Import**.
4. In the **Configure Project** screen:
   - **Project Name:** `unlos` (or your preferred project name).
   - **Framework Preset:** Select **Other**.
   - **Root Directory:** `./` (leave default).
   - **Build and Output Settings:** Leave all toggles default:
     - Build Command: `echo UNLOS production build verified` (auto-detected from `package.json`).
     - Output Directory: default.
     - Install Command: `npm install` (default).
5. Expand the **Environment Variables** section and add the following keys:

| Name | Value | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enforces HTTPS `Secure` cookies and security headers. |
| `TURSO_DATABASE_URL` | `libsql://unlos-db-yourusername.turso.io` | Your Turso database connection URL. |
| `TURSO_AUTH_TOKEN` | *(Your Turso JWT Token)* | Your Turso authorization token. |
| `ADMIN_EMAIL` | `instructor@yourdomain.com` | Email for the initial platform instructor. |
| `ADMIN_PASSWORD` | *(Strong password, 12+ chars)* | Password for the initial platform instructor. |

6. Click **Deploy**.
7. Vercel will install dependencies, build the project, and provision the serverless functions and Edge CDN. The process takes approximately 30 to 60 seconds.

---

## Step 4: Verify Your Deployment

Once Vercel completes deployment, you will be assigned a live domain (e.g., `https://unlos-xyz.vercel.app`).

Perform the following smoke tests:

1. **Static Homepage & Navigation:**
   - Open `https://your-domain.vercel.app`. Verify the UNLOS home page loads with styles, icons, and hero section.
   - Navigate to `#/courses` to explore the 4 default seed courses (*Web Development Fundamentals*, *Python for Beginners*, *UI Design Basics*, *Career-Ready Skills*).
2. **API Health Check:**
   - Open `https://your-domain.vercel.app/api/health` in your browser.
   - You should receive an HTTP 200 response:
     ```json
     { "ok": true, "service": "UNLOS", "version": "2.0.0", "storage": "turso" }
     ```
3. **Student Registration & Session:**
   - Click **Join free** (`#/signup`).
   - Create a new student account. Verify immediate redirect and welcome toast.
   - Open **My learning** (`#/dashboard`) and enroll in a course.
4. **Lesson Reader & Graded Quizzes:**
   - Open a lesson, read the content, and complete the interactive quiz.
   - Verify instant feedback and explanation.
   - Click **Mark lesson as complete**; verify that course progress updates.
5. **Instructor Studio:**
   - Log out from the student account.
   - Log in using your `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
   - Access **Course management** (`#/admin`).
   - Verify platform metrics (students, courses, enrollments, completions).
   - Test creating a draft course and lesson.

---

## Step 5: Troubleshooting & FAQs

### Q: What happens if I deploy without setting `TURSO_DATABASE_URL`?
**A:** UNLOS will cleanly fall back to temporary `/tmp/unlos.sqlite` storage. The application and all 4 starter courses will work properly, but newly registered users and progress will be reset when serverless containers cold-start. Adding Turso credentials immediately enables durable persistence.

### Q: Why do I see a 403 "Cross-origin request rejected" error?
**A:** UNLOS validates incoming mutating requests (`POST`, `PATCH`, `DELETE`) against the `Origin` header. We updated the origin validator to support `x-forwarded-host` so all Vercel domains (`*.vercel.app` and custom domains) are recognized automatically.

### Q: How do I connect a custom domain?
**A:** In the Vercel Dashboard, go to **Settings → Domains**, enter your domain (e.g., `learn.mydomain.com`), and configure the CNAME or A record indicated by Vercel. SSL certificates are issued and managed automatically for free.

### Q: Are there any monthly costs on this setup?
**A:** **Zero.** Both Vercel Hobby and Turso Starter tiers are completely free:
- **Vercel Hobby:** 100 GB bandwidth/month, 100,000 serverless requests/day, automatic SSL.
- **Turso Starter:** 9 GB storage, 500 databases, 1 billion row reads/month, 25 million row writes/month.
