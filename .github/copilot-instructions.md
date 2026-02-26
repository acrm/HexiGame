# HexiGame — AI Agent Instructions

## Communication & Workflow

- **Chat language:** Russian only
- **Code language:** English only  
- **Commit messages:** Include version string, e.g. `25w48-0.3: feature summary`

## Game Design Role

- Act as a game designer: collect and maintain the game concept, mechanics, UI, and parameter descriptions.
- After any source code change, review the current design documentation (docs/GAME_LOGIC.md, docs/TODO.md).
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

## Git Commit Workflow

**For any task with file changes:**

1. Apply code changes
2. Bump version: `npm run bump:build -- --desc "Description"`
3. Commit with version in message:
   ```bash
   git add -A && git commit -m "<version>: <description>"
   ```

**For critical bug fixes** (game broken/unrendered):
- If already committed, use squash commit to preserve original description:
  ```bash
  git add -A && git reset --soft HEAD~1 && git commit -m "<new version>: <original description>"
  ```
- This updates version while keeping functional description unchanged

## Key Documentation

Refer to these files for project details — do not cite their content, only link:

- **`docs/GAME_LOGIC.md`** — game mechanics, parameters, state model
- **`docs/TODO.md`** — planned features
- **`src/logic/pureLogic.ts`** — pure game logic (TypeScript, immutable state updates)
- **`src/components/Game.tsx`** — React root component, event handlers
- **`src/components/GameField.tsx`** — canvas rendering and input dispatch
