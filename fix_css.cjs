const fs = require('fs');
let css = fs.readFileSync('src/ui/components/Game.css', 'utf8');

// 1. `.gs-tab-bar` background to #AAAAAA, color to #000000
css = css.replace(
  /\.gs-tab-bar\s*\{[^}]*\}/,
  `.gs-tab-bar {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) max-content max-content;\n  column-gap: 1ch;\n  align-items: stretch;\n  height: auto;\n  background: #AAAAAA;\n  color: #000000;\n  padding: 1ch;\n  flex-shrink: 0;\n}`
);

// 2. Remove internal side borders for .gs-session-* pseudo-elements
css = css.replace(/\.gs-session-[a-zA-Z0-9_-]+::(?:before|after)(?:,\s*\.gs-session-[a-zA-Z0-9_-]+::(?:before|after))*\s*\{[^}]*content:\s*'[║│]';[^}]*\}/g, '');
css = css.replace(/\.gs-session-[a-zA-Z0-9_-]+::(?:before|after)\s*\{\s*(?:left|right):\s*0;\s*\}/g, '');

// Also .gs-session-meta-grid span::before/after that uses ║
css = css.replace(/\.gs-session-meta-grid span::(?:before|after)(?:,\s*\.gs-session-meta-grid span::(?:before|after))*\s*\{[^}]*content:\s*'║';[^}]*\}/g, '');
css = css.replace(/\.gs-session-meta-grid span::(?:before|after)\s*\{\s*(?:left|right):\s*0;\s*\}/g, '');

// Remove .gs-session-actions ║
css = css.replace(/\.gs-session-actions::(?:before|after)(?:,\s*\.gs-session-actions::(?:before|after))*\s*\{[^}]*content:\s*'║';[^}]*\}/g, '');
css = css.replace(/\.gs-session-actions::(?:before|after)\s*\{\s*(?:left|right):\s*0;\s*\}/g, '');

// .gs-session-body borders
css = css.replace(/\.gs-session-body\s*\{[^}]*\}/, `.gs-session-body {\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n  padding: 0;\n  background: transparent;\n  border-left: 3px double #AAAAAA;\n  border-right: 3px double #AAAAAA;\n  box-sizing: border-box;\n}`);

// Remove padding from gs-session-card and inner rows to ensure no padding from panel borders
css = css.replace(/\.gs-session-card\s*\{[^}]*\}/, `.gs-session-card {\n  display: flex;\n  flex-direction: column;\n  gap: 1ch;\n  padding: 0;\n  background: transparent;\n  position: relative;\n  border: none;\n}`);

css = css.replace(/\.gs-session-row\s*\{[^}]*\}/, `.gs-session-row {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  gap: 0.5ch;\n  padding: 0 1ch;\n  color: #FFFFFF;\n}`);

// Change inner session separators to ──────
css = css.replace(/\.gs-session-card\s*\+\s*\.gs-session-card::before\s*\{[^}]*\}/, `.gs-session-card + .gs-session-card::before {\n  content: '────────────────────────────────────────────────────────────────────────────────────────────────────';\n  display: block;\n  overflow: hidden;\n  white-space: nowrap;\n  color: #AAAAAA;\n}`);

// Hide the last child after line
css = css.replace(/\.gs-session-card:last-child::after\s*\{[^}]*\}/, `.gs-session-card:last-child::after {\n  display: none;\n}`);

// Finally replace all `#55FFFF` colors with `#AAAAAA` globally
css = css.replace(/#55FFFF/g, '#AAAAAA');

fs.writeFileSync('src/ui/components/Game.css', css);
