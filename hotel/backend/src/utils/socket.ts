import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('join:table', (tableId: number) => {
      socket.join(`table:${tableId}`);
      console.log(`[Socket] Client ${socket.id} joined table:${tableId}`);
    });

    socket.on('join:kitchen', () => {
      socket.join('kitchen');
      console.log(`[Socket] Client ${socket.id} joined kitchen`);
    });

    socket.on('join:admin', () => {
      socket.join('admin');
      console.log(`[Socket] Client ${socket.id} joined admin`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

export function emitToKitchen(event: string, data: unknown): void {
  getIO().to('kitchen').emit(event, data);
}

export function emitToAdmin(event: string, data: unknown): void {
  getIO().to('admin').emit(event, data);
}

export function emitToTable(tableId: number, event: string, data: unknown): void {
  getIO().to(`table:${tableId}`).emit(event, data);
}
