import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../app/auth_provider.dart';
import '../../models/diagnostics.dart';
import '../../services/api_client.dart';
import '../../services/diagnostics_service.dart';
import '../../widgets/error_banner.dart';

class HealthCampSearchScreen extends StatefulWidget {
  const HealthCampSearchScreen({super.key});

  @override
  State<HealthCampSearchScreen> createState() => _HealthCampSearchScreenState();
}

class _HealthCampSearchScreenState extends State<HealthCampSearchScreen> {
  final _service = DiagnosticsService(ApiClient.instance);
  final _cityController = TextEditingController();
  List<HealthCamp>? _results;
  bool _loading = false;
  Object? _error;
  String? _message;

  @override
  void dispose() {
    _cityController.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await _service.searchCamps(city: _cityController.text.trim());
      if (!mounted) return;
      setState(() => _results = results);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _register(HealthCamp camp) async {
    if (!context.read<AuthProvider>().isAuthenticated) {
      context.push('/login');
      return;
    }
    try {
      await _service.registerForCamp(camp.id);
      if (!mounted) return;
      setState(() => _message = 'Registered for ${camp.title}. See My Camp Registrations.');
      await _search();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Health Camps')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _cityController,
                      decoration: const InputDecoration(labelText: 'City'),
                      onSubmitted: (_) => _search(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(onPressed: _loading ? null : _search, child: const Text('Search')),
                ],
              ),
              const SizedBox(height: 12),
              if (_message != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                  child: Text(_message!, style: TextStyle(color: Colors.green.shade900)),
                ),
              if (_error != null) ErrorBanner.fromException(_error!, onRetry: _search),
              Expanded(
                child: _results == null
                    ? const SizedBox.shrink()
                    : _results!.isEmpty
                        ? const Center(child: Text('No camps found.'))
                        : ListView.separated(
                            itemCount: _results!.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final c = _results![index];
                              return Card(
                                child: ListTile(
                                  title: Text(c.title),
                                  subtitle: Text('${c.locationDescription}\n${c.scheduledDate} · ${c.remaining}/${c.capacity} spots left'),
                                  isThreeLine: true,
                                  trailing: ElevatedButton(
                                    onPressed: c.remaining > 0 ? () => _register(c) : null,
                                    child: const Text('Register'),
                                  ),
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
