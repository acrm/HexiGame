#!/usr/bin/env node
// Writes a timestamp signal file to trigger a hard reload in the Vite dev server.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const signalPath = path.resolve(__dirname, '..', '.dev-reload');
fs.writeFileSync(signalPath, String(Date.now()));
process.stdout.write('dev reload triggered\n');
