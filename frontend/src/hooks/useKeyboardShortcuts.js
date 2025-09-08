import { useEffect, useCallback } from 'react';

// Keyboard shortcut definitions
export const SHORTCUTS = {
  SEARCH: { key: '/', modifiers: [], description: 'Open search' },
  FILTER: { key: 'f', modifiers: [], description: 'Open filters' },
  PRICING: { key: 'p', modifiers: [], description: 'Go to pricing' },
  ALERTS: { key: 'a', modifiers: [], description: 'Go to alerts' },
  HELP: { key: '?', modifiers: ['shift'], description: 'Show keyboard shortcuts' },
  ESCAPE: { key: 'Escape', modifiers: [], description: 'Close modal/panel' },
  REFRESH: { key: 'r', modifiers: [], description: 'Refresh data' },
  FULLSCREEN_MAP: { key: 'm', modifiers: [], description: 'Toggle fullscreen map' },
  TOGGLE_SIDEBAR: { key: 's', modifiers: [], description: 'Toggle sidebar' }
};

const useKeyboardShortcuts = (shortcuts = {}, enabled = true) => {
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when user is typing in inputs
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    );
    
    if (isTyping && event.key !== 'Escape') return;
    
    // Check each shortcut
    Object.entries(shortcuts).forEach(([name, handler]) => {
      const shortcut = SHORTCUTS[name];
      if (!shortcut) return;
      
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const modifiersMatch = checkModifiers(event, shortcut.modifiers);
      
      if (keyMatches && modifiersMatch) {
        event.preventDefault();
        event.stopPropagation();
        handler(event);
      }
    });
  }, [shortcuts, enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null;
};

const checkModifiers = (event, requiredModifiers) => {
  const modifiers = {
    'ctrl': event.ctrlKey,
    'alt': event.altKey,
    'shift': event.shiftKey,
    'meta': event.metaKey
  };

  // Check that all required modifiers are pressed
  const requiredPressed = requiredModifiers.every(mod => modifiers[mod.toLowerCase()]);
  
  // Check that no extra modifiers are pressed (except for allowed combinations)
  const extraPressed = Object.entries(modifiers).some(([key, pressed]) => 
    pressed && !requiredModifiers.includes(key)
  );

  return requiredPressed && !extraPressed;
};

export default useKeyboardShortcuts;