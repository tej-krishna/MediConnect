import 'dart:async';
import 'package:dio/dio.dart';
import '../config/api_config.dart';
import 'api_exception.dart';
import 'secure_storage_service.dart';

/// A parsed `{success: true, data: ..., meta?: ...}` response body.
class ApiResult<T> {
  final T data;
  final Map<String, dynamic>? meta;
  const ApiResult(this.data, this.meta);
}

/// The single Dio instance every service in this app shares, mirroring the website's single
/// `apiClient.ts` module. Two responsibilities live here that every other service gets for free
/// by going through it: attaching the access token (and the `X-Client-Platform: mobile` header
/// the backend's Phase 13 mobile-auth contract reads — see README.md "Mobile vs. web
/// authentication"), and transparently refreshing an expired access token once before giving up,
/// the mobile equivalent of the website's `tryRefresh()` retry-once pattern. Concurrent requests
/// that all hit a 401 at once share a single in-flight refresh via `_refreshCompleter` rather than
/// each independently calling /auth/refresh — only one rotation should ever happen per expiry.
class ApiClient {
  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'X-Client-Platform': 'mobile'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_accessToken != null && !_isAuthEndpoint(options.path)) {
          options.headers['Authorization'] = 'Bearer $_accessToken';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final isUnauthorized = error.response?.statusCode == 401;
        final alreadyRetried = error.requestOptions.extra['retried'] == true;
        if (isUnauthorized && !alreadyRetried && onUnauthorized != null && !_isAuthEndpoint(error.requestOptions.path)) {
          final refreshed = await _refreshOnce();
          if (refreshed) {
            try {
              final retryOptions = error.requestOptions;
              retryOptions.extra['retried'] = true;
              if (_accessToken != null) {
                retryOptions.headers['Authorization'] = 'Bearer $_accessToken';
              }
              final response = await _dio.fetch(retryOptions);
              handler.resolve(response);
              return;
            } on DioException catch (retryError) {
              handler.next(retryError);
              return;
            }
          }
        }
        handler.next(error);
      },
    ));
  }

  static final ApiClient instance = ApiClient._internal();

  late final Dio _dio;
  String? _accessToken;
  Completer<bool>? _refreshCompleter;

  /// Set by AuthProvider at startup. Called when a 401 can't be resolved by a refresh — the
  /// session is genuinely over (refresh token expired/revoked/reused), so the app should return
  /// to the login screen rather than keep retrying.
  FutureOr<void> Function()? onUnauthorized;

  /// Also set by AuthProvider: performs the actual `/auth/refresh` call and updates both this
  /// client's in-memory access token and the securely-stored refresh token. Kept out of this file
  /// to avoid a circular dependency (AuthService needs ApiClient; ApiClient must not need
  /// AuthService back) — ApiClient only knows "something refreshes the token," not how.
  Future<bool> Function()? onRefreshNeeded;

  void setAccessToken(String? token) => _accessToken = token;

  /// Read by VideoCallScreen to authenticate the Socket.IO signaling handshake the same way every
  /// HTTP request already authenticates (see the `onRequest` interceptor above).
  String? get accessToken => _accessToken;

  bool _isAuthEndpoint(String path) =>
      path.contains('/auth/login') || path.contains('/auth/register') || path.contains('/auth/refresh');

  Future<bool> _refreshOnce() async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }
    final completer = Completer<bool>();
    _refreshCompleter = completer;
    try {
      final refreshFn = onRefreshNeeded;
      final success = refreshFn != null && await refreshFn();
      completer.complete(success);
      if (!success) {
        await onUnauthorized?.call();
      }
      return success;
    } catch (_) {
      completer.complete(false);
      await onUnauthorized?.call();
      return false;
    } finally {
      _refreshCompleter = null;
    }
  }

  ApiException _toApiException(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.connectionError) {
      return ApiException.network('Could not reach the server. Check your connection and try again.');
    }
    final body = error.response?.data;
    if (body is Map && body['success'] == false && body['error'] is Map) {
      final errorBody = body['error'] as Map;
      return ApiException(
        statusCode: error.response?.statusCode ?? 0,
        code: (errorBody['code'] as String?) ?? 'UNKNOWN_ERROR',
        message: (errorBody['message'] as String?) ?? 'Something went wrong.',
      );
    }
    return ApiException(
      statusCode: error.response?.statusCode ?? 0,
      code: 'UNKNOWN_ERROR',
      message: 'Request failed (${error.response?.statusCode ?? 'network error'}).',
    );
  }

  Future<ApiResult<T>> _unwrap<T>(Future<Response<dynamic>> Function() request) async {
    try {
      final response = await request();
      final body = response.data as Map<String, dynamic>;
      return ApiResult<T>(body['data'] as T, body['meta'] as Map<String, dynamic>?);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<ApiResult<T>> get<T>(String path, {Map<String, dynamic>? query}) =>
      _unwrap<T>(() => _dio.get(path, queryParameters: query));

  Future<ApiResult<T>> post<T>(String path, {Object? body}) => _unwrap<T>(() => _dio.post(path, data: body));

  Future<ApiResult<T>> patch<T>(String path, {Object? body}) => _unwrap<T>(() => _dio.patch(path, data: body));

  Future<ApiResult<T>> delete<T>(String path) => _unwrap<T>(() => _dio.delete(path));

  Future<ApiResult<T>> postForm<T>(String path, FormData form) => _unwrap<T>(() => _dio.post(path, data: form));

  Future<void> clearSession() async {
    _accessToken = null;
    await SecureStorageService.instance.clearRefreshToken();
  }
}
