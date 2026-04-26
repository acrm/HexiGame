const fs = require('fs');
let css = fs.readFileSync('src/ui/components/Game.css', 'utf8');

// Remove ║ from gs-session-row
css = css.replace(/\.gs-session-row::before,\n\.gs-session-row::after \{\n  content: '║';[\s\S]*?\}\n/, '');
css = css.replace(/\.gs-session-row::before \{\n  left: 0;\n\}\n/, '');
css = css.replace(/\.gs-session-row::after \{\n  right: 0;\n\}\n/, '');

// Remove ║ from gs-session-expanded
css = css.replace(/\.gs-session-expanded::before,\n\.gs-session-expanded::after \{\n  content: '║';[\s\S]*?\}\n/, '');
css = css.replace(/\.gs-session-expanded::before \{\n  left: 0;\n\}\n/, '');
css = css.replace(/\.gs-session-expanded::after \{\n  right: 0;\n\}\n/, '');

// Expand the ::before in lines so they also have ::after
css = css.replace(/\.gs-session-line::before \{\n  content: '║';/g, '.gs-session-line::before,\n.gs-session-line::after {\n  content: \'║\';');
css = css.replace(/\.gs-session-line::before \{\n  left: 0;\n  color: #55FFFF;\n\}/g, '.gs-session-line::before {\n  left: 0;\n  color: #55FFFF;\n}\n.gs-session-line::after {\n  right: 0;\n  color: #55FFFF;\n}');

fs.writeFileSync('src/ui/components/Game.css', css);
