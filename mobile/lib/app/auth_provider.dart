import 'package:flutter/foundation.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import '../config/api_config.dart';
import '../models/user.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/secure_storage_service.dart';

const _mobileOAuthScheme = 'mediconnect';

enum AuthStatus { unknown, authenticated, unauthenticated }

/// The mobile equivalent of the website's AuthContext.tsx: the access token lives only in memory
/// here (inside ApiClient, never in this class's own state, and never persisted) exactly like the
/// website keeps it in a JS variable, never localStorage — the rationale is identical (a token
/// written to any kind of disk storage is a bigger attack surface than one that evaporates when
/// the process dies). The refresh token is the one piece of session state this app persists at
/// all, and it goes through SecureStorageService exclusively.
///
/// Wires itself into ApiClient's refresh hooks at construction so every service that shares the
/// same ApiClient instance gets transparent 401-triggered token refresh for free, the same way
/// every fetch through the website's apiClient.ts does via its own tryRefresh().
class AuthProvider extends ChangeNotifier {
  AuthProvider() : _authService = AuthService(ApiClient.instance) {
    ApiClient.instance.onRefreshNeeded = _silentRefresh;
    ApiClient.instance.onUnauthorized = _forceLogout;
  }

  final AuthService _authService;

  User? _user;
  AuthStatus _status = AuthStatus.unknown;
  String? _lastError;

  User? get user => _user;
  AuthStatus get status => _status;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  String? get lastError => _lastError;

  /// Call once at app startup. Mirrors AuthContext.tsx's restoreSession(): try a silent refresh
  /// from whatever's in secure storage, and treat failure (no token, expired, revoked) as simply
  /// "not logged in" rather than an error to surface.
  Future<void> init() async {
    final restored = await _silentRefresh();
    _status = restored ? AuthStatus.authenticated : AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> _silentRefresh() async {
    final result = await _authService.refresh();
    if (result == null) {
      await SecureStorageService.instance.clearRefreshToken();
      ApiClient.instance.setAccessToken(null);
      return false;
    }
    _user = result.user;
    ApiClient.instance.setAccessToken(result.accessToken);
    await SecureStorageService.instance.saveRefreshToken(result.refreshToken);
    return true;
  }

  Future<void> _forceLogout() async {
    _user = null;
    _status = AuthStatus.unauthenticated;
    await ApiClient.instance.clearSession();
    notifyListeners();
  }

  Future<bool> login({required String email, required String password}) async {
    _lastError = null;
    try {
      final result = await _authService.login(email: email, password: password);
      _user = result.user;
      ApiClient.instance.setAccessToken(result.accessToken);
      await SecureStorageService.instance.saveRefreshToken(result.refreshToken);
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _lastError = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    _lastError = null;
    try {
      await _authService.register(email: email, password: password, fullName: fullName, phone: phone);
      return true;
    } catch (e) {
      _lastError = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Opens the backend's /auth/google in an external browser tab (Chrome Custom Tabs on Android)
  /// via flutter_web_auth_2, which captures the mediconnect://auth/callback redirect the backend
  /// sends once Google sign-in completes — the same role Chrome's own page-reload-and-cookie-pickup
  /// plays for the website, just carried over an explicit deep link since a native app has no
  /// cookie jar for the backend to drop a session into directly (see README's mobile-vs-web
  /// authentication section).
  Future<bool> loginWithGoogle() async {
    _lastError = null;
    try {
      final authUrl = '${ApiConfig.baseUrl}/auth/google?platform=mobile';
      final result = await FlutterWebAuth2.authenticate(url: authUrl, callbackUrlScheme: _mobileOAuthScheme);
      final uri = Uri.parse(result);

      final error = uri.queryParameters['error'];
      if (error != null) {
        _lastError = error;
        notifyListeners();
        return false;
      }

      final accessToken = uri.queryParameters['accessToken'];
      final refreshToken = uri.queryParameters['refreshToken'];
      if (accessToken == null || refreshToken == null) {
        _lastError = 'Google sign-in did not return a session';
        notifyListeners();
        return false;
      }

      ApiClient.instance.setAccessToken(accessToken);
      final user = await _authService.me();
      await SecureStorageService.instance.saveRefreshToken(refreshToken);
      _user = user;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _lastError = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _status = AuthStatus.unauthenticated;
    await ApiClient.instance.clearSession();
    notifyListeners();
  }

  Future<bool> forgotPassword(String email) async {
    try {
      await _authService.forgotPassword(email);
      return true;
    } catch (e) {
      _lastError = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> resetPassword({required String token, required String newPassword}) async {
    try {
      await _authService.resetPassword(token: token, newPassword: newPassword);
      return true;
    } catch (e) {
      _lastError = e.toString();
      notifyListeners();
      return false;
    }
  }
}
