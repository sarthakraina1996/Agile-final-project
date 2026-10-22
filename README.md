# BrainADZ People

A responsive HR workspace for **BrainADZ Marketing, BrainADZ Exhibits and BrainADZ Live**. Built with React, Vite, Express and persistent SQLite storage. The supplied company presentations informed the three verticals and their visual identities; sample personnel and policies are fictional.

## Run

Requires Node.js 22.13+ with `node:sqlite` (tested with Node 24).

```sh
cd /workspace/Agile-final-project
npm ci --cache /tmp/brainadz-npm-cache
npm run dev
```

The server listens on **port 3000** on all interfaces. `PORT` overrides the port. React and the API share one origin. Fonts are bundled locally; no external font or image services are needed at runtime.

For the production asset build:

```sh
npm run build
npm start
```

`npm start` serves the built UI and API. SQLite defaults to `.data/brainadz.sqlite`; it is excluded from Git. `DATABASE_PATH` overrides the location. Keep the database and its WAL files on persistent storage and back them up using SQLite's backup API or an application-stopped backup. Restarting the server preserves users, sessions and HR records.

## Deploy on Render

[Deploy to Render](https://render.com/deploy?repo=https://github.com/sarthakraina1996/Agile-final-project)

The repository includes `render.yaml` with the Node runtime, build/start commands, HTTPS cookie setting, health check and a 1 GB persistent disk. The blueprint uses Render's **paid Starter service and paid persistent storage**, with Singapore as the hosting region. Render displays its current charges before you confirm creation.

Connect your GitHub repository in Render, select the `main` branch, and create a Blueprint from `render.yaml`, or use the deployment link above after the app code has been pushed. Sign in to your own Render account and approve repository access and billing as needed. Once Render reports a healthy service, its dashboard displays the actual public HTTPS URL. The hostname is assigned by Render; do not assume a specific `onrender.com` address before deployment succeeds.

The blueprint deliberately starts a **sample-data demonstration** with shared demo accounts. Company data requires a separate database, individually provisioned accounts and `DEMO_MODE=false` as described below. The blueprint does not copy the workspace's database or secret values.

## Try the demo

Use the **Admin**, **HR manager** or **Employee** buttons on the sign-in page. Manual demo login:

| Role          | Email                 | Password     |
| ------------- | --------------------- | ------------ |
| Administrator | admin@brainadz.com    | Brainadz@123 |
| HR manager    | hr@brainadz.com       | Brainadz@123 |
| Employee      | employee@brainadz.com | Brainadz@123 |

Demo buttons intentionally use shared sample accounts. Do not enter real employee information in the demo. Password changes persist and also affect the corresponding demo button.

## Included workflows

- Overview with counts derived from saved records, workforce chart, division filter, requests and events.
- Searchable employee directory and profiles, employee creation and employment status changes.
- Attendance check-in and check-out with India Standard Time and duplicate prevention.
- Leave requests with date validation, overlapping-request detection, HR approval and rejection. Annual allowance is a **calendar-day illustration**, not a country-specific accrual engine.
- Monthly payroll record generation, duplicate-period prevention and downloadable text payslips. Deductions are an explicit **12% illustration**, not statutory payroll. No bank payments are sent.
- Job openings and candidate pipeline with editable hiring stages.
- Goals with progress tracking; employee onboarding and offboarding checklists.
- Expense claims with review, asset assignment and return status.
- Readable and downloadable policy documents; new text documents and policies can be created. Binary file uploads and e-signatures are not included.
- Self-paced learning content, course enrollment and completion tracking.
- Benefit information, employee access requests and HR review. Enrollment requests do not activate third-party benefits.
- HR support requests and private HR responses with resolution status.
- Company announcements and events, notifications, workforce/location reports and CSV exports.
- Organization settings, audit history, password changes, account creation and role management.

## Access model

Administrators and HR managers can manage organization records. Only administrators can create accounts or change account roles. Employee accounts see their own private HR records and payroll, shared policies and announcements, and a limited employee directory. Authorization is enforced on the server, including downloads. Deactivating an employee revokes sessions and blocks login. Employees can update their own goals, learning and journey checklists.

Passwords use salted scrypt hashes. Sessions are stored server-side with an eight-hour expiry and HttpOnly, SameSite=Strict cookies. Password changes invalidate other sessions; account-role changes invalidate affected sessions. Basic login throttling and same-origin mutation checks are included.

## Create a company workspace

Use a **new database path** to keep company data separate from the demonstration. Set `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12–128 characters) securely in the process environment; do not commit them. Then run:

```sh
DATABASE_PATH=/your/persistent/path/company.sqlite npm run admin:create
```

The account-creation command adds an administrator and employee profile without sample data. Start the app using the **same database path**:

```sh
DEMO_MODE=false SECURE_COOKIES=true DATABASE_PATH=/your/persistent/path/company.sqlite npm start
```

Use an HTTPS reverse proxy when `SECURE_COOKIES=true`. Secure cookies are intentionally not sent over plain HTTP. `DEMO_MODE=false` hides demo buttons and blocks the known seeded demo accounts; it does not delete existing records. Add employees from the directory and then create their logins in **Settings → Account access**. Share initial passwords through a secure company channel; employees can change their passwords in Settings.

This is a functional foundation, not a complete multinational HR compliance product. SSO/MFA, password recovery and email delivery, statutory multi-country payroll, bank disbursements, biometric attendance, benefits providers, document uploads/signing, retention controls and high-availability operations require additional implementation or integrations. The single shared timezone/currency is IST/INR. No external services have been connected or deployment published.

## Validation

```sh
npm test
npm run test:e2e
npm run build
```

API tests exercise authentication, role restrictions, privacy, leave validation/approval, employee creation, account access, payroll, attendance, expenses, learning, benefits, helpdesk, deactivation and logout. A file-backed test closes and reopens the server to verify persistence.

Playwright covers desktop navigation across all modules, employee creation and reload, employee/HR leave workflows, real downloads, mobile navigation and overflow, learning/benefits/support, and creating a working employee login. It starts an isolated in-memory server on port 3100 and never changes the development database. The supplied configuration uses `/usr/bin/chromium`; install Chromium or update `executablePath` for another machine. Browser screenshots are written to `/tmp/brainadz-*.png`.

## Project structure

- `client/src/main.jsx` — responsive interface and HR workflows.
- `client/src/styles.css` — branding, desktop and mobile layouts.
- `server/app.js` — API, authorization, sessions and validation.
- `server/database.js` — schema and demonstration data.
- `server/create-admin.js` — company administrator bootstrap.
- `server/index.js` — development/production server entry point.
- `tests/` — API, persistence and browser tests.
