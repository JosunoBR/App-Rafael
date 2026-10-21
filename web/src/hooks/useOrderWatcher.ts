import { useEffect, useRef, useState, useCallback } from 'react';
import { checkOrderVersionInDb, OrderVersionInfo } from '../utils/api';

export interface UseOrderWatcherOptions {
  orderId?: string;
  currentVersion?: number;
  enabled?: boolean;
  intervalMs?: number;
  onRemoteChange?: (info: OrderVersionInfo) => void;
}

export function useOrderWatcher({
  orderId,
  currentVersion = 1,
  enabled = true,
  intervalMs = 15000,
  onRemoteChange
}: UseOrderWatcherOptions) {
  const [remoteInfo, setRemoteInfo] = useState<OrderVersionInfo | null>(null);
  const [hasNewerVersion, setHasNewerVersion] = useState(false);
  const isCheckingRef = useRef(false);
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;

  const checkVersion = useCallback(async () => {
    if (!orderId || !enabled || isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const info = await checkOrderVersionInDb(orderId);
      if (info && info.version > currentVersion) {
        setRemoteInfo(info);
        setHasNewerVersion(true);
        if (onRemoteChangeRef.current) {
          onRemoteChangeRef.current(info);
        }
      } else {
        setHasNewerVersion(false);
        setRemoteInfo(null);
      }
    } catch {
      // Falha silenciosa de rede/polling para não interromper a digitação do usuário
    } finally {
      isCheckingRef.current = false;
    }
  }, [orderId, currentVersion, enabled]);

  useEffect(() => {
    if (!orderId || !enabled) {
      setHasNewerVersion(false);
      setRemoteInfo(null);
      return;
    }

    // Checagem imediata leve
    const initialTimer = setTimeout(() => {
      void checkVersion();
    }, 2000);

    // Polling regular a cada intervalMs
    const interval = setInterval(() => {
      void checkVersion();
    }, intervalMs);

    // Checagem ao recuperar o foco da janela/aba
    const handleFocus = () => {
      void checkVersion();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkVersion();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [orderId, enabled, intervalMs, checkVersion]);

  const dismissAlert = useCallback(() => {
    setHasNewerVersion(false);
  }, []);

  return {
    remoteInfo,
    hasNewerVersion,
    checkVersion,
    dismissAlert
  };
}
