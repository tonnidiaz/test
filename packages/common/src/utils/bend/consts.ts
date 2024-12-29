import ws from "ws";

export const WS: typeof ws.WebSocket = ws.WebSocket || ws;