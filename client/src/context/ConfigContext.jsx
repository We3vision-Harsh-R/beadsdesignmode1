import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const DEFAULTS = { razorpayEnabled: false, upiId: '', upiName: '', supportEmail: '', supportPhone: '', whatsapp: '' };
const ConfigContext = createContext(DEFAULTS);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULTS);
  useEffect(() => {
    api('/config').then(setConfig).catch(() => {});
  }, []);
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export const useConfig = () => useContext(ConfigContext);
