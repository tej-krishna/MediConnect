import 'package:flutter/material.dart';

/// Mirrors the website's GoogleAuthButton.tsx: same "G" mark, same "Continue with Google" copy,
/// an outlined button rather than filled so it doesn't compete visually with the primary
/// email/password submit button above it.
class GoogleSignInButton extends StatelessWidget {
  const GoogleSignInButton({super.key, required this.onPressed, this.loading = false});

  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: loading ? null : onPressed,
      icon: const Icon(Icons.g_mobiledata, size: 28),
      label: Text(loading ? 'Opening Google sign-in…' : 'Continue with Google'),
    );
  }
}
