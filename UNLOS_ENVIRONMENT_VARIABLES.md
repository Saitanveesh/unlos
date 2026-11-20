# UNLOS — Environment Variables Reference Guide

This document provides a comprehensive specification of every environment variable supported by the UNLOS learning platform, detailing its purpose, default behavior, security considerations, and configuration instructions for both local development and Vercel production deployment.

---

## 1. Quick Summary Table

| Variable | Required in Production? | Default Value | Example Value | Description |
|---|---|---|---|---|
| `NODE_ENV` | **Recommended** | `development` | `production` | Enables production security safeguards: `Secure` cookies and HSTS headers. |
| `TURSO_DATABASE_URL` | **Recommended (for persistence)** | *(None)* | `libsql://unlos-db-myorg.turso.io` | Turso libSQL connection URL for persistent cloud SQLite storage. |
| `TURSO_AUTH_TOKEN` | **Recommended (with Turso)** | *(None)* | `eyJhbGciOi...` | JWT authorization token issued by Turso for the database. |
| `ADMIN_EMAIL` | Optional | *(None)* | `instructor@mycompany.com` | Automatically provisions initial instructor account on boot if not existing. |
| `ADMIN_PASSWORD` | Optional (Required with email) | *(None)* | `Sup3rSecr3tP@ssw0rd!` | Password for the initial instructor account (minimum 12 characters). |
| `PORT` | Local dev only | `3000` | `3000` | TCP port for local standalone HTTP server (ignored on Vercel). |
| `DB_FILE` | Local dev only | `.storage/unlos.sqlite` | `/tmp/unlos.sqlite` | Path for local embedded SQLite database file. Automatically falls back to `/tmp` on Vercel. |

---

## 2. Detailed Variable Specifications

### 2.1 `NODE_ENV`
- **Purpose:** Controls production-specific security modes and optimizations.
- **Production Setting:** `production`
- **Effects when set to `production`:**
  - Session cookies (`unlos_session`) automatically include the `; Secure` attribute, enforcing delivery over HTTPS only.
  - The `Strict-Transport-Security` (HSTS) header is enabled (`max-age=31536000; includeSubDomains`).
- **Where to configure:**
  - **Vercel:** Vercel automatically sets `NODE_ENV=production` for all production deployments. You do not need to set this manually, but you can explicitly specify it under **Project Settings → Environment Variables**.
  - **Local Development:** Left as `development` in `.env` to allow plain HTTP testing.

---

### 2.2 `TURSO_DATABASE_URL`
- **Purpose:** Specifies the connection endpoint for Turso cloud SQLite database.
- **Why it is critical for production:**
  - Vercel Serverless Functions run in stateless, ephemeral AWS Lambda containers with a read-only filesystem (except temporary `/tmp`).
  - Without `TURSO_DATABASE_URL`, UNLOS operates using ephemeral `/tmp/unlos.sqlite` storage, which is wiped when Lambda containers recycle or scale to zero.
  - Setting `TURSO_DATABASE_URL` connects UNLOS to Turso's durable, cross-region libSQL cloud database (free tier: 9 GB storage, 500 databases, 1B reads/mo), ensuring student registrations, enrollments, and quiz progress persist permanently.
- **Accepted Formats:**
  - `libsql://your-database-name-your-org.turso.io`
  - `https://your-database-name-your-org.turso.io`
