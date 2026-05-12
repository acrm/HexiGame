import React, { useState } from 'react';
import type { MobileTab } from '../../../appLogic/appShellReducer';

interface SessionTerminalLauncherProps {
  mobileTab: MobileTab;
  onSelectMap: () => void;
  onSelectHexipedia: () => void;
  onOpenSettings: () => void;
  onDisconnect: () => void;
}

function getTabName(mobileTab: MobileTab): string {
  if (mobileTab === 'hexipedia') return 'HEXI';
  if (mobileTab === 'lab') return 'LAB';
  return 'MAP';
}

export const SessionTerminalLauncher: React.FC<SessionTerminalLauncherProps> = ({
  mobileTab,
  onSelectMap,
  onSelectHexipedia,
  onOpenSettings,
  onDisconnect,
}) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('READY');

  const runCommand = (rawCommand: string) => {
    const command = rawCommand.trim().toLowerCase();

    if (!command) {
      return;
    }

    if (command === 'map' || command === 'm') {
      onSelectMap();
      setOutput('OK: MAP');
      return;
    }

    if (command === 'hexi' || command === 'h' || command === 'hexipedia') {
      onSelectHexipedia();
      setOutput('OK: HEXI');
      return;
    }

    if (command === 'cfg' || command === 'settings' || command === 'set') {
      onOpenSettings();
      setOutput('OK: CFG');
      return;
    }

    if (command === 'stop' || command === 'disconnect' || command === 'exit') {
      onDisconnect();
      setOutput('OK: STOP');
      return;
    }

    if (command === 'help') {
      setOutput('CMDS: map hexi cfg stop clear');
      return;
    }

    if (command === 'clear') {
      setOutput('');
      return;
    }

    setOutput(`ERR: ${command}`);
  };

  const submitInput = () => {
    runCommand(input);
    setInput('');
  };

  return (
    <div className="session-terminal-panel" role="region" aria-label="Session terminal launcher">
      <div className="session-terminal-header">
        <span className="session-terminal-title">TERMINAL</span>
        <span className="session-terminal-state">TAB:{getTabName(mobileTab)}</span>
      </div>

      <div className="session-terminal-command-row">
        <span className="session-terminal-prompt">C:\HexiOS&gt;</span>
        <input
          className="session-terminal-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              submitInput();
            }
          }}
          autoComplete="off"
          spellCheck={false}
          placeholder="help"
          aria-label="Terminal command"
        />
        <button type="button" className="session-terminal-run-btn" onClick={submitInput}>
          RUN
        </button>
      </div>

      <div className="session-terminal-shortcuts">
        <button type="button" className="session-terminal-shortcut" onClick={() => runCommand('map')}>
          [MAP]
        </button>
        <button type="button" className="session-terminal-shortcut" onClick={() => runCommand('hexi')}>
          [HEXI]
        </button>
        <button type="button" className="session-terminal-shortcut" onClick={() => runCommand('cfg')}>
          [CFG]
        </button>
        <button type="button" className="session-terminal-shortcut" onClick={() => runCommand('stop')}>
          [STOP]
        </button>
      </div>

      <div className="session-terminal-output">{output || ' '}</div>
    </div>
  );
};

export default SessionTerminalLauncher;
