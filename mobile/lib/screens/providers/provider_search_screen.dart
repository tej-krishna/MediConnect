import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/provider.dart';
import '../../services/api_client.dart';
import '../../services/provider_service.dart';
import '../../widgets/error_banner.dart';

class ProviderSearchScreen extends StatefulWidget {
  const ProviderSearchScreen({super.key});

  @override
  State<ProviderSearchScreen> createState() => _ProviderSearchScreenState();
}

class _ProviderSearchScreenState extends State<ProviderSearchScreen> {
  final _service = ProviderService(ApiClient.instance);
  final _cityController = TextEditingController();
  String? _providerType;
  List<PublicProvider>? _results;
  bool _loading = false;
  Object? _error;

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
      final results = await _service.search(
        city: _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        providerType: _providerType,
      );
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
      appBar: AppBar(title: const Text('Find Care')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _cityController,
                decoration: const InputDecoration(labelText: 'City'),
                onSubmitted: (_) => _search(),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _providerType,
                decoration: const InputDecoration(labelText: 'Provider type (any)'),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Any type')),
                  ...providerTypeLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))),
                ],
                onChanged: (v) => setState(() => _providerType = v),
              ),
              const SizedBox(height: 12),
              ElevatedButton(onPressed: _loading ? null : _search, child: Text(_loading ? 'Searching…' : 'Search')),
              const SizedBox(height: 12),
              if (_error != null) ErrorBanner.fromException(_error!, onRetry: _search),
              Expanded(
                child: _results == null
                    ? const SizedBox.shrink()
                    : _results!.isEmpty
                        ? const Center(child: Text('No matching providers found.'))
                        : ListView.separated(
                            itemCount: _results!.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final p = _results![index];
                              return Card(
                                child: ListTile(
                                  title: Text(p.organizationName),
                                  subtitle: Text('${providerTypeLabels[p.providerType] ?? p.providerType} · ${p.address.city}'),
                                  trailing: p.consultationFee != null ? Text('₹${p.consultationFee!.toStringAsFixed(0)}') : null,
                                  onTap: () => context.push('/providers/${p.id}'),
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
