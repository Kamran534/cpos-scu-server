import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from './index.js';

let io: SocketServer | null = null;

export function initSocket(server: HttpServer) {
  const corsOrigins = config.corsOrigins === '*' 
    ? '*' 
    : config.corsOrigins.split(',').map(o => o.trim());
  
  io = new SocketServer(server, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIo(): SocketServer | null {
  return io;
}

