const fs = require('fs');
let code = fs.readFileSync('src/ui/components/GuestStart.tsx', 'utf8');

// Fix Language Bar to be a TuiRow
code = code.replace(
  /<div className="gs-language-bar">(\s*)<select[\s\S]*?<\/select>\s*<\/div>/,
  (match) => {
    let select = match.match(/<select[\s\S]*?<\/select>/)[0];
    return `<div className="gs-tui-border-row gs-language-bar">\n` +
           `              <span className="gs-tui-border-left">║ </span>\n` +
           `              <span className="gs-tui-border-fill" style={{ paddingLeft: '1ch' }}>\n` +
           `                ${select.replace(/\n/g, '\n                ')}\n` +
           `              </span>\n` +
           `              <span className="gs-tui-border-right">║</span>\n` +
           `            </div>`;
  }
);

// Fix Session Body to wrap actions in TuiRow
code = code.replace(
  /<div className="gs-session-actions">[\s\S]*?<\/div>/,
  (match) => {
    return `<div className="gs-tui-border-row gs-session-actions">\n` +
           `              <span className="gs-tui-border-left">║ </span>\n` +
           `              <div className="gs-tui-border-fill" style={{ display: 'flex', gap: '2ch', paddingLeft: '1ch' }}>\n` +
           `                <button type="button" className="gs-nav-btn" onClick={() => { onUiClick(); onNewSession(); }}>[ NEW ]</button>\n` +
           `                <button type="button" className="gs-nav-btn gs-nav-btn--secondary" onClick={() => { onUiClick(); importFileRef.current?.click(); }}>[ LOAD ]</button>\n` +
           `                <input ref={importFileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files?.[0]; if (file) onImportSession(file); e.target.value = ''; }} />\n` +
           `              </div>\n` +
           `              <span className="gs-tui-border-right">║</span>\n` +
           `            </div>`;
  }
);

code = code.replace(
  /<div className="gs-history-list">([\s\S]*?)<\/div>\s*<\/div>\s*\)\}/,
  `<div className="gs-history-list">
                      {sortedSessions.map((record) => {
                        const displayName = getSessionDisplayName(record);
                        const isEditing = editingId === record.id;
                        const isExpanded = expandedSessionIds.has(record.id);
                        const isDeletePending = pendingDeleteId === record.id;
                        const lastActionLabel = formatDateTime(record.lastActionTime ?? record.endTime);

                        return (
                          <div key={record.id} className={\`gs-session-card \${currentSessionId === record.id ? 'gs-session-card--active' : ''}\`.trim()}>
                            <div className="gs-tui-border-row gs-session-row">
                              <span className="gs-tui-border-left">║ </span>
                              <div className="gs-tui-border-fill gs-session-line gs-session-line--top" style={{ display: 'flex', flex: '1', justifyContent: 'space-between', padding: '0 1ch' }}>
                                <span className="gs-session-name" style={{ flex: '1', overflow: 'hidden' }}>{displayName}</span>
                                <button type="button" className="gs-expander-btn" onClick={() => toggleSessionExpanded(record.id)} title={isExpanded ? 'Collapse' : 'Expand'}>{isExpanded ? '⏶' : '⏷'}</button>
                              </div>
                              <span className="gs-tui-border-right">║</span>
                            </div>
                            
                            <div className="gs-tui-border-row gs-session-row">
                              <span className="gs-tui-border-left">║ </span>
                              <div className="gs-tui-border-fill gs-session-line gs-session-line--bottom" style={{ display: 'flex', flex: '1', justifyContent: 'space-between', padding: '0 1ch' }}>
                                <span className="gs-session-date-inline">{lastActionLabel}</span>
                                <button type="button" className="gs-session-start-btn" onClick={() => { onUiClick(); onContinueSession(record.id); }}>[ RUN ]</button>
                              </div>
                              <span className="gs-tui-border-right">║</span>
                            </div>

                            {isExpanded && (
                              <div className="gs-tui-border-row gs-session-expanded">
                                <span className="gs-tui-border-left">║ </span>
                                <div className="gs-tui-border-fill" style={{ display: 'flex', flexDirection: 'column', gap: '1ch', padding: '0 1ch', flex: '1' }}>
                                  {isEditing ? (
                                    <div className="gs-rename-inline" style={{ display: 'flex', width: '100%' }}>
                                      <input className="gs-rename-input" style={{ flex: 1, minWidth: 0 }} value={editingName} onChange={(e) => setEditingName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') cancelRename(); }} autoFocus />
                                      <button type="button" className="gs-icon-btn gs-icon-btn--success" onClick={submitRename}>✔</button>
                                      <button type="button" className="gs-icon-btn gs-icon-btn--danger" onClick={cancelRename}>✖</button>
                                    </div>
                                  ) : (
                                    <div className="gs-session-card-actions" style={{ display: 'flex', gap: '1ch' }}>
                                      <button type="button" className="gs-icon-btn" onClick={() => startRename(record)} title={t('action.renameSession')}>[ ✎ ]</button>
                                      <button type="button" className="gs-icon-btn" onClick={() => onDownloadSession(record.id)} title={t('action.exportSession')}>[ ��� ]</button>
                                      {isDeletePending ? (
                                        <>
                                          <button type="button" className="gs-icon-btn gs-icon-btn--danger" onClick={() => confirmDelete(record.id)} title={t('action.confirmDelete')}>[ ✔ DEL ]</button>
                                          <button type="button" className="gs-icon-btn gs-icon-btn--secondary" onClick={cancelDelete} title={t('action.cancelDelete')}>[ ✖ ]</button>
                                        </>
                                      ) : (
                                        <button type="button" className="gs-icon-btn gs-icon-btn--danger" onClick={() => requestDelete(record.id)} title={t('action.deleteSession')}>[ ✖ DEL ]</button>
                                      )}
                                    </div>
                                  )}
                                  <div className="gs-session-meta-grid" style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8em' }}>ID: {record.id}</span>
                                    <span style={{ fontSize: '0.8em' }}>Ticks: {record.tick ?? 0}</span>
                                    <span style={{ fontSize: '0.8em' }}>Time: {formatTotalTime(record.elapsedTime)}</span>
                                  </div>
                                </div>
                                <span className="gs-tui-border-right">║</span>
                              </div>
                            )}

                            {/* Separator line between sessions */}
                            <div className="gs-tui-border-row">
                              <span className="gs-tui-border-left">╟───</span>
                              <span className="gs-tui-border-fill">────────────────────────────────────────────────────────────────────────────────────────────────────</span>
                              <span className="gs-tui-border-right">───╢</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
              )}`
);

fs.writeFileSync('src/ui/components/GuestStart.tsx', code);
