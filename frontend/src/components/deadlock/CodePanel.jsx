import React from 'react';
import Editor from "@monaco-editor/react";
import useSecurity from '../../hooks/useSecurity';

const CodePanel = ({ code, setCode, language, setLanguage, isLocked, onSubmitShortcut }) => {
    const teamName = localStorage.getItem('teamName') || 'UNKNOWN';
    const { security, reportAction } = useSecurity(teamName);

    const handlePaste = (e) => {
        if (security.disableCopyPaste) {
            e.preventDefault();
            reportAction('ALERT', 'Attempted to paste code into editor');
            alert("PASTING IS NOT ALLOWED! ACTION LOGGED.");
        }
    };

    const handleEditorDidMount = (editor, monaco) => {
        // Register Ctrl+Enter and Cmd+Enter shortcut directly within Monaco editor
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            if (onSubmitShortcut && !isLocked) {
                onSubmitShortcut();
            }
        });
    };

    return (
        <div className="clean-code-panel">
            {/* Editor Toolbar */}
            <div className="clean-editor-toolbar">
                <div className="toolbar-left">
                    <span className="toolbar-label">Language</span>
                    <select
                        className="clean-lang-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        disabled={isLocked}
                        aria-label="Language selector"
                    >
                        <option value="python">Python 3</option>
                        <option value="cpp">C++ (GCC 17)</option>
                        <option value="java">Java 17</option>
                    </select>
                </div>

                <div className="toolbar-right">
                    <div className="clean-integrity-badge" title="Integrity Lock: Anti-cheat security active">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <span>Integrity Lock</span>
                    </div>
                    {isLocked && <span className="clean-locked-pill">Locked</span>}
                </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="clean-monaco-wrap" onPaste={handlePaste}>
                <Editor
                    height="100%"
                    language={language}
                    theme="vs-dark"
                    value={code}
                    onChange={setCode}
                    onMount={handleEditorDidMount}
                    options={{
                        readOnly: isLocked,
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                        scrollBeyondLastLine: false,
                        padding: { top: 12, bottom: 12 },
                        lineNumbersMinChars: 3,
                        contextmenu: !security.disableCopyPaste && !security.disableTextSelection,
                        copySelection: !security.disableCopyPaste,
                        links: false,
                        dragAndDrop: false,
                        selectionClipboard: false,
                        automaticLayout: true,
                    }}
                />
            </div>
        </div>
    );
};

export default CodePanel;
