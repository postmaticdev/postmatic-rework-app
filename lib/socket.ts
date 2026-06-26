"use client";

import {
  NEXT_PUBLIC_SOCKET_ORIGIN,
  NEXT_PUBLIC_SOCKET_PATH,
} from "@/constants";

export type RealtimeEnvelope<T = unknown> = {
  type: string;
  topic?: string;
  data?: T;
  sentAt?: string;
};

type SocketEventMap = {
  close: CloseEvent;
  error: Event;
  message: RealtimeEnvelope;
  open: Event;
};

type SocketEventName = keyof SocketEventMap;
type SocketListener<TEventName extends SocketEventName> = (
  event: SocketEventMap[TEventName]
) => void;

type ListenerMap = {
  [TEventName in SocketEventName]: Set<SocketListener<TEventName>>;
};

type CreateSocketOpts = {
  heartbeatIntervalMs?: number;
  path?: string;
  reconnectDelayMs?: number;
  token?: string | null;
  tokenQueryKey?: string;
  url?: string;
};

type SubscribePayload = {
  topic?: string;
  topics?: string[];
  type: "subscribe" | "unsubscribe";
};

const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
const DEFAULT_RECONNECT_DELAY_MS = 2_000;

let socket: BrowserRealtimeSocket | null = null;

function buildWebSocketUrl(
  origin: string,
  path: string,
  token?: string | null,
  tokenQueryKey = "accessToken"
) {
  const baseUrl = new URL(origin || window.location.origin);
  if (baseUrl.protocol === "https:") {
    baseUrl.protocol = "wss:";
  } else if (baseUrl.protocol === "http:") {
    baseUrl.protocol = "ws:";
  }

  const wsUrl = new URL(path, baseUrl);
  if (token) {
    wsUrl.searchParams.set(tokenQueryKey, token);
  }

  return wsUrl.toString();
}

class BrowserRealtimeSocket {
  private heartbeatIntervalId: number | null = null;
  private listeners: ListenerMap = {
    close: new Set(),
    error: new Set(),
    message: new Set(),
    open: new Set(),
  };
  private manualDisconnect = false;
  private reconnectTimeoutId: number | null = null;
  private subscriptions = new Set<string>();
  private ws: WebSocket | null = null;

  constructor(private readonly opts: Required<CreateSocketOpts>) {
    this.connect();
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect() {
    if (typeof window === "undefined") return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.clearReconnect();
    this.manualDisconnect = false;

    const wsUrl = buildWebSocketUrl(
      this.opts.url,
      this.opts.path,
      this.opts.token,
      this.opts.tokenQueryKey
    );

    this.ws = new WebSocket(wsUrl);
    this.ws.addEventListener("open", this.handleOpen);
    this.ws.addEventListener("close", this.handleClose);
    this.ws.addEventListener("error", this.handleError);
    this.ws.addEventListener("message", this.handleMessage);
  }

  disconnect() {
    this.manualDisconnect = true;
    this.stopHeartbeat();
    this.clearReconnect();

    if (this.ws) {
      this.ws.removeEventListener("open", this.handleOpen);
      this.ws.removeEventListener("close", this.handleClose);
      this.ws.removeEventListener("error", this.handleError);
      this.ws.removeEventListener("message", this.handleMessage);
      this.ws.close();
      this.ws = null;
    }
  }

  on<TEventName extends SocketEventName>(
    eventName: TEventName,
    listener: SocketListener<TEventName>
  ) {
    this.listeners[eventName].add(listener as never);
  }

  off<TEventName extends SocketEventName>(
    eventName: TEventName,
    listener: SocketListener<TEventName>
  ) {
    this.listeners[eventName].delete(listener as never);
  }

  send(payload: Record<string, unknown>) {
    if (!this.connected || !this.ws) return;
    this.ws.send(JSON.stringify(payload));
  }

  subscribe(topics: string | string[]) {
    const nextTopics = Array.isArray(topics) ? topics : [topics];
    nextTopics.filter(Boolean).forEach((topic) => this.subscriptions.add(topic));
    this.flushSubscriptions("subscribe", nextTopics);
  }

  unsubscribe(topics: string | string[]) {
    const nextTopics = Array.isArray(topics) ? topics : [topics];
    nextTopics.filter(Boolean).forEach((topic) => this.subscriptions.delete(topic));
    this.flushSubscriptions("unsubscribe", nextTopics);
  }

  private readonly handleOpen = (event: Event) => {
    this.startHeartbeat();
    this.emit("open", event);
    this.flushSubscriptions("subscribe", [...this.subscriptions]);
  };

  private readonly handleClose = (event: CloseEvent) => {
    this.stopHeartbeat();
    this.emit("close", event);
    this.ws = null;

    if (!this.manualDisconnect) {
      this.scheduleReconnect();
    }
  };

  private readonly handleError = (event: Event) => {
    this.emit("error", event);
  };

  private readonly handleMessage = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as RealtimeEnvelope;
      this.emit("message", payload);
    } catch {
      // Ignore malformed payloads so one bad event does not break the socket lifecycle.
    }
  };

  private emit<TEventName extends SocketEventName>(
    eventName: TEventName,
    event: SocketEventMap[TEventName]
  ) {
    this.listeners[eventName].forEach((listener) => listener(event as never));
  }

  private flushSubscriptions(
    action: SubscribePayload["type"],
    topics: string[]
  ) {
    const filteredTopics = topics.filter(Boolean);
    if (!filteredTopics.length || !this.connected) return;

    const payload: SubscribePayload =
      filteredTopics.length === 1
        ? { type: action, topic: filteredTopics[0] }
        : { type: action, topics: filteredTopics };

    this.send(payload);
  }

  private scheduleReconnect() {
    this.clearReconnect();
    this.reconnectTimeoutId = window.setTimeout(() => {
      this.connect();
    }, this.opts.reconnectDelayMs);
  }

  private clearReconnect() {
    if (this.reconnectTimeoutId !== null) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatIntervalId = window.setInterval(() => {
      this.send({ type: "ping" });
    }, this.opts.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatIntervalId !== null) {
      window.clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }
}

export function getSocket() {
  return socket;
}

export function createSocket(opts: CreateSocketOpts = {}) {
  if (socket) return socket;

  socket = new BrowserRealtimeSocket({
    heartbeatIntervalMs:
      opts.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
    path: opts.path ?? NEXT_PUBLIC_SOCKET_PATH,
    reconnectDelayMs: opts.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS,
    token: opts.token ?? null,
    tokenQueryKey: opts.tokenQueryKey ?? "accessToken",
    url: opts.url ?? NEXT_PUBLIC_SOCKET_ORIGIN,
  });

  return socket;
}

export function destroySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
