import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../app/auth_provider.dart';
import '../../widgets/error_banner.dart';

/// Password-reset email delivery isn't configured anywhere in this project (see the backend's
/// NotificationService — it only logs); the website's own reset page reads the token from a URL
/// query param a real email link would carry. Without deep-linking built for this app yet, the
/// token is entered manually here — an honest reflection of what actually exists, not a
/// deep-link flow this phase didn't build.
class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _tokenController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _submitting = false;
  bool _success = false;
  String? _error;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    final auth = context.read<AuthProvider>();
    final ok = await auth.resetPassword(token: _tokenController.text.trim(), newPassword: _passwordController.text);
    if (!mounted) return;
    setState(() {
      _submitting = false;
      if (ok) {
        _success = true;
      } else {
        _error = auth.lastError ?? 'Invalid or expired reset token.';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: _success
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle, color: Colors.green, size: 48),
                        const SizedBox(height: 12),
                        const Text('Password updated. You can log in now.', textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: () => context.go('/login'), child: const Text('Go to login')),
                      ],
                    )
                  : Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (_error != null) ErrorBanner(message: _error!),
                          TextFormField(
                            controller: _tokenController,
                            decoration: const InputDecoration(labelText: 'Reset token'),
                            validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: true,
                            decoration: const InputDecoration(labelText: 'New password'),
                            validator: (v) => (v == null || v.length < 8) ? 'At least 8 characters' : null,
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _submitting ? null : _submit,
                            child: Text(_submitting ? 'Updating…' : 'Update password'),
                          ),
                        ],
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
