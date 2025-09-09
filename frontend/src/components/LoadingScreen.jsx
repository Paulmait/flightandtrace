import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <img 
          src="/logo192.png" 
          alt="Flight Tracker" 
          className="loading-logo"
        />
        <h1 className="loading-title">Flight Tracker</h1>
        <p className="loading-subtitle">Real-time aircraft tracking</p>
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
        </div>
        <p className="loading-text">Connecting to live flight data...</p>
      </div>
      <div className="loading-footer">
        <p>Powered by OpenSky Network</p>
      </div>
    </div>
  );
};

export default LoadingScreen;