import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button } from 'react-native';

export default function AdminTimeout({ timeout = 900, onTimeout, children }) {
  // timeout in seconds (default 15 min)
  const [remaining, setRemaining] = useState(timeout);
  const timer = useRef();

  useEffect(() => {
    timer.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(timer.current);
          onTimeout && onTimeout();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [onTimeout]);

  // Reset timer on any interaction
  useEffect(() => {
    const reset = () => setRemaining(timeout);
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown', reset);
    return () => {
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [timeout]);

  if (remaining === 0) {
    return (
      <View style={{ alignItems: 'center', margin: 24 }}>
        <Text style={{ color: 'red', fontWeight: 'bold' }}>Session timed out for security.</Text>
        <Button title="Login Again" onPress={onTimeout} />
      </View>
    );
  }

  return <>{children}</>;
}
