# Build System and Versioning

## Technology Stack

### Build Tool: Vite

**Version**: 5.0.0

**Configuration**: `vite.config.mts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'))
const version = packageJson.version

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(version),
  },
})
```

**Features**:
- React plugin for JSX/TSX
- Hot module replacement (HMR)
- TypeScript compilation
- Environment variable injection (APP_VERSION)

### Package Manager: npm

**Lock file**: `package-lock.json` (committed)

### TypeScript

**Version**: 5.4.0

**Configuration**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Key settings**:
- Strict mode enabled
- React JSX transform
- No emit (Vite handles bundling)

## Versioning Scheme

### Format: Weekly Snapshots

Inspired by Minecraft:

```
<weekCode>-<minor>.<build>
```

**Components**:
- `weekCode`: Calendar week code (e.g., `25w48` = week 48 of 2025)
- `minor`: Minor snapshot number within the week (starts at 0)
- `build`: Build number within the minor snapshot (starts at 1)

**Example**: `25w48-0.47`
- Week: 48 of 2025
- Minor: 0
- Build: 47

### Version Storage

**Files**:
1. `version.json` (source of truth)
2. `package.json` (mirrored for npm compatibility)

**version.json**:
```json
{
  "currentVersion": "25w48-0.47",
  "weekCode": "25w48",
  "minor": 0,
  "build": 47
}
```

**package.json** (version field):
```json
{
  "version": "25w48-0.47"
}
```

## Version Bump Scripts

### update-version.js

**Location**: `scripts/update-version.js`

**Purpose**: Increment version and update files

**Usage**:

```bash
# Bump build number (most common)
npm run bump:build -- --desc "Short summary of changes"

# Bump minor number (reset build to 1)
npm run bump:minor -- --desc "Short summary of changes"
```

**Script commands** (package.json):

```json
{
  "scripts": {
    "bump:build": "node scripts/update-version.js",
    "bump:minor": "node scripts/update-version.js --minor"
  }
}
```

### Bump Behavior

**Build bump** (default):
- Increment `build` by 1
- Keep `weekCode` and `minor` unchanged
- Example: `25w48-0.47` → `25w48-0.48`

**Minor bump** (`--minor` flag):
- Increment `minor` by 1
- Reset `build` to 1
- Keep `weekCode` unchanged
- Example: `25w48-0.47` → `25w48-1.1`

**Week code**: Not auto-updated (manual change in version.json when new week starts)

### Build Notes

**File**: `build-notes.md`

**Purpose**: Changelog with version history

**Format**:

```markdown
- 25w48-0.47 — Turtle render pivots on protagonist; add 6-tick post-release/drop cooldown gating action mode

- 25w48-0.46 — Enforce protagonist/captured adjacency; add desktop click & mobile tap cursor focus

- 25w48-0.45 — Mobile ACT button now holds action mode and always resets on touch release (even outside); adjacency gating preserved
```

**Update**: Appended automatically by bump script if `--desc` provided

**Manual entry**: If `--desc` omitted, use latest git commit message

## Build Commands

### Development

```bash
npm run dev
```

**Effect**: Start Vite dev server with HMR

**Port**: 5173 (default)

**Hot reload**: Yes

### Production Build

```bash
npm run build
```

**Effect**: Bundle and minify for production

**Output**: `dist/` directory

**Assets**: Hashed filenames for cache busting

### Preview Production Build

```bash
npm run preview
```

**Effect**: Serve production build locally

**Purpose**: Test production bundle before deployment

### Type Checking

```bash
npm run typecheck
```

**Effect**: Run TypeScript compiler without emitting files

**Purpose**: Catch type errors without building

## Deployment

**Not automated**: Manual deployment process

**Typical workflow**:
1. `npm run build`
2. Upload `dist/` contents to web server
3. Serve static files

**No CI/CD**: GitHub Actions not configured

**Future**: Could add GitHub Pages or Vercel deployment

## Version Display

### In Title Bar

**Code**: `src/index.tsx`

```typescript
const version = (import.meta as any).env.APP_VERSION
const baseTitle = document.title || 'HexiGame'

if (version) {
  if (import.meta.env.DEV || import.meta.env.MODE === 'preview') {
    document.title = `${baseTitle} — ${version} (local)`
  } else {
    document.title = `${baseTitle} — ${version}`
  }
}
```

**Result**:
- Dev mode: "HexiGame — 25w48-0.47 (local)"
- Production: "HexiGame — 25w48-0.47"

### Vite Environment Variables

