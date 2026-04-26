const fs = require('fs');
let css = fs.readFileSync('src/ui/components/Game.css', 'utf8');

// Remove current ::before/::after
css = css.replace(/\.gs-session-body::before,\s*\.gs-session-body::after\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.gs-session-body::(?:before|after)\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.gs-language-bar::before,\s*\.gs-language-bar::after\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.gs-language-bar::(?:before|after)\s*\{[\s\S]*?\}/g, '');

// Since absolute positioning repeating text may cause scroll issues, let's use clip-path or overflow.
css += `
.gs-tui-vertical-border {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1ch;
  overflow: hidden;
  color: #AAAAAA;
  white-space: pre;
  line-height: inherit;
  font-family: inherit;
  user-select: none;
  pointer-events: none;
}
.gs-tui-vertical-border::before {
  content: '║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║\\A║';
}
.gs-tui-vertical-border-left { left: 0; }
.gs-tui-vertical-border-right { right: 0; }

.gs-session-body { position: relative; padding: 0 1ch; }
.gs-language-bar { position: relative; padding: 0 1ch; }

.gs-tui-border-row {
  display: flex;
  margin: 0;
  padding: 0;
  white-space: pre;
}
`;

fs.writeFileSync('src/ui/components/Game.css', css);
