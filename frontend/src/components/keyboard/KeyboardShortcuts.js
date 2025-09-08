/**
 * Keyboard Shortcuts System
 * Global keyboard shortcuts for power users
 */

import React, { useState, useEffect, useCallback } from 'react';

const KeyboardShortcuts = ({ onShortcut }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [activeShortcuts, setActiveShortcuts] = useState(new Set());

  // Define all keyboard shortcuts
  const shortcuts = {
    // Navigation shortcuts
    'KeyS': {
      key: 'S',
      description: 'Focus search',
      action: 'focus_search',
      category: 'Navigation'
    },
    'KeyM': {
      key: 'M',
      description: 'Toggle map/list view',
      action: 'toggle_view',
      category: 'Navigation'
    },
    'KeyF': {
      key: 'F',
      description: 'Toggle filters',
      action: 'toggle_filters',
      category: 'Navigation'
    },
    'KeyW': {
      key: 'W',
      description: 'Open watchlist',
      action: 'open_watchlist',
      category: 'Navigation'
    },
    
    // Map controls
    'Equal': {
      key: '=',
      description: 'Zoom in',
      action: 'zoom_in',
      category: 'Map'
    },
    'Minus': {
      key: '-',
      description: 'Zoom out', 
      action: 'zoom_out',
      category: 'Map'
    },
    'KeyR': {
      key: 'R',
      description: 'Reset map view',
      action: 'reset_map',
      category: 'Map'
    },
    'KeyL': {
      key: 'L',
      description: 'Toggle layers',
      action: 'toggle_layers',
      category: 'Map'
    },
    
    // Flight actions
    'Space': {
      key: 'Space',
      description: 'Follow selected flight',
      action: 'follow_flight',
      category: 'Tracking',
      requiresSelection: true
    },
    'KeyT': {
      key: 'T',
      description: 'Track selected aircraft',
      action: 'track_aircraft',
      category: 'Tracking',
      requiresSelection: true
    },
    'KeyI': {
      key: 'I',
      description: 'Show flight info',
      action: 'show_info',
      category: 'Tracking',
      requiresSelection: true
    },
    
    // Quick actions
    'KeyN': {
      key: 'N',
      description: 'New alert',
      action: 'new_alert',
      category: 'Actions'
    },
    'KeyE': {
      key: 'E',
      description: 'Export data',
      action: 'export_data',
      category: 'Actions'
    },
    'KeyH': {
      key: 'H',
      description: 'Show help',
      action: 'show_help',
      category: 'Help'
    },
    
    // Escape actions
    'Escape': {
      key: 'Esc',
      description: 'Close modal/clear selection',
      action: 'escape',
      category: 'General'
    }
  };

  // Handle keydown events
  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when user is typing in inputs
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.contentEditable === 'true') {
      return;
    }

    const shortcut = shortcuts[event.code];
    if (!shortcut) return;

    // Special handling for help shortcut
    if (event.code === 'KeyH' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      setShowHelp(prev => !prev);
      return;
    }

    // Prevent default for all handled shortcuts
    event.preventDefault();
    
    // Visual feedback
    setActiveShortcuts(prev => new Set([...prev, event.code]));
    setTimeout(() => {
      setActiveShortcuts(prev => {
        const newSet = new Set(prev);
        newSet.delete(event.code);
        return newSet;
      });
    }, 150);

    // Execute shortcut action
    if (onShortcut) {
      onShortcut(shortcut.action, shortcut);
    }
  }, [onShortcut]);

  // Handle keyup for visual feedback
  const handleKeyUp = useCallback((event) => {
    setActiveShortcuts(prev => {
      const newSet = new Set(prev);
      newSet.delete(event.code);
      return newSet;
    });
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Group shortcuts by category
  const groupedShortcuts = Object.values(shortcuts).reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {});

  const KeyboardHelp = () => (
    <div className="keyboard-help-overlay" onClick={() => setShowHelp(false)}>
      <div className="keyboard-help-modal" onClick={e => e.stopPropagation()}>
        <div className="help-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="close-btn" onClick={() => setShowHelp(false)}>
            ✕
          </button>
        </div>
        
        <div className="help-content">
          <div className="help-intro">
            <p>Use these keyboard shortcuts to navigate FlightTrace more efficiently:</p>
          </div>
          
          <div className="shortcuts-grid">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category} className="shortcut-category">
                <h3>{category}</h3>
                <div className="shortcuts-list">
                  {categoryShortcuts.map((shortcut) => (
                    <div key={shortcut.key} className="shortcut-item">
                      <div className="shortcut-key">
                        <kbd>{shortcut.key}</kbd>
                      </div>
                      <div className="shortcut-description">
                        {shortcut.description}
                        {shortcut.requiresSelection && (
                          <span className="requirement">*requires selection</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="help-footer">
            <p>
              <strong>Tip:</strong> These shortcuts work anywhere in FlightTrace, 
              except when typing in search boxes or forms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Visual feedback for active shortcuts */}
      {activeShortcuts.size > 0 && (
        <div className="keyboard-feedback">
          {Array.from(activeShortcuts).map(code => {
            const shortcut = shortcuts[code];
            return shortcut ? (
              <div key={code} className="active-shortcut">
                <kbd>{shortcut.key}</kbd>
                <span>{shortcut.description}</span>
              </div>
            ) : null;
          })}
        </div>
      )}

      {/* Help modal */}
      {showHelp && <KeyboardHelp />}
    </>
  );
};

/**
 * Hook for using keyboard shortcuts in components
 */
export const useKeyboardShortcuts = (shortcuts, dependencies = []) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts when user is typing
      if (event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA' || 
          event.target.contentEditable === 'true') {
        return;
      }

      for (const [key, handler] of Object.entries(shortcuts)) {
        if (event.code === key || event.key === key) {
          event.preventDefault();
          handler(event);
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, dependencies);
};

/**
 * Keyboard shortcut context menu component
 */
export const ShortcutContextMenu = ({ visible, shortcuts, onSelect, position }) => {
  if (!visible) return null;

  return (
    <div 
      className="shortcut-context-menu"
      style={{
        top: position.y,
        left: position.x
      }}
    >
      <div className="context-menu-header">
        <span>Quick Actions</span>
      </div>
      <div className="context-menu-items">
        {shortcuts.map(shortcut => (
          <button
            key={shortcut.key}
            className="context-menu-item"
            onClick={() => onSelect(shortcut.action)}
          >
            <span className="action-name">{shortcut.description}</span>
            <kbd className="action-key">{shortcut.key}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Shortcut hint tooltip
 */
export const ShortcutHint = ({ shortcut, children }) => {
  const [showHint, setShowHint] = useState(false);

  return (
    <div 
      className="shortcut-hint-container"
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
    >
      {children}
      {showHint && (
        <div className="shortcut-hint-tooltip">
          <span>{shortcut.description}</span>
          <kbd>{shortcut.key}</kbd>
        </div>
      )}
    </div>
  );
};

export default KeyboardShortcuts;