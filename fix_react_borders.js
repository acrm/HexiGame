const fs = require('fs');
let code = fs.readFileSync('src/ui/components/GuestStart.tsx', 'utf8');

// Fix collapsed session body to include the bottom border
const collapsedBlockOld = `{sessionsCollapsed && sortedSessions.length > 0 && (
                <div className="gs-session-body">
                  <div className="gs-tui-border-row" style={{ height: '3ch' }}>
                    <span className="gs-tui-border-left">║ </span>
                    <span className="gs-tui-border-fill" style={{ display: 'flex', alignItems: 'center' }}>[ {sortedSessions.length} total, last: {formatDateTime(sortedSessions[0].lastActionTime ?? sortedSessions[0].endTime)} ]</span>
                    <span className="gs-tui-border-right"> ║</span>
                  </div>
                </div>
              )}`;

const collapsedBlockNew = `{sessionsCollapsed && sortedSessions.length > 0 && (
                <div className="gs-session-body">
                  <div className="gs-tui-border-row" style={{ height: '3ch' }}>
                    <span className="gs-tui-border-left">║ </span>
                    <span className="gs-tui-border-fill" style={{ display: 'flex', alignItems: 'center' }}>[ {sortedSessions.length} total, last: {formatDateTime(sortedSessions[0].lastActionTime ?? sortedSessions[0].endTime)} ]</span>
                    <span className="gs-tui-border-right">║</span>
                  </div>
                  <div className="gs-tui-border-row">
                    <span className="gs-tui-border-left">╚═══</span>
                    <span className="gs-tui-border-fill">════════════════════════════════════════════════════════════════════════════════════════════════════</span>
                    <span className="gs-tui-border-right">═══╝</span>
                  </div>
                </div>
              )}`;

if (code.includes(collapsedBlockOld.trim().substring(0, 50))) { // approximate check
  // let's do a smarter replace using exact text matching
  code = code.replace(
    /\{sessionsCollapsed && sortedSessions\.length > 0 && \([\s\S]*?<\/div>\s*<\/div>\s*\)\}/,
    collapsedBlockNew
  );
}

// Language panel: Make sure it has a proper layout. Its current bottom border is fine.
// But the spaces inside ╔═══ and ║ are causing tearing with the background or misalignments.
// E.g. `<span className="gs-tui-border-left">╔══ </span>` => should be `╔══` with padding or none.
// Let's replace spacing.
code = code.replace(/className="gs-tui-border-left">╔══ <\/span>/g, 'className="gs-tui-border-left">╔══</span>');
code = code.replace(/className="gs-tui-border-left">╔═══ <\/div>/g, 'className="gs-tui-border-left">╔═══</div>');
code = code.replace(/className="gs-tui-border-left">║ <\/span>/g, 'className="gs-tui-border-left">║</span>');
code = code.replace(/className="gs-tui-border-right"> ║<\/span>/g, 'className="gs-tui-border-right">║</span>');

// Top bar buttons don't look like buttons
code = code.replace(
  /<button\s+className="settings-button"\s+onClick=\{handleSettings\}\s+title=\{t\('guest_start\.settings'\)\}\s*>\s*⚙\s*<\/button>/g,
  '<button className="settings-button" onClick={handleSettings} title={t(\'guest_start.settings\')}>[ ⚙ ]</button>'
);
code = code.replace(
  /<button\s+className="disconnect-button"\s+onClick=\{handleDisconnect\}\s+title=\{t\('guest_start\.disconnect'\)\}\s*>\s*⏏\s*<\/button>/g,
  '<button className="disconnect-button" onClick={handleDisconnect} title={t(\'guest_start.disconnect\')}>[ ⏏ ]</button>'
);

fs.writeFileSync('src/ui/components/GuestStart.tsx', code);
