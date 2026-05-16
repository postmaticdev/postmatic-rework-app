"use client";

import {
  NEXT_PUBLIC_SOCKET_ORIGIN,
  NEXT_PUBLIC_SOCKET_PATH,
} from "@/constants";
import { io, Socket } from "socket.io-client";

type Transport = "websocket" | "polling";

let socket: Socket | null = null;

type CreateSocketOpts = {
  token?: string | null;
  ns?: string;
  path?: string;
  transports?: Transport[];
  url?: string;
};

export function getSocket() {
  return socket;
}

export function createSocket(opts: CreateSocketOpts = {}) {
  if (socket && socket.connected) return socket;

  const url = opts.url ?? NEXT_PUBLIC_SOCKET_ORIGIN;

  socket = io(`${url}`, {
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    path: opts.path ?? NEXT_PUBLIC_SOCKET_PATH,
    transports: opts.transports,
    auth: opts.token ? { token: opts.token } : undefined,
    autoConnect: true,
  });

  return socket;
}

export function destroySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
