# HexiGame — AI Agent Instructions

## Communication & Workflow

- **Chat language:** Russian only
- **Code language:** English only  
- **Commit messages:** Include version string, e.g. `0.0.1-y26w14b1: feature summary`

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

Default bump behavior stages and commits the whole working tree, then updates `version.json`, `package.json`, and `build-notes.md`.

Special mode (version files only):

```bash
npm run bump:build -- --version-only --desc "Short English summary"
```

In `--version-only` mode the script stages only version files, so all other intended file changes must be pre-staged before running bump.

Version format: `<major>.<minor>.<publicBuild>-y<yy>w<ww>b<weeklyBump>` (e.g., `0.0.1-y26w14b1`).

Version semantics:
- `major` — marketing major, updated only on official release milestones.
- `minor` — marketing minor release for platform updates.
- `publicBuild` — platform artifact build number.
- `y<yy>w<ww>b<weeklyBump>` — technical year/week and weekly bump index.

`npm run bump:build` does not change `publicBuild` by default.
`npm run bump:build -- --public-build` increments `publicBuild` (platform artifacts pipeline only).
`npm run bump:minor` increments `minor`, resets `publicBuild` to `0`, and generates `changelogs/v<major>.<minor>.md` from previous minor entries in `build-notes.md`.

## Development Commands

```bash
npm run dev              # Vite dev server with HMR
npm run build            # Production build → dist/
npm run typecheck        # TypeScript check (no emit)
npm run bump:build -- --desc "msg"  # Bump build version
npm run bump:minor -- --desc "msg"  # Bump minor version
```

## Git Commit Workflow

**CRITICAL: No separate manual commit after version bump**

After every version bump, the `npm run bump:build` / `npm run bump:minor` script already creates the commit automatically using the version message.

**For any task with file changes:**

1. Apply code changes.
2. Run bump (default all-staged behavior): `npm run bump:build -- --desc "Description"`.
3. Do **not** run an additional `git add` / `git commit` after bump.

**Version-only mode workflow (optional):**

1. Pre-stage only the non-version files you want in commit.
2. Run bump: `npm run bump:build -- --version-only --desc "Description"`.
3. Do **not** run extra commit commands.

**For critical bug fixes** (game broken/unrendered):
- Keep functional context in the bump description (`--desc`) and run one more bump if needed.
- Avoid manual squash/extra commit by default, because bump script already commits.

## Key Documentation

Refer to these files for project details — do not cite their content, only link:

- **`docs/GAME_LOGIC.md`** — game mechanics, parameters, state model
- **`docs/TODO.md`** — planned features
- **`src/logic/pureLogic.ts`** — pure game logic (TypeScript, immutable state updates)
- **`src/components/Game.tsx`** — React root component, event handlers
- **`src/components/GameField.tsx`** — canvas rendering and input dispatch
