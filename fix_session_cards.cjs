const fs = require('fs');
let code = fs.readFileSync('src/ui/components/GuestStart.tsx', 'utf8');

// remove brackets from the collapsed session row
code = code.replace(
  /\{sortedSessions\.length\} total, last: \{formatDateTime\(sortedSessions\[0\]\.lastActionTime \?\? sortedSessions\[0\]\.endTime\)\}/g,
  '{sortedSessions.length} total, last: {formatDateTime(sortedSessions[0].lastActionTime ?? sortedSessions[0].endTime)}'
); // wait, it might already have no brackets, let's just check if it has them.

code = code.replace(
  /\<span className="gs-tui-border-fill" style=\{\{ display: 'flex', alignItems: 'center' \}\}>\[ \{sortedSessions\.length\} total, last: \{formatDateTime\(sortedSessions\[0\]\.lastActionTime \?\? sortedSessions\[0\]\.endTime\)\} \]/,
  '<span className="gs-tui-border-fill" style={{ display: "flex", alignItems: "center" }}>{sortedSessions.length} total, last: {formatDateTime(sortedSessions[0].lastActionTime ?? sortedSessions[0].endTime)}'
);

// Update gs-session-card to insert ║
code = code.replace(
  /<div className="gs-session-line gs-session-line--top">([\s\S]*?)<\/div>/g,
  '<div className="gs-tui-border-row gs-session-line gs-session-line--top"><span className="gs-tui-border-left">║ </span><div className="gs-tui-border-fill" style={{display: "flex", flex: "1"}}>$1</div><span className="gs-tui-border-right">║</span></div>'
);

code = code.replace(
  /<div className="gs-session-line gs-session-line--bottom">([\s\S]*?)<\/div>/g,
  '<div className="gs-tui-border-row gs-session-line gs-session-line--bottom"><span className="gs-tui-border-left">║ </span><div className="gs-tui-border-fill" style={{display: "flex", flex: "1", paddingLeft: "1ch", justifyContent: "space-between"}}>$1</div><span className="gs-tui-border-right">║</span></div>'
);

fs.writeFileSync('src/ui/components/GuestStart.tsx', code);
