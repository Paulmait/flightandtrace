import React, { useEffect, useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

const SupabaseTest = () => {
  const { connected, checkConnection } = useSupabase();
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runTest = async () => {
      setLoading(true);
      try {
        await checkConnection();
        setTestResult({
          success: true,
          message: `Supabase connection: ${connected ? 'Connected' : 'Disconnected'}`
        });
      } catch (error) {
        setTestResult({
          success: false,
          message: `Supabase connection error: ${error.message}`
        });
      } finally {
        setLoading(false);
      }
    };

    runTest();
  }, [checkConnection, connected]);

  if (loading) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: '10px', 
        right: '10px', 
        background: '#f0f0f0', 
        padding: '10px', 
        borderRadius: '5px',
        zIndex: 1000,
        fontSize: '12px'
      }}>
        Testing Supabase connection...
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: testResult?.success ? '#d4edda' : '#f8d7da', 
      color: testResult?.success ? '#155724' : '#721c24',
      padding: '10px', 
      borderRadius: '5px',
      border: testResult?.success ? '1px solid #c3e6cb' : '1px solid #f5c6cb',
      zIndex: 1000,
      fontSize: '12px',
      maxWidth: '300px'
    }}>
      {testResult?.message || 'Testing...'}
    </div>
  );
};

export default SupabaseTest;