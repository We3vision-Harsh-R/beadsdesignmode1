import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

export const BRANDING_DEFAULTS = { url: '', height: 40, mobileHeight: 30 };
const DEFAULTS = { razorpayEnabled: false, upiId: '', upiName: '', supportEmail: '', supportPhone: '', whatsapp: '', branding: BRANDING_DEFAULTS };
const ConfigContext = createContext(DEFAULTS);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULTS);
  useEffect(() => {
    const load = () => api('/config').then(setConfig).catch(() => {});
    load();
    // The admin Settings page fires this after saving, so the header updates without a reload
    window.addEventListener('config-changed', load);
    return () => window.removeEventListener('config-changed', load);
  }, []);
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export const useConfig = () => useContext(ConfigContext);
