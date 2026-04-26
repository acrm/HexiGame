const fs = require('fs');
let css = fs.readFileSync('src/ui/components/Game.css', 'utf8');

// Strip all current before/after that have ║ or │ so we can start clean
const lines = css.split('\n');
let out = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('::before') || lines[i].includes('::after')) {
    if (lines[i].includes('border-') || lines[i].includes('content:') || lines[i].includes('left:') || lines[i].includes('right:')) {
      // keep
    }
  }
}
