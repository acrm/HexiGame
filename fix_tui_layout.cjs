const fs = require('fs');
let code = fs.readFileSync('src/ui/components/GuestStart.tsx', 'utf8');

// 1. the language panel layout is partially bad
code = code.replace(
  '<div className="gs-language-bar">',
  '<div className="gs-tui-border-row gs-language-bar">\n<span className="gs-tui-border-left">║ </span>\n<div className="gs-tui-border-fill" style={{ padding: "0 1ch" }}>'
);
code = code.replace(
  '              </select>\n            </div>\n            <div className="gs-tui-border-row">',
  '              </select>\n</div>\n<span className="gs-tui-border-right">║</span>\n            </div>\n            <div className="gs-tui-border-row">'
);

// 2. Remove any native styling and square brackets from central row
// We already removed [ ] from the central row when we edited earlier. Let's verify.
code = code.replace(
  /\[ \{sortedSessions\.length\} total, last: \{formatDateTime\(sortedSessions\[0\]\.lastActionTime \?\? sortedSessions\[0\]\.endTime\)\} \]/g,
  '{sortedSessions.length} total, last: {formatDateTime(sortedSessions[0].lastActionTime ?? sortedSessions[0].endTime)}'
);

// 3. session-actions row needs borders
code = code.replace(
  '<div className="gs-session-actions">',
  '<div className="gs-tui-border-row gs-session-actions">\n<span className="gs-tui-border-left">║ </span>\n<div className="gs-tui-border-fill" style={{ display: "flex", gap: "2ch", paddingLeft: "1ch" }}>'
);
code = code.replace(
  'onChange={(e) => {\n                        const file = e.target.files?.[0];\n                        if (file) onImportSession(file);\n                        e.target.value = \'\';\n                      }}\n                    />\n                  </div>',
  'onChange={(e) => {\n                        const file = e.target.files?.[0];\n                        if (file) onImportSession(file);\n                        e.target.value = \'\';\n                      }}\n                    />\n</div>\n<span className="gs-tui-border-right">║</span>\n                  </div>'
);

code = code.replace(
  '<div className="gs-history-list">',
  '<div className="gs-history-list">\n<div className="gs-tui-border-row">\n<span className="gs-tui-border-left">╟═══</span>\n<span className="gs-tui-border-fill">════════════════════════════════════════════════════════════════════════════════════════════════════</span>\n<span className="gs-tui-border-right">═══╢</span>\n</div>'
);

fs.writeFileSync('src/ui/components/GuestStart.tsx', code);
