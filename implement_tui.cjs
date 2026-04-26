const fs = require('fs');

let tsx = fs.readFileSync('src/ui/components/GuestStart.tsx', 'utf8');

// Swap expander and session name
tsx = tsx.replace(
  /<button\s+type="button"\s+className="gs-expander-btn"[\s\S]*?<\/button>\s*<span className="gs-session-name">\{displayName\}<\/span>/,
  `<span className="gs-session-name">{displayName}</span>
                                <button
                                  type="button"
                                  className="gs-expander-btn"
                                  onClick={() => toggleSessionExpanded(record.id)}
                                  aria-label={isExpanded ? t('action.backToStart') : t('action.sessionHistory')}
                                  title={isExpanded ? 'Collapse' : 'Expand'}
                                >
                                  {isExpanded ? '⏶' : '⏷'}
                                </button>`
);

// Fix header
tsx = tsx.replace(
  /<div className="gs-sessions-header">[\s\S]*?<\/div>\s*\{\!sessionsCollapsed/,
  `<div className="gs-sessions-header">
                <button
                  type="button"
                  className="gs-section-toggle gs-tui-border-row"
                  onClick={() => setSessionsCollapsed((value) => !value)}
                >
                  <span className="gs-tui-border-left">╔══ </span>
                  <span className="gs-panel-title" style={{ paddingRight: '1ch' }}>{t('sessions.title')}</span>
                  <span className="gs-panel-toggle-icon">{sessionsCollapsed ? '⏷' : '⏶'}</span>
                  <span className="gs-tui-border-fill">════════════════════════════════════════════════════════════════════════════════════════════════════</span>
                  <span className="gs-tui-border-right">══╗</span>
                </button>
              </div>

              {sessionsCollapsed && sortedSessions.length > 0 && (
                <div className="gs-session-body">
                  <div className="gs-tui-border-row" style={{ height: '3ch' }}>
                    <span className="gs-tui-border-left">║ </span>
                    <span className="gs-tui-border-fill" style={{ display: 'flex', alignItems: 'center' }}>[ {sortedSessions.length} total, last: {formatDateTime(sortedSessions[0].lastActionTime ?? sortedSessions[0].endTime)} ]</span>
                    <span className="gs-tui-border-right"> ║</span>
                  </div>
                </div>
              )}

              {!sessionsCollapsed`
);

fs.writeFileSync('src/ui/components/GuestStart.tsx', tsx);


let css = fs.readFileSync('src/ui/components/Game.css', 'utf8');

// Fix buttons pseudo elements [ ] showing up in black
css = css.replace(
  /(\.disconnect-button::before,\n\.settings-button::before\s*\{[\s\S]*?content:\s*)''/g,
  "$1'[ '"
);
css = css.replace(
  /(\.disconnect-button::after,\n\.settings-button::after\s*\{[\s\S]*?content:\s*)''/g,
  "$1' ]'"
);

// Convert CSS session body left border back to pure ASCII '║' on sides for body padding
// First remove the double CSS border previously added:
css = css.replace(
  /(\.gs-session-body\s*\{[\s\S]*?)border-left:\s*3px\s+double\s+#AAAAAA;\n\s*border-right:\s*3px\s+double\s+#AAAAAA;/g,
  "$1"
);

// Instead of borders, let's just make the side container use ::before and ::after for ║
if (!css.includes('.gs-session-body::before')) {
  css += `\n
.gs-session-body {
  position: relative;
  padding: 0;
}
.gs-session-body::before, .gs-session-body::after {
  content: '║';
  position: absolute;
  top: 0;
  bottom: 0;
  color: #AAAAAA;
  display: flex;
  align-items: stretch;
  flex-direction: column;
  overflow: hidden;
}
.gs-session-body::before { left: 0; }
.gs-session-body::after { right: 0; }

.gs-language-bar::before, .gs-language-bar::after {
  content: '║';
  position: absolute;
  top: 0;
  bottom: 0;
  color: #AAAAAA;
  display: flex;
  align-items: center;
}
.gs-language-bar::before { left: 0; }
.gs-language-bar::after { right: 0; }
`;
}
fs.writeFileSync('src/ui/components/Game.css', css);
