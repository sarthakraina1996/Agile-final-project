# BrainADZ Hospitality OS + People

A local hospitality and people workspace built with React, Vite, Express and persistent SQLite storage. Hospitality OS follows the supplied BrainADZ Live visual identity; the preserved HR portal serves BrainADZ Marketing, Exhibits and Live. All seeded guests, employees, properties and policies are fictional.

## Workout Tracker (separate app)

[`workout/`](workout/README.md) contains a standalone, local-first workout tracker PWA (React, TypeScript, Vite, IndexedDB). It has its own `package.json` and does not share code, data or servers with the apps described in this README. See [workout/README.md](workout/README.md) to run or install it and [workout/VERIFICATION.md](workout/VERIFICATION.md) for test results.

## Hospitality OS — operational foundation

The default application at **/** is now **BrainADZ Hospitality OS**, with horizontal top navigation and the actual BrainADZ Live logo extracted from the supplied booklet. The existing HR application remains available at **/hr**. Its database, users, APIs and workflows are preserved.

Use the same Windows `start-local.cmd` or `npm run local` launcher. It builds both interfaces and opens the hospitality workspace. In your browser, choose **Group owner**, **General manager**, **Front desk** or **Housekeeping**. The hospitality demo password is **Brainadz@123**; emails are `owner@brainadz.com`, `manager@brainadz.com`, `frontdesk@brainadz.com`, `housekeeping@brainadz.com` and `finance@brainadz.com`.

The first hospitality cycle includes five fictional Indian properties, 200 physical rooms, separate room types and rate plans, 12 months of reconciled synthetic folio history, property-scoped hotel sessions, editable property policies and base rates, reservations, a day/week/month room calendar with validated drag-and-drop, check-in, immutable folio charges/payments/reversals, balance-gated checkout, account-statement downloads and inspection-gated housekeeping. Guest and property views and operational source-record exports are included. This is a scoped foundation release, not a completed enterprise PMS.

Full accounting, tax invoices, automated night audit, deposits/refunds, restaurant POS, procurement, forecasting, OTA adapters, central/device offline sync, MFA, production hotel account provisioning and jurisdiction validation are **not implemented**. With `DEMO_MODE=false`, shared hotel demo sign-in is disabled; the HR administrator creation command does **not** provision hotel users. Hotel production onboarding requires a subsequent implementation. Planned modules are listed under **More**, with their status explicitly marked.

Hotel data is saved separately to `.data/hospitality.sqlite`; `HOSPITALITY_DATABASE_PATH` overrides it. HR continues using `.data/brainadz.sqlite` / `DATABASE_PATH`. For Render, both databases must live on its persistent disk. An existing user updating from an older download should stop the server, keep the entire `.data` folder, replace application source files with the new download, and run the launcher again. Do not delete the database folder. The hotel migrations run automatically; repeat startup does not reseed existing data.

The software and bundled assets can run from a local computer/LAN without internet after initial installation. This does not provide disconnected browser writes, a central queue or OTA sync. The room photo is generated illustrative demo imagery, not a photograph of any represented property. The logo is an actual crop of page 4 of the user-supplied BrainADZ Live PDF.

See [requirements](docs/PRODUCT_REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), [database](docs/DATABASE_SCHEMA.md), [metrics](docs/FINANCIAL_METRICS.md), [module status](docs/MODULE_STATUS.md), [roadmap](docs/IMPLEMENTATION_ROADMAP.md) and [test strategy](docs/TEST_STRATEGY.md).

## Run on your own computer

Install **Node.js 24 LTS** from https://nodejs.org. Download this repository using **Code → Download ZIP** on GitHub and extract it into a folder you can write to.

- **Windows:** double-click `start-local.cmd` in the extracted folder.
- **macOS:** double-click `start-local.command`. If macOS will not open it, open Terminal in the extracted folder and run `sh start-local.command`.
- **Linux:** open a terminal in the extracted folder and run `sh start-local.command`.
- **Any platform:** open a terminal in the extracted folder and run `npm run local`.

The launcher installs dependencies if they are missing, builds the app, starts a server bound to your computer and opens **http://localhost:3000** in your default browser. Internet access is needed for the first dependency installation. Keep the terminal window open; press **Ctrl+C** to stop. Hospitality demo buttons are available on the default login page; the original HR buttons are at /hr. Local HTTP uses non-Secure cookies; hosted HTTPS continues using the configured secure-cookie setting.

Records are saved in `.data/brainadz.sqlite` in your local app folder. Keep that folder to retain your records. Render access and a Render API key are not needed to run locally. If port 3000 is occupied, run `npm run local -- --port=3002`. Use `--no-open` to start without opening a browser.

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
