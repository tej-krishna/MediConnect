import 'package:flutter/material.dart';
import '../services/api_exception.dart';

/// Shared across every screen so a failed request looks and behaves the same everywhere,
/// matching the website's `.alert.alert-error` convention. Distinguishes a network failure (no
/// connection reached the server at all) from a server-rejected request, since only the former
/// makes "Retry" the obviously right action — the message already says so, but the explicit
/// onRetry affordance is what Phase 14.3 asks for under "offline/retry/network-error handling".
class ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorBanner({super.key, required this.message, this.onRetry});

  factory ErrorBanner.fromException(Object error, {VoidCallback? onRetry}) {
    final message = error is ApiException ? error.message : 'Something went wrong.';
    return ErrorBanner(message: message, onRetry: onRetry);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        border: Border.all(color: Colors.red.shade200),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: TextStyle(color: Colors.red.shade900))),
          if (onRetry != null)
            TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
