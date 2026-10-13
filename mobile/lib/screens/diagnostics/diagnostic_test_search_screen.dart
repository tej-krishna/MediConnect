import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/diagnostics.dart';
import '../../services/api_client.dart';
import '../../services/diagnostics_service.dart';
import '../../widgets/error_banner.dart';

class DiagnosticTestSearchScreen extends StatefulWidget {
  const DiagnosticTestSearchScreen({super.key});

  @override
  State<DiagnosticTestSearchScreen> createState() => _DiagnosticTestSearchScreenState();
}

class _DiagnosticTestSearchScreenState extends State<DiagnosticTestSearchScreen> {
  final _service = DiagnosticsService(ApiClient.instance);
  final _queryController = TextEditingController();
  List<DiagnosticTest>? _results;
  bool _loading = false;
  Object? _error;

  @override
  void dispose() {
    _queryController.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    if (_queryController.text.trim().isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await _service.searchTests(_queryController.text.trim());
      if (!mounted) return;
      setState(() => _results = results);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Diagnostic Tests')),
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
                      controller: _queryController,
                      decoration: const InputDecoration(labelText: 'Test name'),
                      onSubmitted: (_) => _search(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(onPressed: _loading ? null : _search, child: const Text('Search')),
                ],
              ),
              const SizedBox(height: 12),
              if (_error != null) ErrorBanner.fromException(_error!, onRetry: _search),
              Expanded(
                child: _results == null
                    ? const SizedBox.shrink()
                    : _results!.isEmpty
                        ? const Center(child: Text('No matching tests found.'))
                        : ListView.separated(
                            itemCount: _results!.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final t = _results![index];
                              return Card(
                                child: ListTile(
                                  title: Text(t.name),
                                  subtitle: Text('${t.category} · ₹${t.price.toStringAsFixed(0)} · ${t.turnaroundHours}h'
                                      '${t.homeCollectionAvailable ? ' · home collection available' : ''}'),
                                  isThreeLine: true,
                                  trailing: ElevatedButton(
                                    onPressed: () => context.push('/diagnostic-tests/${t.id}/order'),
                                    child: const Text('Book'),
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
