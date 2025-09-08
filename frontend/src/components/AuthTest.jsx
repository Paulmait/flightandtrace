import React, { useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

const AuthTest = () => {
  const { user, loading, signIn, signUp, signOut } = useSupabase();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('testpassword123');
  const [authResult, setAuthResult] = useState(null);

  const handleSignUp = async () => {
    setAuthResult(null);
    const result = await signUp(email, password, { fullName: 'Test User' });
    setAuthResult(result);
  };

  const handleSignIn = async () => {
    setAuthResult(null);
    const result = await signIn(email, password);
    setAuthResult(result);
  };

  const handleSignOut = async () => {
    setAuthResult(null);
    const result = await signOut();
    setAuthResult(result);
  };

  if (loading) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: '50px', 
        right: '10px', 
        background: '#f0f0f0', 
        padding: '15px', 
        borderRadius: '5px',
        zIndex: 1000,
        fontSize: '12px',
        minWidth: '200px'
      }}>
        Loading authentication...
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '50px', 
      right: '10px', 
      background: '#ffffff', 
      padding: '15px', 
      borderRadius: '5px',
      border: '1px solid #ddd',
      zIndex: 1000,
      fontSize: '12px',
      minWidth: '250px',
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>Auth Test Panel</h4>
      
      {user ? (
        <div>
          <p><strong>Logged in as:</strong> {user.email}</p>
          <button onClick={handleSignOut} style={{ fontSize: '11px', padding: '5px 10px' }}>
            Sign Out
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', fontSize: '11px', padding: '5px', marginBottom: '5px' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', fontSize: '11px', padding: '5px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={handleSignUp} style={{ fontSize: '11px', padding: '5px 10px', flex: 1 }}>
              Sign Up
            </button>
            <button onClick={handleSignIn} style={{ fontSize: '11px', padding: '5px 10px', flex: 1 }}>
              Sign In
            </button>
          </div>
        </div>
      )}
      
      {authResult && (
        <div style={{ 
          marginTop: '10px', 
          padding: '8px', 
          background: authResult.success ? '#d4edda' : '#f8d7da',
          color: authResult.success ? '#155724' : '#721c24',
          borderRadius: '3px',
          fontSize: '10px'
        }}>
          {authResult.success ? 'Success!' : `Error: ${authResult.error}`}
        </div>
      )}
    </div>
  );
};

export default AuthTest;