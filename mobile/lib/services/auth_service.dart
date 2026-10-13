import '../models/user.dart';
import 'api_client.dart';
import 'secure_storage_service.dart';

class LoginResult {
  final User user;
  final String accessToken;
  final String refreshToken;
  const LoginResult(this.user, this.accessToken, this.refreshToken);
}

/// Talks to the same /auth/* endpoints the website does, but through the mobile contract
/// documented in the backend's README (`X-Client-Platform: mobile`, which ApiClient already sets
/// on every request): login and refresh responses include the raw refresh token in the JSON body,
/// which this app is responsible for storing in SecureStorageService and never anywhere else.
class AuthService {
  AuthService(this._client);
  final ApiClient _client;

  Future<User> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    final result = await _client.post<Map<String, dynamic>>('/auth/register', body: {
      'email': email,
      'password': password,
      'fullName': fullName,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
    });
    return User.fromJson(result.data['user'] as Map<String, dynamic>);
  }

  Future<LoginResult> login({required String email, required String password}) async {
    final result = await _client.post<Map<String, dynamic>>('/auth/login', body: {
      'email': email,
      'password': password,
    });
    return LoginResult(
      User.fromJson(result.data['user'] as Map<String, dynamic>),
      result.data['accessToken'] as String,
      result.data['refreshToken'] as String,
    );
  }

  /// Returns null if there's no stored refresh token or it's no longer valid (expired, revoked,
  /// or reused) — the caller (AuthProvider) treats either case the same way: no active session.
  Future<LoginResult?> refresh() async {
    final storedToken = await SecureStorageService.instance.readRefreshToken();
    if (storedToken == null) return null;
    try {
      final result = await _client.post<Map<String, dynamic>>('/auth/refresh', body: {
        'refreshToken': storedToken,
      });
      return LoginResult(
        User.fromJson(result.data['user'] as Map<String, dynamic>),
        result.data['accessToken'] as String,
        result.data['refreshToken'] as String,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    final storedToken = await SecureStorageService.instance.readRefreshToken();
    try {
      await _client.post<Map<String, dynamic>>('/auth/logout', body: {
        'refreshToken': ?storedToken,
      });
    } catch (_) {
      // Logout is best-effort server-side (revoking a token that's already invalid is harmless);
      // the client-side session is cleared by the caller regardless of whether this call succeeds.
    }
  }

  Future<void> forgotPassword(String email) async {
    await _client.post<Map<String, dynamic>>('/auth/forgot-password', body: {'email': email});
  }

  Future<void> resetPassword({required String token, required String newPassword}) async {
    await _client.post<Map<String, dynamic>>('/auth/reset-password', body: {
      'token': token,
      'newPassword': newPassword,
    });
  }

  Future<User> me() async {
    final result = await _client.get<Map<String, dynamic>>('/auth/me');
    return User.fromJson(result.data['user'] as Map<String, dynamic>);
  }
}
