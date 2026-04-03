#!/usr/bin/env node
/*
  Public platform version updater.
  Version format: <major>.<minor>.<publicBuild>-y<yy>w<ww>b<weeklyBump>
  Example: 0.0.1-y26w14b1

  Usage:
    node scripts/update-version.js --desc "Short description"
    node scripts/update-version.js --minor --desc "Minor release description"
    node scripts/update-version.js --version-only --desc "Stage only version files"

  If --minor is passed, marketing minor is incremented and publicBuild resets to 0.
  Otherwise only publicBuild is incremented.

  Technical weekly bump is incremented on every bump and reset to 1
  when calendar week changes.

  By default, the script stages and commits the entire working tree.
  Pass --version-only to stage only version files.
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const versionFile = path.join(rootDir, 'version.json');
const notesFile = path.join(rootDir, 'build-notes.md');
const pkgFile = path.join(rootDir, 'package.json');
const changelogDir = path.join(rootDir, 'changelogs');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function getArgs() {
  const args = process.argv.slice(2);
  const result = { minor: false, all: true, versionOnly: false, desc: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--minor') {
      result.minor = true;
    } else if (a === '--all') {
      result.all = true;
    } else if (a === '--version-only') {
      result.versionOnly = true;
      result.all = false;
    } else if (a === '--desc') {
      result.desc = args[i + 1] ?? '';
      i++;
    }
  }
  return result;
}

function getLastCommitMessage() {
  try {
    const msg = execSync('git log -1 --pretty=%B', { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .split('\n')[0];
    return msg || null;
  } catch {
    return null;
  }
}

function getIsoWeekInfo() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const year = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return { year, week };
}

function parseLegacyWeekCode(weekCode) {
  const match = /^([0-9]{4})w([0-9]{1,2})$/i.exec(String(weekCode ?? ''));
  if (!match) return null;
  return { year: Number(match[1]), week: Number(match[2]) };
}

function formatVersion(state) {
  const yy = String(state.technical.year).slice(-2).padStart(2, '0');
  const ww = String(state.technical.week).padStart(2, '0');
  return `${state.marketing.major}.${state.marketing.minor}.${state.marketing.publicBuild}-y${yy}w${ww}b${state.technical.weeklyBump}`;
}

function normalizeVersionState(meta) {
  const weekNow = getIsoWeekInfo();

  if (meta?.marketing && meta?.technical) {
    const marketingMajor = Number(meta.marketing.major) || 0;
    const marketingMinor = Number(meta.marketing.minor) || 0;
    const publicBuild = Number(meta.marketing.publicBuild) || 0;
    const year = Number(meta.technical.year) || weekNow.year;
    const week = Number(meta.technical.week) || weekNow.week;
    const weeklyBump = Number(meta.technical.weeklyBump) || 0;

    return {
      marketing: { major: marketingMajor, minor: marketingMinor, publicBuild },
      technical: { year, week, weeklyBump },
      currentVersion: meta.currentVersion || '',
    };
  }

  const legacyMinor = Number(meta?.minor) || 0;
  const legacyBuild = Number(meta?.build) || 0;
  const legacyWeek = parseLegacyWeekCode(meta?.weekCode);

  return {
    marketing: {
      major: 0,
      minor: legacyMinor,
      publicBuild: legacyBuild,
    },
    technical: {
      year: legacyWeek?.year || weekNow.year,
      week: legacyWeek?.week || weekNow.week,
      weeklyBump: legacyBuild,
    },
    currentVersion: meta?.currentVersion || '',
  };
}

function updatePackageJson(newVersion) {
  const pkg = readJson(pkgFile);
  pkg.version = newVersion;
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

function appendBuildNote(newVersion, description) {
  const line = `- ${newVersion} — ${description}`;
  if (!fs.existsSync(notesFile)) {
    fs.writeFileSync(notesFile, `# Build Notes\n\n${line}\n`, 'utf8');
  } else {
    fs.appendFileSync(notesFile, `\n${line}\n`, 'utf8');
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMinorBuildNotes(major, minor) {
  if (!fs.existsSync(notesFile)) {
    return [];
  }

  const prefix = `${major}.${minor}.`;
  const regex = new RegExp(`^-\\s+${escapeRegex(prefix)}\\d+(?:-[^\\s]+)?\\s+—\\s+(.+)$`);
  const lines = fs.readFileSync(notesFile, 'utf8').split(/\r?\n/);

  return lines
    .map((line) => line.trim())
    .filter((line) => regex.test(line))
    .map((line) => line.replace(/^-\s+/, ''));
}

function generateMinorChangelog(newMajor, newMinor, sourceMajor, sourceMinor) {
  ensureDir(changelogDir);
  const changelogPath = path.join(changelogDir, `v${newMajor}.${newMinor}.md`);
  const lines = extractMinorBuildNotes(sourceMajor, sourceMinor);
  const content = [
    `# Release ${newMajor}.${newMinor}.0`,
    '',
    `Source minor: ${sourceMajor}.${sourceMinor}.x`,
    '',
    lines.length > 0 ? '## Included Changes' : '## Included Changes',
    '',
    ...(lines.length > 0 ? lines.map((line) => `- ${line}`) : ['- No build notes found for the previous minor.']),
    '',
  ].join('\n');

  fs.writeFileSync(changelogPath, content, 'utf8');
  return path.relative(rootDir, changelogPath).replace(/\\/g, '/');
}

function stageVersionFiles(extraFiles = []) {
  execFileSync('git', ['add', '--', 'version.json', 'package.json', 'build-notes.md', ...extraFiles], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
}

function autoCommitVersionChanges(newVersion, description, stageAll, extraVersionFiles = []) {
  const commitMsg = `${newVersion}: ${description}`;
  try {
    if (stageAll) {
      execFileSync('git', ['add', '-A'], {
        cwd: rootDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
      });
    } else {
      stageVersionFiles(extraVersionFiles);
    }

    execFileSync('git', ['commit', '-m', commitMsg], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
  } catch (err) {
    const stdout = typeof err.stdout === 'string' ? err.stdout.trim() : '';
    const stderr = typeof err.stderr === 'string' ? err.stderr.trim() : '';

    console.error('[update-version] Auto-commit failed.');
    if (stdout) console.error(stdout);
    if (stderr) console.error(stderr);

    throw new Error('Failed to auto-commit version changes. See logs above.');
  }
}

function main() {
  const args = getArgs();
  const rawMeta = readJson(versionFile);
  const state = normalizeVersionState(rawMeta);
  const weekNow = getIsoWeekInfo();

  const sameWeek = state.technical.year === weekNow.year && state.technical.week === weekNow.week;
  state.technical.year = weekNow.year;
  state.technical.week = weekNow.week;
  state.technical.weeklyBump = sameWeek ? state.technical.weeklyBump + 1 : 1;

  let generatedChangelog = null;

  if (args.minor) {
    const sourceMajor = state.marketing.major;
    const sourceMinor = state.marketing.minor;

    state.marketing.minor += 1;
    state.marketing.publicBuild = 0;
    generatedChangelog = generateMinorChangelog(
      state.marketing.major,
      state.marketing.minor,
      sourceMajor,
      sourceMinor,
    );
  } else {
    state.marketing.publicBuild += 1;
  }

  const newVersion = formatVersion(state);

  const description = args.desc?.trim() || getLastCommitMessage() || 'No description provided.';

  const updated = {
    marketing: state.marketing,
    technical: state.technical,
    currentVersion: newVersion,
  };
  writeJson(versionFile, updated);
  updatePackageJson(newVersion);
  appendBuildNote(newVersion, description);

  // Auto-commit version changes
  autoCommitVersionChanges(
    newVersion,
    description,
    args.all && !args.versionOnly,
    generatedChangelog ? [generatedChangelog] : [],
  );

  // Print version to allow other tools/agents to read it easily.
  // Example: node scripts/update-version.js --desc "Fix joystick position"
  console.log(newVersion);
}

main();
