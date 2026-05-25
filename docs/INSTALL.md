# Install BrainForge From GitHub

BrainForge is designed to be downloadable from GitHub and runnable as a local CLI plus Claude Code/Codex plugin-style adapter.

## Requirements

- Node.js 22 or newer.
- npm.
- Optional: Obsidian for browsing the generated vault.
- Optional: Ollama for stronger local neural embeddings.

## Clone And Install

```bash
git clone https://github.com/YOUR-ORG/brainforge.git
cd brainforge
npm install
npm run build
npm link
```

## First Run

```bash
brainforge setup
```

BrainForge creates:

- `~/AI-Brain`
- `~/Desktop/BrainForge-Imports`

Put ChatGPT, Claude, Codex, Markdown, or text exports into the imports folder, then run:

```bash
brainforge import
brainforge review
brainforge review --approve ID
brainforge doctor
```

For complex work, start the built-in company workflow:

```bash
brainforge company start --objective "Set up my private AI second brain"
brainforge company status
```

When a phase is done, advance it:

```bash
brainforge company advance --summary "Initial plan completed" --evidence "files or checks used"
```

## Configure Claude Code And Codex

BrainForge does not edit global configs by default. To back up and configure Claude Code and Codex:

```bash
brainforge setup --configure
```

The friendlier plugin-style alias does the same safe setup:

```bash
brainforge plugin install
```

For unattended local testing only:

```bash
brainforge plugin install --yes
```

To inspect the packaged local plugin bundle without editing config:

```bash
brainforge plugin info
```

## Stronger Local Embeddings

Default mode is `auto`, which tries Ollama and falls back to private deterministic hash vectors. To require Ollama:

```bash
ollama pull embeddinggemma
brainforge import --embedding-provider ollama --embedding-model embeddinggemma
```

## Verify

```bash
npm run verify
```

Or run the individual checks:

```bash
npm test
npm run smoke
npm pack --dry-run
```

Use strict doctor when you want warnings to fail automation:

```bash
brainforge doctor --strict
```

## Publish From A Clone

See [GITHUB_PUBLISHING.md](GITHUB_PUBLISHING.md) for the first GitHub push, release tags, and repository settings.
