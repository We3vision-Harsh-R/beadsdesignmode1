import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ConfigProvider } from './context/ConfigContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider>
        <AuthProvider>
          <CartProvider>
            <App />
            <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
          </CartProvider>
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>
);
