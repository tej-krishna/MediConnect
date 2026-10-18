import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { env } from '../../config/env';
import { verifyAccessToken } from '../auth/jwt';
import { Consultation } from '../scheduling/consultation.model';
import { isProviderMember } from '../providers/providerStaff.service';

/**
 * WebRTC signaling only — this server never sees or relays video/audio itself, just the small
 * offer/answer/ICE-candidate messages two browsers/apps need to find each other, plus a "my blur
 * state" relay for the display-layer blur toggle (see consultation.service.ts's docs on why blur
 * is display-layer, not stream-level). One room per `consultationId`, capped at the patient + one
 * doctor-side socket — a 1:1 call, not a group call.
 *
 * No TURN server is configured (known gap — see the implementation plan): calls across very
 * restrictive networks may fail to connect a direct peer connection. Fine for initial testing on
 * normal wifi/mobile data.
 */
function roomFor(consultationId: string): string {
  return `consultation:${consultationId}`;
}

interface AuthedSocket extends Socket {
  data: {
    userId: string;
  };
}

export function initVideoGateway(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Missing access token'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as AuthedSocket).data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired access token'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    socket.on('join', async ({ consultationId }: { consultationId: string }) => {
      try {
        const consultation = await Consultation.findById(consultationId);
        if (!consultation || consultation.visitType !== 'online' || consultation.status !== 'confirmed') {
          socket.emit('join-error', { message: 'This call is not available right now' });
          return;
        }
        const isPatient = consultation.patientId.toString() === socket.data.userId;
        const isDoctorSide = !isPatient && (await isProviderMember(consultation.doctorId.toString(), socket.data.userId));
        if (!isPatient && !isDoctorSide) {
          socket.emit('join-error', { message: 'You are not part of this consultation' });
          return;
        }

        const room = roomFor(consultationId);
        const existing = await io.in(room).fetchSockets();
        if (existing.length >= 2) {
          socket.emit('join-error', { message: 'This call already has two participants' });
          return;
        }

        await socket.join(room);
        socket.to(room).emit('peer-joined');
        if (existing.length === 1) {
          // The second participant to join is told to make the initial WebRTC offer.
          socket.emit('ready', { shouldInitiate: true });
        } else {
          socket.emit('ready', { shouldInitiate: false });
        }
      } catch {
        socket.emit('join-error', { message: 'Could not join this call' });
      }
    });

    socket.on('signal', ({ consultationId, data }: { consultationId: string; data: unknown }) => {
      socket.to(roomFor(consultationId)).emit('signal', { data });
    });

    socket.on('blur-state', ({ consultationId, revealed }: { consultationId: string; revealed: boolean }) => {
      socket.to(roomFor(consultationId)).emit('blur-state', { revealed });
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('consultation:')) {
          socket.to(room).emit('peer-left');
        }
      }
    });
  });

  return io;
}
