const fs = require('fs');
let css = fs.readFileSync('src/ui/components/Game.css', 'utf8');

css = css.replace(/\.gs-section-toggle::(?:before|after)(?:,\s*\.gs-section-toggle::(?:before|after))*\s*\{[^}]*content:\s*'║';[^}]*\}/g, '');
css = css.replace(/\.gs-section-toggle::(?:before|after)\s*\{\s*(?:left|right):\s*0;\s*\}/g, '');

css = css.replace(/\.gs-rename-inline::(?:before|after)(?:,\s*\.gs-rename-inline::(?:before|after))*\s*\{[^}]*content:\s*'║';[^}]*\}/g, '');
css = css.replace(/\.gs-rename-inline::(?:before|after)\s*\{\s*(?:left|right):\s*0;\s*\}/g, '');

// Also anything else with content: '│'; 
css = css.replace(/\.gs-language-bar::(?:before|after)(?:,\s*\.gs-language-bar::(?:before|after))*\s*\{[^}]*content:\s*'│';[^}]*\}/g, '');
css = css.replace(/\.gs-language-bar::(?:before|after)\s*\{\s*(?:left|right):\s*0;\s*\}/g, '');

// Also replace white buttons #FFFFFF to #000000 in header
css = css.replace(
  /(\.guest-start-content\.hexipedia-style \.settings-button,\s*\.guest-start-content\.hexipedia-style \.disconnect-button\s*\{[\s\S]*?color:\s*)#FFFFFF/g,
  '$1#000000'
);

fs.writeFileSync('src/ui/components/Game.css', css);
