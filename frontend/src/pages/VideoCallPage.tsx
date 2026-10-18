import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '../services/apiClient';
import './VideoCallPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';
/** The signaling socket lives at the backend's root, not under /api/v1 — see
 * backend/src/modules/video/video.gateway.ts's `path: '/socket.io'`. */
const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

type CallStatus = 'connecting' | 'waiting' | 'connected' | 'ended' | 'error';

/**
 * 1:1 WebRTC video call for an online consultation. Blur is display-layer, not stream-level (see
 * the implementation plan): the remote participant's own video element is rendered with a CSS
 * blur filter by default, removed only once they signal "revealed" — the raw video still crosses
 * the connection either way. No TURN server is configured, so very restrictive networks may fail
 * to connect a direct peer connection.
 */
export function VideoCallPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CallStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [remoteRevealed, setRemoteRevealed] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function start() {
      const token = getAccessToken();
      if (!token) {
        setStatus('error');
        setErrorMessage('You need to be logged in to join this call.');
        return;
      }

      let localStream: MediaStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        setStatus('error');
        setErrorMessage('Could not access your camera/microphone. Check your browser permissions.');
        return;
      }
      if (cancelled) {
        localStream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = localStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      const socket = io(SOCKET_BASE_URL, { path: '/socket.io', auth: { token } });
      socketRef.current = socket;

      function createPeerConnection(): RTCPeerConnection {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0] ?? null;
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('signal', { consultationId: id, data: { type: 'candidate', candidate: event.candidate } });
          }
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') setStatus('connected');
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            setStatus('error');
            setErrorMessage('The call connection was lost.');
          }
        };
        return pc;
      }

      socket.on('connect', () => socket.emit('join', { consultationId: id }));

      socket.on('join-error', ({ message }: { message: string }) => {
        setStatus('error');
        setErrorMessage(message);
      });

      socket.on('ready', async ({ shouldInitiate }: { shouldInitiate: boolean }) => {
        setStatus('waiting');
        const pc = createPeerConnection();
        peerRef.current = pc;
        if (shouldInitiate) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('signal', { consultationId: id, data: { type: 'offer', sdp: offer } });
        }
      });

      socket.on('signal', async ({ data }: { data: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) => {
        const pc = peerRef.current;
        if (!pc) return;
        if (data.type === 'offer' && data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', { consultationId: id, data: { type: 'answer', sdp: answer } });
        } else if (data.type === 'answer' && data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.type === 'candidate' && data.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch {
            // A candidate can arrive before setRemoteDescription finishes — safe to drop.
          }
        }
      });

      socket.on('blur-state', ({ revealed: theirRevealed }: { revealed: boolean }) => {
        setRemoteRevealed(theirRevealed);
      });

      socket.on('peer-left', () => {
        setStatus('ended');
        setErrorMessage('The other participant left the call.');
      });
    }

    start();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [id]);

  function toggleReveal() {
    const next = !revealed;
    setRevealed(next);
    socketRef.current?.emit('blur-state', { consultationId: id, revealed: next });
  }

  function endCall() {
    navigate(-1);
  }

  return (
    <div className="video-call-page">
      <div className="video-call-page__remote">
        <video ref={remoteVideoRef} autoPlay playsInline className={remoteRevealed ? '' : 'video-call-page__blur'} />
        {status !== 'connected' && (
          <div className="video-call-page__overlay">
            {status === 'error' ? errorMessage : status === 'ended' ? errorMessage : 'Connecting…'}
          </div>
        )}
      </div>

      <video ref={localVideoRef} autoPlay playsInline muted className="video-call-page__local" />

      <div className="video-call-page__controls">
        <button className="btn btn-secondary" onClick={toggleReveal}>
          {revealed ? 'Blur my video' : 'Reveal my video'}
        </button>
        <button className="btn btn-primary" onClick={endCall}>
          Leave call
        </button>
      </div>
    </div>
  );
}
