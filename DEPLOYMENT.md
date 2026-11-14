# UNLOS — Deployment and client acceptance

## 1. Before sharing a live URL

1. Review all course content and correct typos and sample material.
2. Set `ADMIN_EMAIL` and a **unique** `ADMIN_PASSWORD` of at least 12 characters.
3. Host exactly one UNLOS server instance. Attach persistent storage for `DB_FILE`.
4. Configure an HTTPS reverse proxy or an HTTPS-enabled hosting provider. Use `NODE_ENV=production` only after TLS is working end to end.
5. Restrict public access to the SQLite database, logs, and environment values. Back up the database on a schedule and test a restore. SQLite uses WAL mode; for a consistent file backup, stop the app before copying the database, or use an SQLite-aware backup.
6. Keep `/api/health` under health monitoring and retain application error logs.
7. Run `npm test` and manually check mobile and desktop layouts with real browsers.
8. Test a full student journey: register → enroll → read lesson → complete quiz → mark complete → dashboard → sign out → sign back in.
9. Test the instructor journey: sign in → create draft → add lesson and quiz → publish → edit → unpublish; confirm draft content is hidden from students.

## 2. Data migration

If the original `.storage/unlos.json` exists, back it up first. On first run with an empty `.storage/unlos.sqlite`, UNLOS imports the existing users, sessions, courses, enrollments and progress. Check student accounts, course totals and quiz history after the import. Do not delete your JSON backup until verified. If deploying with Docker, pass a copy of the JSON file using `DATA_FILE` and mount the legacy file read-only during the initial import.

## 3. Current engineering boundaries

- A single Node.js process is supported. SQLite is on persistent local storage; multiple app instances are not supported.
- Registration and sign-in are local; no email delivery/verification or password recovery service is configured.
- Course lessons are text based; file/video uploads and payments are not implemented.
- Do not advertise accredited certificates or collect payments unless those functions are actually implemented.
- Before broad public launch, conduct an independent security and accessibility review, backup/restore exercise, and realistic load testing.
- The project still needs a hosting decision and a public HTTPS URL; committing code to GitHub alone does not deploy its backend.

## 4. Client sign-off and ownership handover

- Demonstrate the running site and confirm all agreed features.
- Record any remaining defects and their severity.
- Provide the GitHub repository, run instructions, demo credentials through a secure channel, deployment configuration, and backup/restore instructions.
- Obtain written approval and settle the agreed commercial terms.
- For transfer to the client's own GitHub account, initiate **Settings → General → Danger Zone → Transfer ownership** and ask the client to accept the invitation. GitHub commit history remains intact. Never ask for or exchange the client's GitHub password.
- Transfer production domain, hosting, database and credentials separately if you control them; changing repository ownership does not transfer a hosting account or its secrets.

## 5. Ready-for-demo checklist

- [ ] Automated tests pass on the released commit
- [ ] All student and instructor flows tested in a browser
- [ ] HTTPS deployment reachable from the client's device
- [ ] Persistent database backup verified
- [ ] Content and branding approved by client
- [ ] Handover package approved; ownership transfer only when requested
