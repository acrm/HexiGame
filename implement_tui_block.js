const fs = require('fs');
let code = fs.readFileSync('src/ui/components/GuestStart.tsx', 'utf8');

// I will write a script to re-shape the whole gs-guest-start-container.

const TuiBox = `
// Basic bordered box that ensures left/right borders are drawn purely by CSS borders that look like ASCII.
// Wait, the user specifically noted that css borders have a difference in thickness compared to the ASCII characters.
// So we use characters. To stretch the ║ without gaps, we can use flex background or repeat.
// actually, a repeating linear gradient or repeating svg background works perfectly for stretch without css border styling differences.
// But the simplest is to just enforce line height and line boundaries:
const BoxRow = ({ children, fill = false }: { children: React.ReactNode, fill?: boolean }) => (
  <div className="gs-tui-border-row" style={{ display: 'flex', width: '100%', minHeight: '3ch', lineHeight: '3ch' }}>
    <span className="gs-tui-border-left">║</span>
    <div className="gs-tui-border-fill" style={{ flex: 1, padding: '0 1ch', display: 'flex', flexDirection: fill ? 'column' : 'row', alignItems: 'center' }}>
      {children}
    </div>
    <span className="gs-tui-border-right">║</span>
  </div>
);
`;

// Replacing everything from <div className="gs-language-panel"> to the end of guest-start-menu ...
// Too error-prone to regex replacement of huge blocks of React code. I should just use `edit_file` to replace the exact lines.
