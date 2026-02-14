/** Socket.io event types shared between client and server */

export interface ServerToClientEvents {
  "connection:ack": (data: { status: string }) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
}
