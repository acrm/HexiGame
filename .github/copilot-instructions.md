# HexiGame — AI Agent Instructions

## Communication & Workflow

- **Chat language:** Russian only
- **Code language:** English only  
- **Commit messages:** Include version string, e.g. `25w48-0.3: feature summary`

## Game Design Role

- Act as a game designer: collect and maintain the game concept, mechanics, UI, and parameter descriptions.
- After any source code change, review the current design documentation (docs/GAME_LOGIC.md, docs/Scoring.md, docs/TODO.md).
- If the change affects the design, update the documentation immediately to keep it accurate.

## Version Management

After **any tracked file change**, bump version immediately:

```bash
npm run bump:build -- --desc "Short English summary"     # common: build only
npm run bump:minor -- --desc "Large feature/breaking"    # less common
```

This updates `version.json`, `package.json`, and `build-notes.md`. Version format: `<weekCode>-<minor>.<build>` (e.g., `25w48-0.50`).

## Development Commands

```bash
npm run dev              # Vite dev server with HMR
npm run build            # Production build → dist/
npm run typecheck        # TypeScript check (no emit)
npm run bump:build -- --desc "msg"  # Bump build version
npm run bump:minor -- --desc "msg"  # Bump minor version
```

## Key Documentation

Refer to these files for project details — do not cite their content, only link:

- **`docs/GAME_LOGIC.md`** — game mechanics, parameters, state model
- **`docs/Scoring.md`** — scoring system details
- **`docs/TODO.md`** — planned features
- **`src/logic/pureLogic.ts`** — pure game logic (TypeScript, immutable state updates)
- **`src/components/Game.tsx`** — React root component, event handlers
- **`src/components/GameField.tsx`** — canvas rendering and input dispatch
