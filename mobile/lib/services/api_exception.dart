/// Mirrors the website's `ApiError` (frontend/src/services/apiClient.ts) so error handling reads
/// the same way across both clients of the same backend: a status code, the backend's own error
/// code, and a human-readable message. `isNetworkError` is mobile-specific — a phone genuinely
/// loses connectivity in a way a browser tab usually doesn't, so screens need to tell "the server
/// rejected this" apart from "the request never reached the server at all" to show the right retry
/// affordance (see 14.3's offline/retry/network-error handling).
class ApiException implements Exception {
  final int statusCode;
  final String code;
  final String message;
  final bool isNetworkError;

  const ApiException({
    required this.statusCode,
    required this.code,
    required this.message,
    this.isNetworkError = false,
  });

  factory ApiException.network(String message) =>
      ApiException(statusCode: 0, code: 'NETWORK_ERROR', message: message, isNetworkError: true);

  @override
  String toString() => message;
}
