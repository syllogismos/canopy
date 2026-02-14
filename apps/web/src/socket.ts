import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@canopy/shared";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  "http://localhost:3001",
  {
    autoConnect: false,
  }
);
