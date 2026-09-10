import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "fallback";

export type WebSocketEvent<T = any> = {
  type: string;
  timestamp: string;
  data: T;
};

type EventCallback = (event: WebSocketEvent) => void;

// Shared global subscription registry across components to multiplex a single socket
const subscribers: Set<EventCallback> = new Set();
let sharedWs: WebSocket | null = null;
let reconnectTimer: any = null;
let pingTimer: any = null;
let backoffSeconds = 2;
let globalStatus: ConnectionStatus = "disconnected";
const statusListeners: Set<(s: ConnectionStatus) => void> = new Set();

function setGlobalStatus(status: ConnectionStatus) {
  globalStatus = status;
  statusListeners.forEach((listener) => listener(status));
}

function getWebSocketUrl(apiUrl: string, token: string): string {
  const wsBase = apiUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
  return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
}

export function useWebSocket() {
  const { token, apiUrl } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>(globalStatus);
  const mountedRef = useRef(true);

  // Sync component status with global connection status
  useEffect(() => {
    mountedRef.current = true;
    const listener = (newStatus: ConnectionStatus) => {
      if (mountedRef.current) {
        setStatus(newStatus);
      }
    };
    statusListeners.add(listener);
    return () => {
      mountedRef.current = false;
      statusListeners.delete(listener);
    };
  }, []);

  // Connection management
  const connect = useCallback(() => {
    if (!token || sharedWs?.readyState === WebSocket.OPEN || sharedWs?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      setGlobalStatus("connecting");
      const url = getWebSocketUrl(apiUrl, token);
      const ws = new WebSocket(url);
      sharedWs = ws;

      ws.onopen = () => {
        setGlobalStatus("connected");
        backoffSeconds = 2; // reset backoff on successful connection

        // Setup ping heartbeat every 25 seconds
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: "ping" }));
            } catch {}
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && typeof parsed === "object" && parsed.type) {
            subscribers.forEach((callback) => {
              try {
                callback(parsed);
              } catch (err) {
                console.error("Error in WebSocket event listener:", err);
              }
            });
          }
        } catch {
          // Ignore malformed message without crashing
        }
      };

      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        setGlobalStatus("fallback");
        sharedWs = null;

        // Schedule reconnect with exponential backoff
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          connect();
        }, backoffSeconds * 1000);

        backoffSeconds = Math.min(backoffSeconds * 2, 30);
      };

      ws.onerror = () => {
        setGlobalStatus("fallback");
      };
    } catch (err) {
      setGlobalStatus("fallback");
    }
  }, [token, apiUrl]);

  useEffect(() => {
    if (token) {
      connect();
    } else {
      setGlobalStatus("disconnected");
      if (sharedWs) {
        sharedWs.close();
        sharedWs = null;
      }
    }
  }, [token, connect]);

  const subscribe = useCallback((callback: EventCallback) => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }, []);

  return {
    status,
    subscribe,
    isLive: status === "connected",
    isFallback: status === "fallback" || status === "disconnected",
  };
}
