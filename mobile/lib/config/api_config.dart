import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform, kIsWeb;

/// The backend's base URL defaults per-platform the same way the web frontend's Vite dev
/// server assumes a backend on localhost:5000 — except an Android emulator's "localhost" is its
/// own virtual device, not the host machine, so it has to reach the host through the special
/// alias 10.0.2.2 instead. iOS simulators and web (Chrome) both share the host's localhost
/// directly, same as any native app would in production once API_BASE_URL is overridden via
/// --dart-define for a real deployed backend. Uses `defaultTargetPlatform` (not `dart:io`'s
/// `Platform`, which doesn't compile for web) so this file works unmodified on every target.
String get _defaultBaseUrl {
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    return 'http://10.0.2.2:5000/api/v1';
  }
  return 'http://localhost:5000/api/v1';
}

class ApiConfig {
  static const String _override = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl => _override.isNotEmpty ? _override : _defaultBaseUrl;
}
