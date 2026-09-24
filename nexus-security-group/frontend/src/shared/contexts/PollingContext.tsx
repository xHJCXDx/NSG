import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type PollingInterval = 15000 | 30000 | 60000 | 300000 | false;

interface PollingContextType {
  pollingInterval: PollingInterval;
  setPollingInterval: (interval: PollingInterval) => void;
}

const STORAGE_KEY = 'nsg:polling:interval';
const DEFAULT_INTERVAL: PollingInterval = 30000;

function readFromStorage(): PollingInterval {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'false') return false;
  const parsed = Number(raw);
  if (parsed === 15000 || parsed === 30000 || parsed === 60000 || parsed === 300000) {
    return parsed;
  }
  return DEFAULT_INTERVAL;
}

const PollingContext = createContext<PollingContextType | null>(null);

export function PollingProvider({ children }: { children: ReactNode }) {
  const [pollingInterval, setPollingIntervalState] = useState<PollingInterval>(
    () => readFromStorage(),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(pollingInterval));
  }, [pollingInterval]);

  function setPollingInterval(interval: PollingInterval) {
    setPollingIntervalState(interval);
  }

  return (
    <PollingContext.Provider value={{ pollingInterval, setPollingInterval }}>
      {children}
    </PollingContext.Provider>
  );
}

export function usePolling(): PollingContextType {
  const ctx = useContext(PollingContext);
  if (!ctx) throw new Error('usePolling must be used inside PollingProvider');
  return ctx;
}
