const fs = require('fs');

let tsx = fs.readFileSync('src/ui/components/GuestStart.tsx', 'utf8');

// 1. Language panel top/bottom borders
tsx = tsx.replace(
  /<div className="gs-tui-border-left">╔═══ <\/div>\s*<div className="gs-tui-border-title"(.*?)>Language<\/div>\s*<div className="gs-tui-border-fill"> ═(.*?)<\/div>\s*<div className="gs-tui-border-right">═══╗<\/div>/g,
  '<div className="gs-tui-border-left">╔═══ </div>\n              <div className="gs-tui-border-title"$1>Language</div>\n              <div className="gs-tui-border-fill"> ═$2</div>\n              <div className="gs-tui-border-right">═══╗</div>'
);

// Language bottom border
tsx = tsx.replace(
  /<div className="gs-tui-border-left">╠═══<\/div>\s*<div className="gs-tui-border-fill">═(.*?)<\/div>\s*<div className="gs-tui-border-right">═══(?:╣|╝)<\/div>/g,
  '<div className="gs-tui-border-left">╚═══</div>\n              <div className="gs-tui-border-fill">═$1</div>\n              <div className="gs-tui-border-right">═══╝</div>'
);

// Sessions top border & expander icon
// Switch ⏷ / ⏶ and Title.
tsx = tsx.replace(
  /<span className="gs-tui-border-left">╠══ <\/span>\s*<span className="gs-panel-toggle-icon">{(.*?)}<\/span>\s*<span className="gs-panel-title">\s*{(.*?)}\s*<\/span>/g,
  '<span className="gs-tui-border-left">╔══ </span>\n                  <span className="gs-panel-title"> {$2} </span>\n                  <span className="gs-panel-toggle-icon">{$1}</span>\n                  {sessionsCollapsed && sortedSessions.length > 0 && <span className="gs-panel-title"> [ {sortedSessions.length} total, last: {formatDateTime(sortedSessions[0].lastActionTime ?? sortedSessions[0].endTime)} ] </span>}'
);
tsx = tsx.replace(
  /<span className="gs-tui-border-right">══╣<\/span>/g,
  '<span className="gs-tui-border-right">══╗</span>'
);

// Bottom border of sessions panel
tsx = tsx.replace(
  /<div className="gs-tui-border-left">╚═══<\/div>\s*<div className="gs-tui-border-fill">═(.*?)<\/div>\s*<div className="gs-tui-border-right">═══╝<\/div>/g,
  '<div className="gs-tui-border-left">╚═══</div>\n                <div className="gs-tui-border-fill">═$1</div>\n                <div className="gs-tui-border-right">═══╝</div>'
);

// We need to apply double border to `.gs-sessions-body` or wrap the `.gs-session-card` list.
// Where is `<div className="gs-sessions-body">` or similar? Let's check.
fs.writeFileSync('src/ui/components/GuestStart.tsx', tsx);