- **Where to obtain:**
  - From the [Turso Web Dashboard](https://turso.tech/) or via the Turso CLI:
    ```bash
    turso db show unlos-db --url
    ```
- **Where to configure in Vercel:**
  - Open **Vercel Dashboard → Your Project → Settings → Environment Variables**.
  - Key: `TURSO_DATABASE_URL`
  - Value: `libsql://your-database-name-your-org.turso.io`
  - Environments: Check **Production**, **Preview**, and **Development**.

---

### 2.3 `TURSO_AUTH_TOKEN`
- **Purpose:** Cryptographic bearer token (JWT) used to authenticate database queries against your Turso database over HTTPS.
- **Security Notice:** Treat this token as a high-security secret. Never commit it to git or disclose it in public repositories.
- **Where to obtain:**
  - From the [Turso Web Dashboard](https://turso.tech/) or via the Turso CLI:
    ```bash
    turso db tokens create unlos-db
    ```
- **Where to configure in Vercel:**
  - Open **Vercel Dashboard → Your Project → Settings → Environment Variables**.
  - Key: `TURSO_AUTH_TOKEN`
  - Value: *(paste your generated token)*
  - Environments: Check **Production**, **Preview**, and **Development**.

---

### 2.4 `ADMIN_EMAIL`
- **Purpose:** Automatically provisions an initial Instructor (admin) account when UNLOS initializes.
- **Type:** String (valid email format).
- **Default:** None (no instructor account created unless specified).
- **Behavior:**
  - If provided alongside `ADMIN_PASSWORD` (min 12 characters), UNLOS creates an admin account with `role: 'admin'` on first boot if one with that email does not already exist.
  - Grants access to the Instructor Studio (`#/admin`) to create courses, add lessons, publish quizzes, and review platform analytics.
- **Where to configure in Vercel:**
  - Key: `ADMIN_EMAIL`
  - Value: `instructor@yourdomain.com`

---

### 2.5 `ADMIN_PASSWORD`
- **Purpose:** Secure password for the initial Instructor account.
- **Minimum Length:** Must be at least **12 characters**.
- **Security Notice:**
  - Passwords are encrypted on disk using Node.js native `scryptSync` with unique 16-byte cryptographically random salts. Plaintext passwords are never stored.
  - Never commit actual passwords to version control.
- **Where to configure in Vercel:**
  - Key: `ADMIN_PASSWORD`
  - Value: *(Choose a strong, unique 12+ character password)*

---

### 2.6 `DB_FILE`
- **Purpose:** Overrides the local file path for embedded SQLite storage.
- **Default Behavior:**
  - **Local Development:** Resolves to `.storage/unlos.sqlite`.
  - **Vercel Serverless (if Turso not set):** Automatically defaults to `path.join(os.tmpdir(), 'unlos.sqlite')` (`/tmp/unlos.sqlite`).
- **Where to configure in Vercel:**
  - Usually not needed. If Turso is configured, `DB_FILE` is ignored. If Turso is not configured, UNLOS automatically uses `/tmp/unlos.sqlite`.

---

### 2.7 `PORT`
- **Purpose:** Specifies the TCP port for the standalone HTTP server (`server.js`).
- **Default:** `3000`
- **Applicability:** Used only when running locally (`npm start` or `node server.js`) or inside Docker containers. Ignored on Vercel because Vercel routes HTTP traffic directly to Serverless Function invocations.

---

## 3. How to Configure Environment Variables in Vercel (Step-by-Step)

1. Open your project on the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click on the **Settings** tab in the top navigation bar.
3. Click on **Environment Variables** in the left sidebar menu.
4. In the **Key** field, enter the variable name (e.g., `TURSO_DATABASE_URL`).
5. In the **Value** field, paste the corresponding secret or URL.
6. Under **Environment**, ensure all target environments are selected (**Production**, **Preview**, **Development**).
7. Click **Save**.
8. Repeat for:
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
9. **Important:** If your application is already deployed, trigger a new deployment (**Deployments → Redeploy**) so the serverless functions receive the updated variables.

---

## 4. Local Development `.env` File Example

For running UNLOS locally with your own environment variables, create a `.env` file in the project root:

```ini
# UNLOS Local Environment Configuration
PORT=3000
NODE_ENV=development

# Admin Account (Optional)
ADMIN_EMAIL=instructor@example.com
ADMIN_PASSWORD=instructor-strong-password-1234

# Local SQLite Storage
DB_FILE=.storage/unlos.sqlite

# Turso Cloud SQLite (Optional: set to test cloud database locally)
# TURSO_DATABASE_URL=libsql://your-db.turso.io
# TURSO_AUTH_TOKEN=your-turso-jwt-token
```
