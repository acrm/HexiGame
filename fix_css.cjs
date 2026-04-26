const fs = require('fs');
let css = fs.readFileSync('src/ui/components/Game.css', 'utf8');

// Remove before/after pseudo-elements for absolute positioning
css = css.replace(/\.gs-session-body::before[\s\S]*?\{\s*left:\s*0;\s*\}/g, '');
css = css.replace(/\.gs-language-bar::before[\s\S]*?\{\s*left:\s*0;\s*\}/g, '');
css = css.replace(/\.gs-[0-9a-zA-Z-]*::(?:before|after)\s*\{[\s\S]*?\}/g, (match) => {
  if (match.includes("content: '║'") || match.includes('content: "[ "')) return '';
  return match;
});

// Also make absolutely sure appearance is none
fs.writeFileSync('src/ui/components/Game.css', css);
