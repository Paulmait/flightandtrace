import { useEffect } from 'react';

export default function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    function handleKey(e) {
      if (e.ctrlKey && e.key === 'n') {
        shortcuts?.newFlight && shortcuts.newFlight();
      }
      if (e.ctrlKey && e.key === 'h') {
        shortcuts?.goHistory && shortcuts.goHistory();
      }
      if (e.ctrlKey && e.key === 'a') {
        shortcuts?.goAnalytics && shortcuts.goAnalytics();
      }
      if (e.ctrlKey && e.key === 'm') {
        shortcuts?.goMap && shortcuts.goMap();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [shortcuts]);
}
