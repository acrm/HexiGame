#!/usr/bin/env node
/*
  Weekly snapshot version updater.
  Version format: <weekCode>-<minor>.<build>
  Example: 25w48-0.1

  Usage:
    node scripts/update-version.js --desc "Short description"
    node scripts/update-version.js --minor --desc "Minor bump description"

  If --minor is passed, minor is incremented and build is reset to 1.
  Otherwise only build is incremented.

  Description is appended to build-notes.md together with new version.
  If --desc is not provided, the script will try to use the last commit
  message from git.
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const versionFile = path.join(rootDir, 'version.json');
const notesFile = path.join(rootDir, 'build-notes.md');
const pkgFile = path.join(rootDir, 'package.json');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function getArgs() {
  const args = process.argv.slice(2);
  const result = { minor: false, desc: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--minor') {
      result.minor = true;
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

function formatVersion(weekCode, minor, build) {
  return `${weekCode}-${minor}.${build}`;
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

function main() {
  const args = getArgs();
  const meta = readJson(versionFile);

  let { weekCode, minor, build } = meta;

  if (args.minor) {
    minor += 1;
    build = 1;
  } else {
    build += 1;
  }

  const newVersion = formatVersion(weekCode, minor, build);

  const description = args.desc?.trim() || getLastCommitMessage() || 'No description provided.';

  const updated = { ...meta, minor, build, currentVersion: newVersion };
  writeJson(versionFile, updated);
  updatePackageJson(newVersion);
  appendBuildNote(newVersion, description);

  // Print version to allow other tools/agents to read it easily.
  // Example: node scripts/update-version.js --desc "Fix joystick position"
  console.log(newVersion);
}

main();
