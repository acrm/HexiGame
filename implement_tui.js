const fs = require('fs');

let tsx = fs.readFileSync('src/ui/components/GuestStart.tsx', 'utf8');

// I will fix GuestStart layout so the sessions panel is exactly 3 lines when collapsed!
// Line 1: ╔══ Sessions ⏷ ════╗
// Line 2: ║ X total, last... ║
// Line 3: ╚══════════════════╝

// And the language panel:
// Line 1: ╔══════════════════╗
// Line 2: ║ [EN] [RU]        ║
// Line 3: ╚══════════════════╝

// This is very straightforward to build using 3 rows.

// In GuestStart.tsx, I replace the entire "gs-language-panel" blocks and "gs-sessions-section" blocks.

// Wait, the user said about the language block:
// "в свёрнутом режиме панель сессий сейчас пишет контент прямо в верхней строке ... а должна на второй строке, как на панели языков, а на третей строке должна быть нижняя граница"

// Let's create a TUI block system in GuestStart.tsx.
const blockStart = tsx.indexOf('<div className="gs-language-panel">');
const blockEnd = tsx.indexOf('<div className="gs-footer">');

const newMarkup = `
          <div className="gs-language-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Row 1 - Top Border */}
            <div className="gs-tui-border-row" style={{ height: '3ch' }}>
              <span className="gs-tui-border-left">╔═══</span>
              <span className="gs-tui-border-fill">══════════════════════════════════════════════════════════════════════════════════════</span>
              <span className="gs-tui-border-right">═══╗</span>
            </div>

            {/* Row 2 - Language Content */}
            <div className="gs-tui-border-row" style={{ minHeight: '3ch', alignItems: 'center' }}>
              <span className="gs-tui-border-left">║</span>
              <div className="gs-tui-border-fill" style={{ display: 'flex', flexWrap: 'wrap', gap: '1ch', padding: '0 1ch' }}>
                <button
                  className={\`gs-lang-button \${i18n.language === 'en' ? 'active' : ''}\`}
                  onClick={() => i18n.changeLanguage('en')}
                >
                  [ EN ]
                </button>
                <button
                  className={\`gs-lang-button \${i18n.language === 'ru' ? 'active' : ''}\`}
                  onClick={() => i18n.changeLanguage('ru')}
                >
                  [ RU ]
                </button>
              </div>
              <span className="gs-tui-border-right">║</span>
            </div>

            {/* Row 3 - Bottom Border */}
            <div className="gs-tui-border-row" style={{ height: '3ch' }}>
              <span className="gs-tui-border-left">╚═══</span>
              <span className="gs-tui-border-fill">══════════════════════════════════════════════════════════════════════════════════════</span>
              <span className="gs-tui-border-right">═══╝</span>
            </div>
          </div>

          <div className="gs-sessions-section" style={{ display: 'flex', flexDirection: 'column', marginTop: '1ch' }}>
            {/* Row 1 - Session Header */}
            <div
              className="gs-tui-border-row gs-sessions-header"
              onClick={handleToggleSessions}
              style={{ cursor: 'pointer', height: '3ch' }}
            >
              <span className="gs-tui-border-left">╔══</span>
              <span className="gs-panel-title" style={{ padding: "0 1ch 0 1ch" }}>{t("sessions.title")}</span>
              <span className="gs-expander-icon" style={{ paddingRight: '1ch' }}>{sessionsCollapsed ? '⏷' : '⏶'}</span>
              <span className="gs-tui-border-fill">══════════════════════════════════════════════════════════════════════════════════════</span>
              <span className="gs-tui-border-right">═══╗</span>
            </div>

            {/* Row 2 conditionally rendered based on collapse state */}
            {sessionsCollapsed ? (
              <>
                <div className="gs-tui-border-row" style={{ minHeight: '3ch', alignItems: 'center' }}>
                  <span className="gs-tui-border-left">║</span>
                  <div className="gs-tui-border-fill" style={{ color: '#AAAAAA', padding: '0 1ch', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sortedSessions.length > 0 ? \`\${sortedSessions.length} total, last: \${formatDateTime(sortedSessions[0].lastActionTime ?? sortedSessions[0].endTime)}\` : 'No sessions'}
                  </div>
                  <span className="gs-tui-border-right">║</span>
                </div>
                <div className="gs-tui-border-row" style={{ height: '3ch' }}>
                  <span className="gs-tui-border-left">╚═══</span>
                  <span className="gs-tui-border-fill">══════════════════════════════════════════════════════════════════════════════════════</span>
                  <span className="gs-tui-border-right">═══╝</span>
                </div>
              </>
            ) : (
              <div className="gs-session-body" style={{ display: 'flex', flexDirection: 'column' }}>
                {renderedSessions.length === 0 ? (
                  <div className="gs-tui-border-row" style={{ minHeight: '3ch' }}>
                    <span className="gs-tui-border-left">║</span>
                    <div className="gs-session-empty" style={{ padding: '0 1ch' }}>No sessions found. Start a new local session.</div>
                    <span className="gs-tui-border-right">║</span>
                  </div>
                ) : (
                  renderedSessions.map((s, idx) => (
                    <React.Fragment key={s.id}>
                      <div className="gs-tui-border-row gs-session-card-row" style={{ minHeight: '3ch', alignItems: 'center' }}>
                        <span className="gs-tui-border-left">║</span>
                        <div className="gs-tui-border-fill" style={{ flex: 1, padding: '0 1ch' }}>
                          <button className="gs-session-card gs-button-tui" onClick={() => handleConnect(s.id)}>
                            <div className="gs-session-card-content">
                              <div className="gs-session-card-name">{s.name.substring(0, 16).padEnd(16, ' ')}</div>
                              <div className="gs-session-card-meta">{s.tick}</div>
                              <div className="gs-session-card-meta">{formatDateTime(s.lastActionTime ?? s.endTime)}</div>
                            </div>
                          </button>
                        </div>
                        <span className="gs-tui-border-right">║</span>
                      </div>
                      <div className="gs-tui-border-row gs-session-actions-row" style={{ minHeight: '3ch', alignItems: 'center' }}>
                        <span className="gs-tui-border-left">║</span>
                        <div className="gs-tui-border-fill" style={{ flex: 1, padding: '0 1ch', display: 'flex', gap: '1ch', justifyContent: 'flex-end' }}>
                          <button className="gs-action-btn delete" onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}>DELETE</button>
                          <button className="gs-action-btn export" onClick={(e) => { e.stopPropagation(); exportSession(s.id); }}>EXPORT</button>
                        </div>
                        <span className="gs-tui-border-right">║</span>
                      </div>
                      {/* Horizontal separator between sessions, but not after the last one */}
                      {idx < renderedSessions.length - 1 && (
                        <div className="gs-tui-border-row" style={{ height: '3ch' }}>
                          <span className="gs-tui-border-left">╟───</span>
                          <span className="gs-tui-border-fill">──────────────────────────────────────────────────────────────────────────────────────</span>
                          <span className="gs-tui-border-right">───╢</span>
                        </div>
                      )}
                    </React.Fragment>
                  ))
                )}
                {/* Last session separator -> bottom border */}
                <div className="gs-tui-border-row" style={{ height: '3ch' }}>
                  <span className="gs-tui-border-left">╚═══</span>
                  <span className="gs-tui-border-fill">══════════════════════════════════════════════════════════════════════════════════════</span>
                  <span className="gs-tui-border-right">═══╝</span>
                </div>
              </div>
            )}
          </div>
`;

