const fs = require('fs');
let code = fs.readFileSync('src/ui/components/GuestStart.tsx', 'utf8');

// I want to add repeating ::before vertical border manually. 
code = code.replace(
  /<div className="gs-language-bar">/g,
  '<div className="gs-language-bar"><div className="gs-tui-vertical-border gs-tui-vertical-border-left" /><div className="gs-tui-vertical-border gs-tui-vertical-border-right" />'
);

code = code.replace(
  /<div className="gs-session-body">/g,
  '<div className="gs-session-body"><div className="gs-tui-vertical-border gs-tui-vertical-border-left" /><div className="gs-tui-vertical-border gs-tui-vertical-border-right" />'
);

fs.writeFileSync('src/ui/components/GuestStart.tsx', code);
