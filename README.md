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
3. Ownlayer reuses the existing Firebase project \`ai-engine-8ab26\`. The public web app configuration is already available in the app, so a new project is not required.
4. To use another project for local testing, copy \`.env.example\` to \`.env\` and override its web-app settings. Never use service-account credentials in browser code.
5. **Do not deploy this repo's Firestore or Storage rules directly to the shared project.** Review and merge into existing live rules with authorized Firebase access; see \`docs/existing-firebase.md\`.
6. Run \`npm run check\`, \`npm run build\`, then \`npm run dev\`.

The Firebase client is configured, but Storage and Firestore permissions must be merged with the existing live rules before all dataset operations will work.

## Firebase hosting

\`firebase.json\` is preconfigured for a Vite single-page app. The existing AI Engine project's DEFAULT Hosting site must not be overwritten. The configured \`ownlayer\` Hosting target must be mapped to a **separate site** in the existing Firebase project before any deploy. See \`docs/existing-firebase.md\`. No deployment is performed automatically by CI.

## Important limits / upcoming work

- In-browser profiling currently reads up to 2 MiB per file (max 50,000 local parsed records). Larger files are **sampled**, not silently labeled fully evaluated.
- Storage policy limits uploaded files to 50 MiB. Production data ingestion requires scalable server-side processing.
- Derived cleaning is allowed only on eligible files no larger than 2 MiB so it never accidentally saves a truncated preview as a complete dataset.
- Source registration records locators but does not yet authenticate or synchronize remote providers.
- Multi-tenant organization roles, privacy scanning, governance approvals, audit logs, enterprise file types, synthetic generation and model training require backend implementation and verification.
- Firebase usage may incur charges; check billing/project requirements before enabling paid services.
- Before using client data, review security rules, consent, retention, encryption and backend operational readiness. A public **code repository** must never contain secrets or customer data.

Original AI Engine project is unchanged. Ownlayer Firestore records and Storage objects use isolated namespaces. The live Firebase rules/site have not been changed.
