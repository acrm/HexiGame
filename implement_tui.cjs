const fs = require('fs');

// 1. GuestStart.tsx
let tsx = fs.readFileSync('src/ui/components/GuestStart.tsx', 'utf8');

// Update PLAY to Run latest
tsx = tsx.replace(
  '<span className="gs-symbol">PLAY</span>',
  '<span className="gs-symbol">Run latest</span>'
);

// Rewrite gs-language-panel
tsx = tsx.replace(
  /          <div className="gs-language-panel gs-tui-frame">\s*<div className="gs-language-bar">[\s\S]*?<\/select>\s*<\/div>\s*<\/div>/,
  `          <div className="gs-language-panel">
            <div className="gs-tui-border-row">
              <div className="gs-tui-border-left">╔═══ </div>
              <div className="gs-tui-border-title" style={{color: '#55FFFF', fontWeight: 'bold'}}>Language</div>
              <div className="gs-tui-border-fill"> ═══════════════════════════════════════════════════════════════════════════════</div>
              <div className="gs-tui-border-right">═══╗</div>
            </div>
            <div className="gs-language-bar">
              <label className="gs-language-label" htmlFor="guest-start-language">
                {t('settings.language')}
              </label>
              <select
                id="guest-start-language"
                className="gs-lang-select"
                value={language}
                onChange={(e) => {
                  onUiClick();
                  onLanguageChange(e.target.value as Lang);
                }}
              >
                <option value="en">{t('language.en')}</option>
                <option value="ru">{t('language.ru')}</option>
              </select>
            </div>
            <div className="gs-tui-border-row">
              <div className="gs-tui-border-left">╠═══</div>
              <div className="gs-tui-border-fill">════════════════════════════════════════════════════════════════════════════════════════════════════</div>
              <div className="gs-tui-border-right">═══╣</div>
            </div>
          </div>`
);

// Rewrite gs-sessions-panel header
tsx = tsx.replace(
  /            <div className="gs-sessions-section[^>]*>\s*<div className="gs-sessions-header">[\s\S]*?<\/button>\s*<\/div>/,
  `            <div className="gs-sessions-section">
              <div className="gs-sessions-header">
                <button
                  type="button"
                  className="gs-section-toggle gs-tui-border-row"
                  onClick={() => setSessionsCollapsed((value) => !value)}
                >
                  <span className="gs-tui-border-left">╠══ </span>
                  <span className="gs-panel-toggle-icon">{sessionsCollapsed ? '⏷' : '⏶'}</span>
                  <span className="gs-panel-title"> {t('sessions.title')} </span>
                  <span className="gs-tui-border-fill">════════════════════════════════════════════════════════════════════════════════════════════════════</span>
                  <span className="gs-tui-border-right">══╣</span>
                </button>
              </div>`
);

// Add bottom border to sessions panel
tsx = tsx.replace(
  /                <\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\};/g,
  `                </div>
              )}
              <div className="gs-tui-border-row">
                <div className="gs-tui-border-left">╚═══</div>
                <div className="gs-tui-border-fill">════════════════════════════════════════════════════════════════════════════════════════════════════</div>
                <div className="gs-tui-border-right">═══╝</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};`
);

fs.writeFileSync('src/ui/components/GuestStart.tsx', tsx, 'utf8');

// 2. Game.css
let css = fs.readFileSync('src/ui/components/Game.css', 'utf8');

// Invert top bar
css = css.replace(
  /\.gs-tab-bar\s*\{[\s\S]*?\}/,
  `.gs-tab-bar {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) max-content max-content;\n  column-gap: 1ch;\n  align-items: stretch;\n  height: auto;\n  background: #55FFFF;\n  color: #000000;\n  padding: 1ch;\n  flex-shrink: 0;\n}`
);

css = css.replace(
  /\.gs-system-tab\s*\{[\s\S]*?\}/,
  `.gs-system-tab {\n  display: block;\n  padding: 0;\n  background: transparent;\n  color: #000000;\n  font-weight: 700;\n  flex: 1;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}`
);

// Adjust buttons for inverted header
css = css.replace(
  /\.disconnect-button::before,\n\.settings-button::before\s*\{[\s\S]*?\}/,
  `.disconnect-button::before,\n.settings-button::before {\n  content: '[ ';\n  color: #000000;\n}`
);
css = css.replace(
  /\.disconnect-button::after,\n\.settings-button::after\s*\{[\s\S]*?\}/,
  `.disconnect-button::after,\n.settings-button::after {\n  content: ' ]';\n  color: #000000;\n}`
);

// Add missing specific text colors for buttons inside the header
css += `
.guest-start-content.hexipedia-style .disconnect-button,
.guest-start-content.hexipedia-style .settings-button { color: #000000; }
`;

// Remove gap/padding from main panels
css = css.replace(
  /\.gs-main-panels\s*\{[\s\S]*?\}/,
  `.gs-main-panels {\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n  padding: 0;\n  min-height: 0;\n  flex: 1;\n  overflow: hidden;\n}`
);

// Remove active session card highlights
css = css.replace(/\.gs-session-card--active \.gs-session-row\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.gs-session-card--active\s*\{[\s\S]*?\}/, '.gs-session-card--active {}');
css = css.replace(/\.gs-session-card--active::before\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.gs-session-card--active::after\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.gs-session-card--active \.gs-session-name,\n\.gs-session-card--active \.gs-session-date-inline\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.gs-session-card--active \.gs-expander-btn,\n\.gs-session-card--active \.gs-expander-btn:hover\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.gs-session-card--active \.gs-session-start-btn,\n\.gs-session-card--active \.gs-session-start-btn:hover\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.gs-session-card--active \.gs-session-start-btn::before,\n\.gs-session-card--active \.gs-session-start-btn::after\s*\{[\s\S]*?\}/g, '');

// Clean up active rules for borders
css = css.replace(/\.gs-session-card--active \.gs-session-line::before,[\s\S]*?\}\n/g, '');

// Add new TUI row classes
css += `
.gs-tui-border-row {
  display: flex;
  width: 100%;
  color: #AAAAAA;
  align-items: center;
  font-weight: normal;
  padding: 0;
  box-sizing: border-box;
}
.gs-tui-border-row.gs-section-toggle {
  color: #55FFFF;
  padding: 0;
  cursor: pointer;
}
.gs-tui-border-left { flex: 0 0 auto; white-space: pre; }
.gs-tui-border-fill { flex: 1 1 0; overflow: hidden; white-space: pre; }
.gs-tui-border-right { flex: 0 0 auto; white-space: pre; }
`;

fs.writeFileSync('src/ui/components/Game.css', css, 'utf8');
