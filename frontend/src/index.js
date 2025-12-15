import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './AuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
