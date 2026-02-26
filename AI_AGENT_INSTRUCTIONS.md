# AI Agent Instructions

This repository uses a weekly snapshot versioning scheme inspired by Minecraft.

## Communication Language Policy

- In chat: write only in Russian.
- In files: write only in English.

## Game Design Role

- Act as a game designer: collect and maintain the game concept, mechanics, UI, and parameter descriptions.
- After any source code change, review the current design documentation (docs/GAME_LOGIC.md, docs/TODO.md).
- If the change affects the design, update the documentation immediately to keep it accurate.

- **Version format**: `<weekCode>-<minor>.<build>`
  - `weekCode`: calendar week code, e.g. `25w48`.
  - `minor`: minor snapshot number within the week, starting from `0`.
  - `build`: build number within the minor snapshot, starting from `1`.
  - Example: `25w48-0.1`.

- **Version metadata** is stored in `version.json` and mirrored in `package.json`.

## Version bump rules for AI agents

Whenever you, as an AI agent, finish a task that involves **any change to tracked files**, you **must** bump the build version using the helper script and include a short English description of the change.

### Commands

- **Bump build only** (most common):
  - `npm run bump:build -- --desc "Short summary of changes"`
- **Bump minor + reset build to 1** (for larger feature groupings or breaking changes):
  - `npm run bump:minor -- --desc "Short summary of changes"`

### Behaviour

- The script updates:
  - `version.json` (`currentVersion`, `minor`, `build`).
  - `package.json` (`version` field).
  - Appends an entry to `build-notes.md` with the new version and description.
- If `--desc` is omitted, the script will try to use the latest git commit message.

### Commit messages

- Include the **new version string** in the commit message when committing changes.
  - Example: `25w48-0.3: adjust mobile joystick visuals`.

Always run the appropriate bump command **after** your code changes are applied and before suggesting a commit message.

## Git commit workflow

**Standard process for any task with file changes:**

1. Apply all code changes
2. Run version bump: `npm run bump:build -- --desc "Description"`
3. Stage and commit immediately:
   ```bash
   git add -A && git commit -m "<version>: <description from bump>"
   ```

**For critical bug fixes** (game doesn't render, major visual corruption, etc.):

If the fix requires multiple attempts and you've already committed once:
1. Apply the corrective changes
2. Run version bump: `npm run bump:build -- --desc "Fix details"`
3. Squash into previous commit with new version:
   ```bash
   git add -A && git reset --soft HEAD~1 && git commit -m "<new version>: <original functional description>"
   ```

This preserves the original feature/bugfix description while updating the version number.
