import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:go_router/go_router.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../app/app_theme.dart';
import '../../config/api_config.dart';
import '../../services/api_client.dart';

/// Backend signaling lives at the server root (see backend/src/modules/video/video.gateway.ts's
/// `path: '/socket.io'`), not under /api/v1.
String get _socketBaseUrl => ApiConfig.baseUrl.replaceFirst(RegExp(r'/api/v\d+/?$'), '');

const _iceServers = [
  {'urls': 'stun:stun.l.google.com:19302'},
];

/// 1:1 WebRTC video call for an online consultation. Blur is display-layer, not stream-level (see
/// the implementation plan): the remote participant's video is rendered with a blur filter by
/// default, removed only once they signal "revealed" — the raw video still crosses the connection
/// either way. No TURN server is configured, so very restrictive networks may fail to connect.
class VideoCallScreen extends StatefulWidget {
  const VideoCallScreen({super.key, required this.consultationId});
  final String consultationId;

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

enum _CallStatus { connecting, waiting, connected, ended, error }

class _VideoCallScreenState extends State<VideoCallScreen> {
  final _localRenderer = RTCVideoRenderer();
  final _remoteRenderer = RTCVideoRenderer();
  io.Socket? _socket;
  RTCPeerConnection? _peer;
  MediaStream? _localStream;

  _CallStatus _status = _CallStatus.connecting;
  String? _errorMessage;
  bool _revealed = false;
  bool _remoteRevealed = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    await _localRenderer.initialize();
    await _remoteRenderer.initialize();

    final token = ApiClient.instance.accessToken;
    if (token == null) {
      setState(() {
        _status = _CallStatus.error;
        _errorMessage = 'You need to be logged in to join this call.';
      });
      return;
    }

    try {
      _localStream = await navigator.mediaDevices.getUserMedia({'audio': true, 'video': true});
    } catch (_) {
      setState(() {
        _status = _CallStatus.error;
        _errorMessage = 'Could not access your camera/microphone. Check app permissions.';
      });
      return;
    }
    if (!mounted) return;
    _localRenderer.srcObject = _localStream;

    final socket = io.io(
      _socketBaseUrl,
      io.OptionBuilder().setTransports(['websocket']).setPath('/socket.io').setAuth({'token': token}).build(),
    );
    _socket = socket;

    Future<RTCPeerConnection> createPeer() async {
      final pc = await createPeerConnection({'iceServers': _iceServers});
      for (final track in _localStream!.getTracks()) {
        await pc.addTrack(track, _localStream!);
      }
      pc.onTrack = (event) {
        if (event.streams.isNotEmpty) _remoteRenderer.srcObject = event.streams[0];
      };
      pc.onIceCandidate = (candidate) {
        socket.emit('signal', {
          'consultationId': widget.consultationId,
          'data': {
            'type': 'candidate',
            'candidate': {'candidate': candidate.candidate, 'sdpMid': candidate.sdpMid, 'sdpMLineIndex': candidate.sdpMLineIndex},
          },
        });
      };
      pc.onConnectionState = (state) {
        if (!mounted) return;
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
          setState(() => _status = _CallStatus.connected);
        } else if (state == RTCPeerConnectionState.RTCPeerConnectionStateFailed ||
            state == RTCPeerConnectionState.RTCPeerConnectionStateDisconnected) {
          setState(() {
            _status = _CallStatus.error;
            _errorMessage = 'The call connection was lost.';
          });
        }
      };
      return pc;
    }

    socket.onConnect((_) => socket.emit('join', {'consultationId': widget.consultationId}));

    socket.on('join-error', (data) {
      if (!mounted) return;
      setState(() {
        _status = _CallStatus.error;
        _errorMessage = (data as Map)['message'] as String? ?? 'Could not join this call.';
      });
    });

    socket.on('ready', (data) async {
      if (!mounted) return;
      setState(() => _status = _CallStatus.waiting);
      final pc = await createPeer();
      _peer = pc;
      final shouldInitiate = (data as Map)['shouldInitiate'] as bool? ?? false;
      if (shouldInitiate) {
        final offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal', {
          'consultationId': widget.consultationId,
          'data': {'type': 'offer', 'sdp': {'sdp': offer.sdp, 'type': offer.type}},
        });
      }
    });

    socket.on('signal', (payload) async {
      final pc = _peer;
      if (pc == null) return;
      final data = (payload as Map)['data'] as Map;
      final type = data['type'] as String;
      if (type == 'offer') {
        final sdp = data['sdp'] as Map;
        await pc.setRemoteDescription(RTCSessionDescription(sdp['sdp'] as String, sdp['type'] as String));
        final answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', {
          'consultationId': widget.consultationId,
          'data': {'type': 'answer', 'sdp': {'sdp': answer.sdp, 'type': answer.type}},
        });
      } else if (type == 'answer') {
        final sdp = data['sdp'] as Map;
        await pc.setRemoteDescription(RTCSessionDescription(sdp['sdp'] as String, sdp['type'] as String));
      } else if (type == 'candidate') {
        final candidate = data['candidate'] as Map;
        try {
          await pc.addCandidate(RTCIceCandidate(
            candidate['candidate'] as String?,
            candidate['sdpMid'] as String?,
            candidate['sdpMLineIndex'] as int?,
          ));
        } catch (_) {
          // A candidate can arrive before setRemoteDescription finishes — safe to drop.
        }
      }
    });

    socket.on('blur-state', (data) {
      if (!mounted) return;
      setState(() => _remoteRevealed = (data as Map)['revealed'] as bool? ?? false);
    });

    socket.on('peer-left', (_) {
      if (!mounted) return;
      setState(() {
        _status = _CallStatus.ended;
        _errorMessage = 'The other participant left the call.';
      });
    });

    socket.connect();
  }

  void _toggleReveal() {
    setState(() => _revealed = !_revealed);
    _socket?.emit('blur-state', {'consultationId': widget.consultationId, 'revealed': _revealed});
  }

  @override
  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    _peer?.close();
    _localStream?.getTracks().forEach((t) => t.stop());
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Positioned.fill(
            child: ImageFiltered(
              imageFilter: _remoteRevealed ? ui.ImageFilter.blur(sigmaX: 0, sigmaY: 0) : ui.ImageFilter.blur(sigmaX: 24, sigmaY: 24),
              child: RTCVideoView(_remoteRenderer, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover),
            ),
          ),
          if (_status != _CallStatus.connected)
            Positioned.fill(
              child: Container(
                color: Colors.black38,
                alignment: Alignment.center,
                padding: const EdgeInsets.all(24),
                child: Text(
                  _status == _CallStatus.error || _status == _CallStatus.ended ? (_errorMessage ?? '') : 'Connecting…',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          Positioned(
            right: 16,
            bottom: 96,
            child: Container(
              width: 120,
              height: 90,
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white54, width: 2)),
              clipBehavior: Clip.antiAlias,
              child: RTCVideoView(_localRenderer, mirror: true, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton(
                  style: OutlinedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppTheme.ink),
                  onPressed: _toggleReveal,
                  child: Text(_revealed ? 'Blur my video' : 'Reveal my video'),
                ),
                const SizedBox(width: 12),
                ElevatedButton(onPressed: () => context.pop(), child: const Text('Leave call')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
