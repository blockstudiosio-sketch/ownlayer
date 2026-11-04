# Reusing the existing Firebase project safely

Confirmed Firebase project: `ai-engine-8ab26`. Ownlayer uses the same **Firebase Authentication** user pool, but does **not** overwrite the AI Engine site or use its Firestore user records for datasets.

## Separation

- GitHub repository: `blockstudiosio-sketch/ownlayer`
- Default (existing) Hosting site: **reserved for AI Engine**; never deploy Ownlayer there.
- New Hosting **site**: create a second site in the **same Firebase project** and apply the Hosting target name `ownlayer`. Never substitute the default site ID.
- Firestore data: `ownlayerUsers/{uid}/datasets/{datasetId}` and `ownlayerUsers/{uid}/sources/{sourceId}`.
- Cloud Storage: `ownlayer/users/{uid}/datasets/{datasetId}/...`.
- Firebase Auth: shared with AI Engine; only authorized users can access their own records in the new namespace.

## Required authorization before live data works

1. Sign into the existing project in Firebase Console, with the project owner account.
2. Check Email/Password provider in Authentication; enable only if appropriate to existing account policy.
3. Check whether Cloud Storage is provisioned and whether billing is required. Do not change the old bucket configuration.
4. **Merge** the Ownlayer Firestore rules in `firestore.rules` into the project's current live rules. These files are fragments, **not complete safe replacements**.
5. **Merge** the Ownlayer Storage rules in `storage.rules` into the current live storage rules. Review paths and content types with real upload tests.
6. In Firebase Hosting, create a **new site**; identify its actual site ID.
7. In a trusted authorized workstation, run `firebase target:apply hosting ownlayer <NEW_HOSTING_SITE_ID> --project ai-engine-8ab26`; then `npm run build` and `firebase deploy --only hosting:ownlayer --project ai-engine-8ab26`.
8. Validate Email/Password login, Firestore reads/writes, Storage upload/download, and the old AI Engine site **before and after** any rules deployment.

## Safety interlock

`firebase.json` includes **Hosting only**, with a named target `ownlayer`. It intentionally does not include Firestore or Storage deployment entries so `firebase deploy` cannot replace shared AI Engine rules by accident. No credentials, service-account JSON or access tokens are committed to GitHub.

As of this change, only the repository configuration is ready. The actual new Firebase Hosting site, rules merge, credentials authorization and end-to-end cloud verification have **not** occurred.