**Injected via vite.config.mts**:

```typescript
define: {
  'import.meta.env.APP_VERSION': JSON.stringify(version),
}
```

**Access in code**:

```typescript
const version = import.meta.env.APP_VERSION
```

**Note**: `import.meta.env` is Vite-specific (not standard)

## Dependencies

### Production Dependencies

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

**Minimal**: Only React runtime required

### Development Dependencies

```json
{
  "@types/react": "^18.3.27",
  "@types/react-dom": "^18.3.7",
  "@vitejs/plugin-react": "^5.1.1",
  "typescript": "^5.4.0",
  "vite": "^5.0.0"
}
```

**Purpose**: Build tools and type definitions

## File Structure

```
HexiGame/
├── src/
│   ├── components/
│   │   ├── Game.tsx
│   │   ├── GameField.tsx
│   │   ├── PaletteCluster.tsx
│   │   ├── ControlsInfoDesktop.tsx
│   │   ├── ControlsInfoMobile.tsx
│   │   └── Game.css
│   ├── logic/
│   │   └── pureLogic.ts
│   └── index.tsx
├── docs/
│   ├── GAME_LOGIC.md
│   ├── Scoring.md
│   └── migration/
│       ├── 00-OVERVIEW.md
│       ├── 01-GAME-MECHANICS.md
│       └── ...
├── scripts/
│   └── update-version.js
├── index.html
├── package.json
├── package-lock.json
├── version.json
├── tsconfig.json
├── vite.config.mts
├── build-notes.md
├── AI_AGENT_INSTRUCTIONS.md
└── README.md (if exists)
```

## Build Output

**Directory**: `dist/`

**Contents**:
- `index.html` (entry point)
- `assets/` (bundled JS/CSS with hashes)
  - `index-[hash].js`
  - `index-[hash].css`

**Ignored**: `.gitignore` excludes `dist/`

## Browser Support

**Target**: Modern browsers (ES2020)

**Tested**:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest, including iOS)

**Not supported**: IE11 (ES5 transpilation not configured)

## Development Workflow

### AI Agent Workflow (from AI_AGENT_INSTRUCTIONS.md)

**Rule**: After any code change, bump version before committing

**Steps**:
1. Make code changes
2. Run `npm run bump:build -- --desc "Summary of changes"`
3. Commit with version in message: `git commit -m "25w48-0.48: Summary of changes"`
4. Push to repository

**Language policy**:
- Chat/commits: Russian
- Code/comments/docs: English

### Manual Workflow

**Normal development**:
1. `npm run dev` (start dev server)
2. Edit files (auto-reload)
3. `npm run typecheck` (verify types)
4. `npm run build` (test production build)
5. Bump version if ready to commit
6. Commit and push

## Version History

See `build-notes.md` for complete history.

**Current version**: 25w48-0.47

**Total builds**: 47 in this week

**Last change**: Turtle render pivots on protagonist; add 6-tick post-release/drop cooldown

## Configuration Files

### .gitignore

**Ignored**:
- `node_modules/`
- `dist/`
- `.DS_Store`
- `*.log`

**Committed**:
- `package-lock.json` (dependency lock)
- Source files
- Config files

### .editorconfig (if exists)

Recommended settings:
```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

## Environment Modes

### Development (`npm run dev`)

- `import.meta.env.DEV` = `true`
- `import.meta.env.PROD` = `false`
- `import.meta.env.MODE` = `"development"`

### Production (`npm run build`)

- `import.meta.env.DEV` = `false`
- `import.meta.env.PROD` = `true`
- `import.meta.env.MODE` = `"production"`

### Preview (`npm run preview`)

- `import.meta.env.DEV` = `false`
- `import.meta.env.PROD` = `true`
- `import.meta.env.MODE` = `"preview"`

## Code Quality

**Linting**: Not configured (no ESLint)

**Formatting**: Not configured (no Prettier)

**Testing**: Not configured (no test framework)

**Type checking**: TypeScript strict mode enabled

## Future Improvements

### Potential Additions

- ESLint for code quality
- Prettier for formatting
- Vitest for unit tests
- GitHub Actions for CI/CD
- Automatic changelog generation
- Semantic versioning option
- Environment-specific configs
- Source maps in production (currently disabled)

### Week Code Auto-Update

Script could auto-detect current week:

```javascript
const now = new Date()
const weekNumber = getWeekNumber(now)
const weekCode = `${now.getFullYear() % 100}w${weekNumber}`
```

Not currently implemented (manual update).
