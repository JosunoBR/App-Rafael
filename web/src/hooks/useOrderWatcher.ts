import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  sendOrderPresencePing, 
  sendOrderPresenceLeave, 
  OrderViewerInfo, 
  OrderPresenceResponse 
} from '../utils/api';

export interface UseOrderWatcherOptions {
  orderId?: string;
  currentVersion?: number;
  currentUserId?: string;
  enabled?: boolean;
  intervalMs?: number;
  onRemoteChange?: (info: OrderPresenceResponse) => void;
  onViewerJoined?: (viewer: OrderViewerInfo) => void;
  onViewerLeft?: (viewer: OrderViewerInfo) => void;
  onInitialViewers?: (viewers: OrderViewerInfo[]) => void;
}

export function useOrderWatcher({
  orderId,
  currentVersion = 1,
  currentUserId,
  enabled = true,
  intervalMs = 8000,
  onRemoteChange,
  onViewerJoined,
  onViewerLeft,
  onInitialViewers
}: UseOrderWatcherOptions) {
  const [activeViewers, setActiveViewers] = useState<OrderViewerInfo[]>([]);
  const [remoteInfo, setRemoteInfo] = useState<{
    version: number;
    lastModifier: string | null;
    lastModifiedAt: string | null;
  } | null>(null);
  const [hasNewerVersion, setHasNewerVersion] = useState(false);

  const isCheckingRef = useRef(false);
  const prevViewersRef = useRef<OrderViewerInfo[]>([]);
  const isFirstPingRef = useRef(true);

  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;
  const onViewerJoinedRef = useRef(onViewerJoined);
  onViewerJoinedRef.current = onViewerJoined;
  const onViewerLeftRef = useRef(onViewerLeft);
  onViewerLeftRef.current = onViewerLeft;
  const onInitialViewersRef = useRef(onInitialViewers);
  onInitialViewersRef.current = onInitialViewers;

  const pingPresence = useCallback(async () => {
    if (!orderId || !enabled || isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const res = await sendOrderPresencePing(orderId);
      if (!res) return;

      const newViewers = Array.isArray(res.activeViewers) ? res.activeViewers : [];
      const prevViewers = prevViewersRef.current;

      // Eventos de entrada e saída
      if (!isFirstPingRef.current) {
        const newlyJoined = newViewers.filter(v => !prevViewers.some(p => p.userId === v.userId));
        const newlyLeft = prevViewers.filter(p => !newViewers.some(v => v.userId === p.userId));

        newlyJoined.forEach(v => {
          if (onViewerJoinedRef.current) onViewerJoinedRef.current(v);
        });

        newlyLeft.forEach(v => {
          if (onViewerLeftRef.current) onViewerLeftRef.current(v);
        });
      } else {
        isFirstPingRef.current = false;
        // Se ao acessar o pedido já houver outros operadores nele, notifica imediatamente quem acabou de entrar!
        if (newViewers.length > 0) {
          if (onInitialViewersRef.current) {
            onInitialViewersRef.current(newViewers);
          } else if (onViewerJoinedRef.current) {
            newViewers.forEach(v => onViewerJoinedRef.current!(v));
          }
        }
      }

      prevViewersRef.current = newViewers;
      setActiveViewers(newViewers);

      // Verificação de concorrência de versão (apenas se outro operador salvou)
      const isOtherUserModifier = res.lastModifiedById && currentUserId && res.lastModifiedById !== currentUserId;
      if (res.currentVersion > currentVersion && isOtherUserModifier) {
        setRemoteInfo({
          version: res.currentVersion,
          lastModifier: res.lastModifiedByName,
          lastModifiedAt: res.lastModifiedAt
        });
        setHasNewerVersion(true);
        if (onRemoteChangeRef.current) {
          onRemoteChangeRef.current(res);
        }
      } else if (res.currentVersion <= currentVersion) {
        setHasNewerVersion(false);
        setRemoteInfo(null);
      }
    } catch {
      // Falha silenciosa de polling para manter a interface fluida
    } finally {
      isCheckingRef.current = false;
    }
  }, [orderId, currentVersion, currentUserId, enabled]);

  useEffect(() => {
    if (!orderId || !enabled) {
      setActiveViewers([]);
      setHasNewerVersion(false);
      setRemoteInfo(null);
      isFirstPingRef.current = true;
      prevViewersRef.current = [];
      return;
    }

    isFirstPingRef.current = true;
    prevViewersRef.current = [];

    // Primeiro ping IMEDIATO ao acessar o pedido (segundo 0)
    void pingPresence();

    // Heartbeat periódico (a cada intervalMs)
    const interval = setInterval(() => {
      void pingPresence();
    }, intervalMs);

    // Reativação imediata ao voltar o foco ou reabrir aba
    const handleFocus = () => {
      void pingPresence();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pingPresence();
      }
    };

    const handleBeforeUnload = () => {
      sendOrderPresenceLeave(orderId, currentUserId);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Limpeza imediata no servidor ao sair do pedido
      sendOrderPresenceLeave(orderId, currentUserId);
    };
  }, [orderId, enabled, intervalMs, pingPresence, currentUserId]);

  const dismissAlert = useCallback(() => {
    setHasNewerVersion(false);
  }, []);

  return {
    activeViewers,
    remoteInfo,
    hasNewerVersion,
    pingPresence,
    dismissAlert
  };
}