tsx = tsx.substring(0, blockStart) + newMarkup + tsx.substring(blockEnd);

// Also need to rewrite the global header logic.
// Top bar was also described in the screenshot: The user's settings button doesn't look like a button. Let's fix that.
// Top bar in the JSX uses `.settings-button`.
// We should render `[⚙]` manually.
tsx = tsx.replace(
  /<button className="settings-button" onClick=\{handleSettings\} title=\{t\('guest_start\.settings'\)\}>[\s\S]*?<\/button>/,
  `<button className="settings-button" onClick={handleSettings} title={t('guest_start.settings')}>[ ⚙ ]</button>`
);

tsx = tsx.replace(
  /<button className="disconnect-button" onClick=\{handleDisconnect\} title=\{t\('guest_start\.disconnect'\)\}>[\s\S]*?<\/button>/,
  `<button className="disconnect-button" onClick={handleDisconnect} title={t('guest_start.disconnect')}>[ ⏏ ]</button>`
);

fs.writeFileSync('src/ui/components/GuestStart.tsx', tsx);


let css = fs.readFileSync('src/ui/components/Game.css', 'utf8');
// Fix global settings button css to not do before/after brackets if we already hardcoded them
css = css.replace(/\.settings-button::before,\s*\.settings-button::after\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.disconnect-button::before,\s*\.disconnect-button::after\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.gs-tab-bar \.settings-button::before[\s\S]*?\}/g, '');
css = css.replace(/\.gs-tab-bar \.settings-button::after[\s\S]*?\}/g, '');
css = css.replace(/\.gs-tab-bar \.disconnect-button::before[\s\S]*?\}/g, '');
css = css.replace(/\.gs-tab-bar \.disconnect-button::after[\s\S]*?\}/g, '');

// The borders have gaps because of padding/margins. Let's zero them!
css += `
/* TUI row resets */
.gs-tui-border-row {
  display: flex !important;
  flex-direction: row !important;
  width: 100% !important;
  align-items: stretch !important;
  margin: 0 !important;
  padding: 0 !important;
  line-height: normal !important;
}

.gs-tui-border-row > span,
.gs-tui-border-row > div {
  display: flex !important;
  align-items: center !important;
}

.gs-tui-border-fill {
  white-space: nowrap !important;
  overflow: hidden !important;
  font-family: 'Courier New', Courier, monospace !important;
}

.gs-tui-border-left, .gs-tui-border-right {
  white-space: pre !important;    
  font-family: inherit !important;
  line-height: normal !important;
}
`;

fs.writeFileSync('src/ui/components/Game.css', css);
