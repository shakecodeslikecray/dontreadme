# dontreadme

**Machine-readable codebase context for AI tools. The `.dontreadme/` format is the open standard.**

[![npm version](https://img.shields.io/npm/v/dontreadme.svg)](https://www.npmjs.com/package/dontreadme)
[![license](https://img.shields.io/npm/l/dontreadme.svg)](https://github.com/shakecodeslikecray/dontreadme/blob/main/LICENSE)
![node](https://img.shields.io/node/v/dontreadme.svg)

---

## The Problem

Every AI coding tool -- Claude Code, Cursor, Copilot, Windsurf, Codex -- starts blind. They don't know your architecture, your risk surfaces, your decision history, or which files break when someone touches them. They re-discover the same structure every session. They hallucinate boundaries that don't exist.

The current solutions are all compromised:

| Approach | Tool | What's Wrong |
|----------|------|-------------|
| Monolithic dump | Repomix | Flattens your entire codebase into one file. No structure, no risk, no history. |
| Ephemeral map | Aider RepoMap | Rebuilt every session. Not versioned. Not portable. |
| Hand-written docs | CCS Spec | Requires manual maintenance. Drifts from reality on day one. |
| IDE-locked context | Windsurf Codemaps, Cursor `@` | Locked inside the IDE. Not portable. Not machine-readable. Not versioned. |

None of them generate structured, machine-readable, portable, version-controlled context that any tool can consume.

## What dontreadme Does

`dontreadme` analyzes your codebase and generates a `.dontreadme/` directory containing 9 structured artifacts that describe your project's architecture, risk surfaces, decision history, API boundaries, and behavioral contracts.

```
.dontreadme/
+-- manifest.json              # Index of all artifacts with content hashes
+-- README.md                  # Auto-generated format documentation
+-- architecture.json          # Components, edges, layers, entrypoints
+-- dependency-graph.json      # Module graph, circular deps, hubs
+-- api-surface.json           # Routes, exports, endpoints by framework
+-- decisions/
|   +-- index.json             # Decision log clustered from git history
+-- hotspots.json              # Bug-prone files via git frequency analysis
+-- risk-profile.json          # Security risk assessment by domain
+-- understanding.md           # What this codebase does (LLM-generated)
+-- contracts/
    +-- intent.yml             # Behavioral contracts per function (LLM-generated)
```

Every artifact is deterministic (except the two LLM-generated ones). Same codebase state = same output. Commit the `.dontreadme/` directory and get meaningful git diffs when your architecture changes.

---

## Quickstart

```bash
npm install -g dontreadme
```

```bash
cd your-project
dontreadme init
```

```
dontreadme - initialization

| Not a git repository. Decision log and hotspot analysis will be skipped.
* Scanning codebase... Found 47 source files
* Analyzing codebase... Analysis complete
* Writing artifacts... Artifacts written to .dontreadme/

Detected AI tool configs:
  claude-code - CLAUDE.md (inject)
  cursor - .cursorrules (inject)

? Add codebase context pointers to these files? Yes
+ Updated CLAUDE.md
+ Updated .cursorrules

dontreadme initialized!

  Generated artifacts:
  - 8 components in architecture
  - 3 routes, 22 exports in api-surface
  - 14 decisions from git history
  - 2 hotspot files detected
  - 1 high-risk files

  Next steps:
  1. Review .dontreadme/
  2. Run dontreadme to open the TUI viewer
  3. Run dontreadme generate to regenerate
```

---

## The `.dontreadme/` Format

The format is an open standard. Any tool can read these files -- they're JSON, YAML, and Markdown. The `manifest.json` serves as the index, containing content hashes for every artifact so tools can detect changes without re-reading everything.

```json
{
  "version": "1",
  "generator": "dontreadme",
  "generatorVersion": "0.1.0",
  "generatedAt": "2025-07-15T10:30:00.000Z",
  "codebaseRoot": "/Users/dev/my-project",
  "artifacts": [
    {
      "name": "architecture",
      "path": "architecture.json",
      "hash": "a1b2c3d4...",
      "generatedAt": "2025-07-15T10:30:00.000Z",
      "analyzer": "architecture",
      "deterministic": true
    }
  ]
}
```

All JSON output uses stable key ordering (`stableStringify`). All lists are sorted. This means two runs against the same codebase state produce identical output -- no noise in your diffs.

---

## Artifacts

### `architecture.json`

Maps your codebase into components, dependency edges, topological layers, and entrypoints.

**What it contains:**
- **Components** -- files grouped by directory, each typed as `module`, `component`, `service`, `utility`, `config`, `test`, or `entrypoint`
- **Edges** -- component-to-component dependencies with the specific imports that create them
- **Layers** -- topological sort of components by in-degree (who depends on whom)
- **Entrypoints** -- components with zero incoming edges

**Why it matters:** AI tools can understand module boundaries without reading every file. They know which components are leaves vs. hubs, and which direction dependencies flow.

```json
{
  "components": [
    {
      "name": "src.cli",
      "path": "src/cli",
      "files": ["src/cli/index.ts", "src/cli/commands/generate.ts"],
      "type": "module",
      "exports": ["generateCommand"],
      "imports": ["../analyzers/index.js"]
    }
  ],
  "edges": [
    { "from": "src.cli", "to": "src.analyzers", "imports": ["../analyzers/index.js"] }
  ],
  "layers": [
    { "name": "layer-0", "components": ["src.cli", "src.tui"], "level": 0 },
    { "name": "layer-1", "components": ["src.analyzers"], "level": 1 }
  ],
  "entrypoints": ["src.cli"]
}
```

---

### `dependency-graph.json`

Per-file internal module dependency graph.

**What it contains:**
- **Nodes** -- every source file with its imports, importedBy list, and in/out degree
- **Circular dependencies** -- detected via depth-first search
- **Hubs** -- files imported by 5 or more other files
- **Entrypoints** -- files with zero in-degree (nothing imports them)

**Why it matters:** AI tools can identify the most coupled files before making changes. Circular dependencies and hubs are where refactoring gets dangerous.

```json
{
  "nodes": [
    {
      "file": "src/core/utils.ts",
      "imports": [],
      "importedBy": ["src/writers/index.ts", "src/analyzers/architecture.ts"],
      "inDegree": 0,
      "outDegree": 2
    }
  ],
  "circularDeps": [],
  "hubs": ["src/types.ts"],
  "entrypoints": ["src/cli/index.ts"],
  "totalFiles": 47,
  "totalEdges": 83
}
```

---

### `api-surface.json`

Public API surface: routes, exported symbols, and endpoints.

**What it contains:**
- **Framework detection** -- auto-detects Next.js, Nuxt, Angular, Svelte, Express, Fastify, Hono, Koa, React, Vue from `package.json`
- **Routes** -- extracted per framework (App Router patterns for Next.js, `app.get()` for Express/Hono/Fastify, etc.)
- **Exported symbols** -- functions, classes, consts, types, interfaces, enums, and default exports

**Why it matters:** AI tools know the public contract of your codebase. They can suggest route handlers, understand API boundaries, and avoid breaking public interfaces.

```json
{
  "framework": "next",
  "routes": [
    { "method": "GET", "path": "/api/users", "file": "app/api/users/route.ts" },
    { "method": "POST", "path": "/api/users", "file": "app/api/users/route.ts" }
  ],
  "exports": [
    { "name": "UserService", "type": "class", "file": "src/services/user.ts" }
  ],
  "endpoints": []
}
```

---

### `decisions/index.json`

Decision log mined from git history.

**What it contains:**
- Last 500 commits clustered into logical decisions by type, temporal proximity (2-hour window), and file overlap
- Each decision typed as `feat`, `fix`, `refactor`, `infra`, `docs`, `test`, or `chore`
- Commit hashes, authors, affected files, and date ranges

**Why it matters:** AI tools understand *why* code looks the way it does, not just *what* it is. Before suggesting a refactor, they can see whether the current structure was a deliberate decision.

```json
{
  "decisions": [
    {
      "id": "d-001",
      "type": "feat",
      "summary": "feat: add TUI viewer with artifact navigation",
      "commits": [
        { "hash": "a1b2c3d", "author": "dev", "date": "2025-07-10T14:00:00Z", "message": "feat: add TUI viewer" }
      ],
      "files": ["src/tui/App.tsx", "src/tui/components/ArtifactTree.tsx"],
      "dateRange": { "start": "2025-07-10T14:00:00Z", "end": "2025-07-10T16:30:00Z" }
    }
  ],
  "totalCommitsAnalyzed": 150,
  "dateRange": { "start": "2025-01-01T00:00:00Z", "end": "2025-07-15T10:30:00Z" }
}
```

---

### `hotspots.json`

Bug-prone files identified via git frequency analysis.

**What it contains:**
- Per-file change frequency, unique author count, last modified date
- Composite score: `changeCount x authorCount x recencyWeight`
- Statistical threshold: `mean + 2 x stdDev`
- Files exceeding the threshold marked as hot

**Why it matters:** Hot files are where bugs live. AI tools can apply extra caution when modifying high-churn files, and suggest that these files need tests or refactoring.

**Scoring algorithm:**

```
score = changeFrequency x authorCount x recencyWeight(lastModified)
recencyWeight = max(0.5, 1.0 - (ageInDays / 730))
threshold = mean(allScores) + 2 x stdDev(allScores)
isHot = score > threshold
```

```json
{
  "hotspots": [
    {
      "file": "src/cli/commands/generate.ts",
      "changeFrequency": 8,
      "authorCount": 2,
      "lastModified": "2025-07-14T15:30:00Z",
      "score": 7.45,
      "isHot": true
    }
  ],
  "commitsAnalyzed": 150,
  "threshold": 5.23,
  "mean": 2.1,
  "stdDev": 1.57
}
```

---

### `risk-profile.json`

Security and operational risk assessment.

**What it contains:**
- Files classified by domain: `auth` (base 9), `payment` (10), `api` (7), `database` (7), `file-system` (6), `crypto` (9), `user-data` (7), `admin` (8), `config` (5), `general` (2)
- Risk amplified by hotspot status and external dependency count
- Risk reduced by detected mitigations (tests, validation, rate-limiting, security headers, audit logging)
- Top 10 highest-risk files

**Why it matters:** AI tools know where to be careful. Payment handlers, auth logic, and crypto code get flagged. Files with tests and validation get credit.

**Scoring algorithm:**

```
baseRisk = 2..10 (by domain classification)
hotspotMultiplier = 1.5 (if hot) | 1.0 + (score / (mean x 4)) x 0.5
externalDepFactor = 1 + (externalDepCount x 0.1)
mitigationFactor = max(0.5, 1.0 - mitigationCount x 0.1)
finalScore = baseRisk x hotspotMultiplier x externalDepFactor x mitigationFactor

Severity: critical (>=12) | high (>=8) | medium (>=4) | low (<4)
```

**Detected mitigations:** companion test files, validation patterns, rate-limiting, security headers, audit logging.

```json
{
  "entries": [
    {
      "file": "src/auth/handlers.ts",
      "domain": "auth",
      "baseRisk": 9,
      "hotspotMultiplier": 1.5,
      "externalDepCount": 3,
      "finalScore": 14.85,
      "mitigations": ["has-tests"]
    }
  ],
  "summary": { "critical": 1, "high": 2, "medium": 5, "low": 39 },
  "highestRisk": ["src/auth/handlers.ts", "src/payment/stripe.ts"]
}
```

---

### `understanding.md`

Human and AI-readable narrative of what the codebase does.

**What it contains (Phase 1):** Placeholder with project name, detected framework, primary language, and file count.

**What it will contain (Phase 2):** LLM-generated analysis synthesizing architecture, API surface, and code patterns into a coherent description.

**Why it matters:** This is the "elevator pitch" for your codebase. An AI tool reads this first to orient itself before diving into the structured artifacts.

---

### `contracts/intent.yml`

Behavioral contracts for key functions.

**What it contains (Phase 1):** Placeholder YAML structure with example format.

**What it will contain (Phase 2):** LLM-generated preconditions, postconditions, invariants, and side effects for exported functions.

**Why it matters:** AI tools can reason about function behavior without reading the implementation. They know what a function promises and what it expects.

```yaml
contracts:
  - function: createUser
    file: src/services/user.ts
    preconditions:
      - email must be valid format
      - email must not already exist in database
    postconditions:
      - returns User object with generated id
      - user record exists in database
    invariants:
      - email is stored lowercase
    sideEffects:
      - writes to users table
      - sends welcome email
```

---

## AI Tool Bridge

When you run `dontreadme init`, it detects existing AI tool configuration files in your project and offers to inject a context pointer block. This block tells AI tools where to find the `.dontreadme/` artifacts.

| Tool | Config File | Priority |
|------|------------|----------|
| Claude Code | `CLAUDE.md` | Primary |
| Cursor | `.cursorrules` or `.cursor/rules` | First found |
| GitHub Copilot | `.github/copilot-instructions.md` | Primary |
| Windsurf | `.windsurfrules` | Primary |
| Codex | `AGENTS.md` | Primary |

**Rules:**
- Only modifies files that already exist (never creates new config files)
- Uses `<!-- DONTREADME:START -->` / `<!-- DONTREADME:END -->` markers
- Never overwrites user content -- appends or updates only the marked block
- Asks permission before injecting
- One injection per tool (uses first matching filename)

**Injected block:**

```markdown
<!-- DONTREADME:START -->
# Codebase Context (auto-generated by dontreadme)
This project has machine-readable context in `.dontreadme/`.
- Read `.dontreadme/understanding.md` for what this codebase does
- Read `.dontreadme/architecture.json` for component structure
- Read `.dontreadme/api-surface.json` for routes and exports
- Read `.dontreadme/risk-profile.json` for security-sensitive areas
- Read `.dontreadme/contracts/intent.yml` for behavioral contracts
<!-- DONTREADME:END -->
```

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `dontreadme` | Launch TUI viewer (or run `init` if `.dontreadme/` doesn't exist) |
| `dontreadme init` | Interactive setup + first generation |
| `dontreadme generate` | Regenerate all artifacts |
| `dontreadme generate --only <list>` | Regenerate specific artifacts (comma-separated) |
| `dontreadme diff` | Show changes since last generation |
| `dontreadme watch` | Auto-regenerate on file changes (2s debounce) |
| `dontreadme validate` | Validate `.dontreadme/` artifacts against Zod schemas |
| `dontreadme --version` | Print version |
| `dontreadme --help` | Print help |

### `init`

```bash
dontreadme init          # Interactive setup
dontreadme init --force  # Overwrite existing .dontreadme/
```

Phases: detect git -> scan files -> run analyzers -> write artifacts -> detect bridge files -> prompt for injection.

If the directory already exists, exits with an error unless `--force` is passed. If analysis fails, rolls back the `.dontreadme/` directory.

### `generate --only`

Accepts comma-separated artifact names with short aliases:

| Alias | Artifact |
|-------|----------|
| `arch`, `architecture` | `architecture.json` |
| `deps`, `dep-graph`, `dependency-graph` | `dependency-graph.json` |
| `api`, `api-surface` | `api-surface.json` |
| `decisions` | `decisions/index.json` |
| `hotspots` | `hotspots.json` |
| `risk`, `risk-profile` | `risk-profile.json` |
| `understanding` | `understanding.md` |
| `contracts` | `contracts/intent.yml` |

```bash
dontreadme generate --only arch,api,risk
```

### `watch`

Watches for changes in `**/*.ts`, `**/*.tsx`, `**/*.js`, `**/*.jsx` with a 2-second debounce. Runs a full regeneration on each change.

### `validate`

Validates all artifacts against their Zod schemas. Reports which artifacts pass and which fail with specific validation errors.

---

## TUI Viewer

Running `dontreadme` with no arguments launches an interactive terminal UI built with React + Ink.

```
+-----------------------------------------------------------+
| my-project  v0.1.0  Generated: 2025-07-15 10:30           |
+-------------------+---------------------------------------+
| > manifest.json   | {                                     |
|   architecture    |   "version": "1",                     |
|   dependency-graph|   "generator": "dontreadme",          |
|   api-surface     |   "generatorVersion": "0.1.0",        |
|   decisions/      |   "generatedAt": "2025-07-15T...",    |
|   hotspots        |   "artifacts": [                      |
|   risk-profile    |     {                                 |
|   understanding   |       "name": "architecture",         |
|   contracts/      |       "path": "architecture.json",    |
|                   |       ...                             |
+-------------------+---------------------------------------+
| Tab: switch panel  g: regenerate  ?: help  q: quit        |
+-----------------------------------------------------------+
```

### Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `q` | Global | Quit |
| `Tab` | Global | Toggle focus between tree and content panels |
| `g` | Global | Regenerate artifacts (shows progress overlay) |
| `?` | Global | Show help overlay |
| `Up` / `k` | Tree | Move selection up |
| `Down` / `j` | Tree | Move selection down |
| `Enter` | Tree | Focus selected artifact in content panel |
| `Up` / `k` | Content | Scroll up 1 line |
| `Down` / `j` | Content | Scroll down 1 line |
| `PageUp` | Content | Scroll up by viewport height |
| `PageDown` | Content | Scroll down by viewport height |

---

## How It Works

### Analyzer Execution

Analyzers run in dependency order across 4 levels. Level 0 runs in parallel; subsequent levels run sequentially as they depend on prior results.

```
Level 0 (parallel)
+-- architecture          deterministic   static import/export analysis
+-- dependency-graph      deterministic   per-file import graph + DFS cycle detection
+-- api-surface           deterministic   framework detection + route/export extraction
+-- decisions             deterministic   git log clustering by type + time + files
+-- hotspots              deterministic   git frequency analysis + statistical scoring
    |
Level 1
+-- risk-profile          deterministic   domain classification x hotspot x deps x mitigations
    |
Level 2
+-- understanding         non-deterministic   LLM-generated codebase narrative (placeholder in Phase 1)
    |
Level 3
+-- contracts             non-deterministic   LLM-generated behavioral contracts (placeholder in Phase 1)
```

### Deterministic vs. LLM Analyzers

The 6 deterministic analyzers (architecture, dependency-graph, api-surface, decisions, hotspots, risk-profile) use static analysis, regex parsing, and git history. They produce identical output for identical input.

The 2 LLM analyzers (understanding, contracts) generate placeholder content in Phase 1. When LLM providers are integrated (Phase 2), they will use the deterministic artifacts as context for generation.

### File Discovery

- **Include:** `**/*.ts`, `**/*.tsx`, `**/*.js`, `**/*.jsx`
- **Exclude:** `node_modules`, `dist`, `build`, `.next`, `coverage`, test/spec files, `.d.ts` declarations, minified/bundled JS, `.dontreadme/`
- **Max file size:** 100KB (larger files are skipped)

---

## Comparison

| Feature | dontreadme | Repomix | CCS Spec | Aider RepoMap |
|---------|-----------|---------|----------|---------------|
| **Format** | JSON/YAML/MD (9 artifacts) | Single text file | Hand-written Markdown | In-memory tree |
| **Machine-readable** | Yes (Zod schemas) | No | No | Partially |
| **Risk profiles** | Yes (domain + hotspot + mitigations) | No | No | No |
| **Hotspot detection** | Yes (statistical) | No | No | No |
| **Decision history** | Yes (git-mined) | No | Manual | No |
| **Versioned** | Yes (deterministic output, meaningful diffs) | No | Manual | No (ephemeral) |
| **Automated** | Yes (single command) | Yes | No | Yes |
| **Portable** | Yes (any tool can read) | Somewhat | Yes | No (IDE-locked) |
| **AI tool bridges** | 5 tools | Manual | Manual | Built-in (Aider only) |

---

## Configuration

Configuration is embedded in the `manifest.json` and controlled via the `DontreadmeConfig` schema:

```typescript
{
  version: "1",
  provider?: "claude-code" | "codex" | "gemini" | "aider" | "ollama" | "opencode",
  include: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  exclude: [
    "node_modules", "dist", "build", ".next", "coverage",
    "**/*.test.*", "**/*.spec.*", "**/*.d.ts"
  ]
}
```

### Include/Exclude Patterns

Default patterns cover TypeScript and JavaScript projects. The file discovery engine uses [fast-glob](https://github.com/mrmlnc/fast-glob) syntax.

Additional hardcoded exclusions that are always applied:
- `**/*.min.js` -- minified files
- `**/*.bundle.js` -- bundled files
- `.dontreadme/**` -- the output directory itself

### LLM Providers

Phase 2 will support configurable LLM providers for the `understanding` and `contracts` analyzers:

| Provider | CLI Tool |
|----------|----------|
| `claude-code` | Anthropic Claude Code |
| `codex` | OpenAI Codex |
| `gemini` | Google Gemini |
| `aider` | Aider |
| `ollama` | Local Ollama models |
| `opencode` | OpenCode |

---

## Roadmap

### Phase 1 -- Deterministic Analyzers (current)
- [x] Architecture analysis (components, edges, layers)
- [x] Dependency graph (cycles, hubs, entrypoints)
- [x] API surface (framework detection, routes, exports)
- [x] Decision log (git history clustering)
- [x] Hotspot detection (statistical scoring)
- [x] Risk profiling (domain + hotspot + mitigations)
- [x] AI tool bridge injection (5 tools)
- [x] TUI viewer
- [x] Schema validation
- [x] Placeholder understanding + contracts

### Phase 2 -- LLM-Powered Understanding
- [ ] Provider integration (Claude Code, Codex, Gemini, Aider, Ollama, OpenCode)
- [ ] Understanding analyzer (codebase narrative generation)
- [ ] Contracts analyzer (behavioral contract extraction)
- [ ] Provider auto-detection

### Phase 3 -- Watch, Diff, More Frameworks
- [ ] `diff` command with structured output
- [ ] `watch` with incremental regeneration (only changed artifacts)
- [ ] Python, Go, Rust, Java file discovery
- [ ] Framework support: Django, Flask, FastAPI, Gin, Actix, Spring

### Phase 4 -- Formal Spec + Ecosystem
- [ ] `.dontreadme/` format specification (versioned)
- [ ] JSON Schema published to SchemaStore
- [ ] GitHub Action for CI/CD regeneration
- [ ] VS Code extension for artifact browsing
- [ ] Third-party generator support (any tool can produce `.dontreadme/`)

---

## Contributing

```bash
git clone https://github.com/shakecodeslikecray/dontreadme
cd dontreadme
npm install
npm run dev
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode (tsx) |
| `npm run build` | Build with tsup |
| `npm test` | Run tests (vitest) |
| `npm run test:run` | Run tests once |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type checking |

---

## License

[MIT](LICENSE) -- Copyright (c) 2025 shakecodeslikecray
