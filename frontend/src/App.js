import React, { useState, useEffect } from 'react';
import EnhancedAppV2 from './components/EnhancedAppV2.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Show splash screen briefly
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

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