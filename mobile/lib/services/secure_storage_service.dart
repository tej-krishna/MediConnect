import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// The one place the refresh token touches disk. Backed by iOS Keychain / Android Keystore on
/// those platforms (hardware-backed where available); on web (used here only for development
/// verification in Chrome, never a production target) flutter_secure_storage falls back to
/// WebCrypto-wrapped localStorage, which is weaker but is not where this app's real security
/// boundary lives. Mirrors the website's own rule for the *access* token (memory only, never
/// persisted) by never storing anything here except the refresh token — see AuthProvider.
class SecureStorageService {
  SecureStorageService._();
  static final SecureStorageService instance = SecureStorageService._();

  static const _refreshTokenKey = 'mediconnect_refresh_token';
  final _storage = const FlutterSecureStorage();

  Future<void> saveRefreshToken(String token) => _storage.write(key: _refreshTokenKey, value: token);

  Future<String?> readRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> clearRefreshToken() => _storage.delete(key: _refreshTokenKey);
}
