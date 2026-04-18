import React, { useEffect, useRef, useState } from "react";
import { refreshSession } from "../api/authApi";
import { useAuthStore } from "../store/authStore";

const EVENT_BATCH_WINDOW_MS = 300;
const RECONNECT_DELAY_MS = 2_000;

function resolveRealtimeUrl() {
  const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const backendHost = import.meta.env.VITE_BACKEND_HOST;
  const backendPort = import.meta.env.VITE_BACKEND_PORT || "4000";
  const baseUrl = explicitBaseUrl || (backendHost ? `http://${backendHost}:${backendPort}` : "");

  return `${baseUrl}/api/realtime/stream`;
}

function RealtimeProvider({ children }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const reconnectTimeoutRef = useRef(null);
  const eventSourceRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const syncPromiseRef = useRef(null);

  useEffect(() => {
    const authStore = useAuthStore;

    const syncAuthState = async () => {
      const state = authStore.getState();
      if (!state.accessToken || !state.refreshToken) {
        return;
      }

      if (!syncPromiseRef.current) {
        syncPromiseRef.current = refreshSession({ refreshToken: state.refreshToken })
          .then((session) => {
            authStore.getState().login(session);
            return session;
          })
          .catch((error) => {
            authStore.getState().logout();
            throw error;
          })
          .finally(() => {
            syncPromiseRef.current = null;
          });
      }

      return syncPromiseRef.current;
    };

    const scheduleRefresh = async () => {
      if (refreshTimerRef.current) {
        return;
      }

      refreshTimerRef.current = window.setTimeout(async () => {
        refreshTimerRef.current = null;
        try {
          await syncAuthState();
        } catch (_error) {
          // Logout is already handled inside syncAuthState when the session is no longer valid.
        }
        setRefreshVersion((current) => current + 1);
      }, EVENT_BATCH_WINDOW_MS);
    };

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(resolveRealtimeUrl());
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("mutation", () => {
        void scheduleRefresh();
      });

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;

        if (reconnectTimeoutRef.current) {
          return;
        }

        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [accessToken, refreshToken]);

  return <React.Fragment key={refreshVersion}>{children}</React.Fragment>;
}

export default RealtimeProvider;
