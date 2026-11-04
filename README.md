# Ownlayer — data intelligence workspace

**A fresh, white-background, Firebase-native foundation for Block Studios.**

This is a working frontend foundation, **not yet a production-ready full AI platform**.

## What is implemented

- White/light professional responsive UI (no dark theme).
- Firebase email/password login and account creation.
- Per-user Firestore dataset/source registry and Firebase Storage files.
- Upload and inspect CSV, TSV, JSON, JSONL and TXT files.
- Read-only table preview, search over visible preview rows, record counts and file metadata.
- Basic missing-cell/duplicate-row profiling with sampled/full distinctions.
- Optional whitespace trimming and deduplication, reviewed before saving a **separate cleaned file**.
- Download original, view source/derived lineage, delete user-owned files.
- Dashboard, Datasets, Sources, Quality, Governance, AI Workflows and Settings pages.
- Honest integration status: external source synchronization, model training and synthetic generation are **not** yet implemented.
- GitHub Actions static TypeScript/build checks.

## Local setup

1. Use Node.js 22 or newer.
2. Run \`npm install\`.
3. Create a **new** Firebase project; enable Email/Password Authentication, Cloud Firestore and Cloud Storage.
4. Register a Firebase web app. Copy \`.env.example\` to \`.env\`, then add Firebase web-app config (never a service-account JSON).
5. Deploy \`firestore.rules\` and \`storage.rules\` using the Firebase CLI, from an authorized Firebase account.
6. Run \`npm run check\`, \`npm run build\`, then \`npm run dev\`.

When Firebase is not configured, the app shows a setup screen instead of pretending data is connected.

## Firebase hosting

\`firebase.json\` is preconfigured for a Vite single-page app. Choose your new Firebase project in the Firebase CLI, build, then deploy Hosting and security rules. No deploy is performed automatically by the current CI.

## Important limits / upcoming work

- In-browser profiling currently reads up to 2 MiB per file (max 50,000 local parsed records). Larger files are **sampled**, not silently labeled fully evaluated.
- Storage policy limits uploaded files to 50 MiB. Production data ingestion requires scalable server-side processing.
- Derived cleaning is allowed only on eligible files no larger than 2 MiB so it never accidentally saves a truncated preview as a complete dataset.
- Source registration records locators but does not yet authenticate or synchronize remote providers.
- Multi-tenant organization roles, privacy scanning, governance approvals, audit logs, enterprise file types, synthetic generation and model training require backend implementation and verification.
- Firebase usage may incur charges; check billing/project requirements before enabling paid services.
- Before using client data, review security rules, consent, retention, encryption and backend operational readiness. A public **code repository** must never contain secrets or customer data.

Original AI Engine project is unchanged.
