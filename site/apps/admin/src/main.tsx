import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastHost } from './components/Toast';
import { ConfirmHost } from './components/Confirm';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <ToastHost />
        <ConfirmHost />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
