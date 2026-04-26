const fs = require('fs');

let tsx = fs.readFileSync('src/ui/components/GuestStart.tsx', 'utf8');

// Language Header Fixes: Remove spaces that break the ═ flow
tsx = tsx.replace(/<div className="gs-tui-border-left">╔═══ <\/div>/g, '<div className="gs-tui-border-left">╔═══</div>');
tsx = tsx.replace(/<div className="gs-tui-border-fill">\s*═+/g, '<div className="gs-tui-border-fill">══════════════════════════════════════════════════════════════════════════════════════');
tsx = tsx.replace(/style=\{\{color: '#55FFFF', fontWeight: 'bold'\}\}/g, "style={{color: '#AAAAAA', padding: '0 1ch', fontWeight: 'bold'}}");

// Top-level Sessions panel:
tsx = tsx.replace(/<span className="gs-tui-border-left">╔══ <\/span>/g, '<span className="gs-tui-border-left">╔══</span>');
tsx = tsx.replace(/<span className="gs-panel-title" style=\{\{ paddingRight: '1ch' \}\}>\{t\('sessions\.title'\)\}<\/span>/g, '<span className="gs-panel-title" style={{ padding: "0 1ch 0 1ch" }}>{t("sessions.title")}</span>');

// Remove extra spaces in ║ wrappers
tsx = tsx.replace(/<span className="gs-tui-border-left">║ <\/span>/g, '<span className="gs-tui-border-left">║</span>');
tsx = tsx.replace(/<span className="gs-tui-border-right"> ║<\/span>/g, '<span className="gs-tui-border-right">║</span>');

// Let's add bottom boundary to collapsed session body
tsx = tsx.replace(
  /\{sessionsCollapsed && sortedSessions\.length > 0 && \([\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\)\}/,
  `{sessionsCollapsed && (
                <div className="gs-session-body">
                  <div className="gs-tui-border-row" style={{ minHeight: '3ch' }}>
                    <span className="gs-tui-border-left">║</span>
                    <span className="gs-tui-border-fill" style={{ color: '#AAAAAA', padding: '0 1ch', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sortedSessions.length > 0 ? \`\${sortedSessions.length} total, last: \${formatDateTime(sortedSessions[0].lastActionTime ?? sortedSessions[0].endTime)}\` : 'No sessions'}
                    </span>
                    <span className="gs-tui-border-right">║</span>
                  </div>
                  <div className="gs-tui-border-row">
                    <div className="gs-tui-border-left">╚═══</div>
                    <div className="gs-tui-border-fill">════════════════════════════════════════════════════════════════════════════════════════════════════</div>
                    <div className="gs-tui-border-right">═══╝</div>
                  </div>
                </div>
              )}`
);

// Individual sessions in expanded state lack borders; we need to add ║ left/right to them!
// Actually, earlier we tried to add it to CSS, but the font size mismatch is an issue. Let's do it in CSS but properly.
fs.writeFileSync('src/ui/components/GuestStart.tsx', tsx);


let css = fs.readFileSync('src/ui/components/Game.css', 'utf8');

// The main issue: CSS 3px double border looks thicker. If we use actual ascii character via flex column, it's perfect.
// But we already added `.gs-session-body::before { content: '║'; ... }` to CSS.
// Let's see why it didn't align. Because text in `::before` does not stretch! It's just a single character.
// To stretch it in flex, it must repeat. But CSS `content: '║'` only renders one ║.
// Alternatively, use `border` but match the exact style. `border: 1px solid #AAAAAA;` might be better or `border-image`.
// Instead, let's use the pure ASCII approach: 
// 1. Remove border-left/right and ::before/after from .gs-session-body.
css = css.replace(/\.gs-session-body::before,\s*\.gs-session-body::after\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.gs-session-body::(?:before|after)\s*\{[\s\S]*?\}/g, '');

// Apply vertical ║ via border-image with SVG or similar? No, keep it simple.
// "можно чистый ascii, но чтобы идеально совпадало." -> Since we use flexbox, let's just make EVERY row a gs-tui-border-row!

// To make every row a gs-tui-border-row, including .gs-session-card and .gs-session-actions, we need to wrap them in GuestStart.tsx.
// Let's rewrite GuestStart.tsx to wrap all content rows!
fs.writeFileSync('src/ui/components/Game.css', css);
