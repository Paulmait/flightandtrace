import React, { useState, useEffect } from 'react';
import EnhancedAppV2 from './components/EnhancedAppV2.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  // Show splash screen for appropriate duration
  useEffect(() => {
    // Minimum splash duration for UX
    const minSplashTimer = setTimeout(() => {
      setAppReady(true);
    }, 3500); // Give time for progress to complete

    // Hide splash once app is ready and minimum time has passed
    return () => clearTimeout(minSplashTimer);
  }, []);

  useEffect(() => {
    if (appReady) {
      // Small delay to ensure smooth transition
      const hideTimer = setTimeout(() => {
        setShowSplash(false);
      }, 500);
      return () => clearTimeout(hideTimer);
    }
  }, [appReady]);

  if (showSplash) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <EnhancedAppV2 />
    </AuthProvider>
  );
}

export default App;