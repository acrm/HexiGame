import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  isLoading: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <div className="loading-hexagon">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <polygon
                points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                className="loading-hex-shape"
              />
            </svg>
          </div>
        </div>
        <div className="loading-text">HexiGame</div>
        <div className="loading-spinner">
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
