import React from 'react';
import { SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import './KeyboardShortcutsModal.css';

const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const formatShortcut = (shortcut) => {
    const parts = [];
    
    if (shortcut.modifiers.includes('ctrl')) parts.push('Ctrl');
    if (shortcut.modifiers.includes('alt')) parts.push('Alt');  
    if (shortcut.modifiers.includes('shift')) parts.push('Shift');
    if (shortcut.modifiers.includes('meta')) parts.push('⌘');
    
    // Special formatting for certain keys
    let keyDisplay = shortcut.key;
    if (shortcut.key === '/') keyDisplay = '/';
    if (shortcut.key === '?') keyDisplay = '?';
    if (shortcut.key === 'Escape') keyDisplay = 'Esc';
    
    parts.push(keyDisplay.toUpperCase());
    
    return parts.join(' + ');
  };

  const shortcutGroups = {
    'Navigation': [
      { name: 'SEARCH', ...SHORTCUTS.SEARCH },
      { name: 'FILTER', ...SHORTCUTS.FILTER },
      { name: 'PRICING', ...SHORTCUTS.PRICING },
      { name: 'ALERTS', ...SHORTCUTS.ALERTS }
    ],
    'Map Controls': [
      { name: 'REFRESH', ...SHORTCUTS.REFRESH },
      { name: 'FULLSCREEN_MAP', ...SHORTCUTS.FULLSCREEN_MAP },
      { name: 'TOGGLE_SIDEBAR', ...SHORTCUTS.TOGGLE_SIDEBAR }
    ],
    'General': [
      { name: 'HELP', ...SHORTCUTS.HELP },
      { name: 'ESCAPE', ...SHORTCUTS.ESCAPE }
    ]
  };

  return (
    <div className=\"keyboard-shortcuts-modal-overlay\" onClick={onClose}>
      <div className=\"keyboard-shortcuts-modal\" onClick={(e) => e.stopPropagation()}>
        <div className=\"modal-header\">
          <h2>Keyboard Shortcuts</h2>
          <button className=\"close-button\" onClick={onClose} aria-label=\"Close\">×</button>
        </div>
        
        <div className=\"modal-content\">
          {Object.entries(shortcutGroups).map(([groupName, shortcuts]) => (
            <div key={groupName} className=\"shortcut-group\">
              <h3 className=\"group-title\">{groupName}</h3>
              <div className=\"shortcuts-list\">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.name} className=\"shortcut-item\">
                    <span className=\"shortcut-description\">{shortcut.description}</span>
                    <div className=\"shortcut-keys\">
                      {formatShortcut(shortcut).split(' + ').map((key, index, array) => (
                        <React.Fragment key={index}>
                          <kbd className=\"key\">{key}</kbd>
                          {index < array.length - 1 && <span className=\"key-separator\">+</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className=\"modal-footer\">
          <p className=\"footer-note\">
            Press <kbd className=\"key\">?</kbd> anytime to open this help
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;