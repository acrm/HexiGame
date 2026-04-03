# AI Agent Instructions

This repository uses a dual versioning scheme: marketing semver + technical week bump.

## Communication Language Policy

- In chat: write only in Russian.
- In files: write only in English.

## Game Design Role

- Act as a game designer: collect and maintain the game concept, mechanics, UI, and parameter descriptions.
- After any source code change, review the current design documentation (docs/GAME_LOGIC.md, docs/TODO.md).
- If the change affects the design, update the documentation immediately to keep it accurate.

- **Version format**: `<major>.<minor>.<publicBuild>-y<yy>w<ww>b<weeklyBump>`
  - Example: `0.0.1-y26w14b1`.
  - `major`: marketing major release (changes only on official release milestones).
  - `minor`: marketing platform release number.
  - `publicBuild`: public build number for platform publication artifacts.
  - `y<yy>w<ww>b<weeklyBump>`: technical week and bump index within that week.

- **Version metadata** is stored in `version.json` and mirrored in `package.json`.
  - `version.json` fields:
    - `marketing.major`, `marketing.minor`, `marketing.publicBuild`
    - `technical.year`, `technical.week`, `technical.weeklyBump`
    - `currentVersion`

## Version bump rules for AI agents

Whenever you, as an AI agent, finish a task that involves **any change to tracked files**, you **must** bump the build version using the helper script and include a short English description of the change.

### Commands

- **Bump technical/version note only** (most common for agent tasks):
  - `npm run bump:build -- --desc "Short summary of changes"`
- **Bump public build for platform artifact pipeline only**:
  - `npm run bump:build -- --public-build --desc "Build platform artifacts"`
- **Bump minor + reset public build to 0** (for platform release train update):
  - `npm run bump:minor -- --desc "Short summary of changes"`
- **Version files only mode** (when non-version files are pre-staged manually):
  - `npm run bump:build -- --version-only --desc "Short summary of changes"`

### Behaviour

- By default, the script stages and commits the **entire working tree**.
- In `--version-only` mode, the script stages only `version.json`, `package.json`, and `build-notes.md`; all other files must be pre-staged before running bump.
- The script updates:
  - `version.json` (`marketing`, `technical`, `currentVersion`).
  - `package.json` (`version` field).
  - Appends an entry to `build-notes.md` with the new version and description.
  - `marketing.publicBuild` is changed only by `--public-build` and by `--minor` reset.
  - On `--minor`, generates release notes file `changelogs/v<major>.<minor>.md` from previous minor entries in `build-notes.md`.
- If `--desc` is omitted, the script will try to use the latest git commit message.

### Commit messages

- The bump script creates commit messages automatically with the **new version string**.
  - Example: `0.1.0-y26w14b3: platform minor release`.

Always run the appropriate bump command **after** your code changes are applied.

## Git commit workflow

**Standard process for any task with file changes:**

1. Apply all code changes
2. Run version bump: `npm run bump:build -- --desc "Description"`
3. Do **not** run a separate `git add` / `git commit`; bump script commits automatically.

**Optional process for pre-staged commit scope:**

1. Stage only intended non-version files manually.
2. Run: `npm run bump:build -- --version-only --desc "Description"`
3. Do **not** run a separate `git commit`.

**For critical bug fixes** (game doesn't render, major visual corruption, etc.):

If the fix requires multiple attempts:
1. Apply the corrective changes
2. Run version bump: `npm run bump:build -- --desc "Fix details"`
3. Avoid manual squash/extra commit by default; each bump creates a versioned commit.

This keeps commit history versioned through bump operations.
