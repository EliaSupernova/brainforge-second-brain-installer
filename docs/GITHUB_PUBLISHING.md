# GitHub Publishing Guide

BrainForge is ready to be placed in a normal GitHub repository. The user or maintainer still needs to choose the account and repository name.

## Suggested Repository

```text
brainforge-second-brain-installer
```

## First Publish

```bash
git init -b main
git add .
git commit -m "Initial BrainForge MVP"
git remote add origin https://github.com/YOUR-ORG/brainforge-second-brain-installer.git
git push -u origin main
```

## Required GitHub Settings

- Enable GitHub Actions.
- Protect `main` after the first push.
- Require the CI workflow before merging pull requests.
- Use private security advisories for vulnerability reports.
- Do not commit real AI exports, generated vaults, or `.brainforge` backups.

## Release Flow

1. Update `CHANGELOG.md`.
2. Run `npm run check`.
3. Run `npm test`.
4. Run `npm run smoke`.
5. Run `npm pack --dry-run`.
6. Create a GitHub release tag such as `v0.1.0`.
7. Attach the npm pack output only if publishing outside npm is desired.

## Clone Install For Users

```bash
git clone https://github.com/YOUR-ORG/brainforge-second-brain-installer.git
cd brainforge-second-brain-installer
npm install
npm run build
npm link
brainforge setup
```
