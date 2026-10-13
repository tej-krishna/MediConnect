import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/pharmacy.dart';
import '../../services/api_client.dart';
import '../../services/pharmacy_service.dart';
import '../../widgets/error_banner.dart';

class MedicineSearchScreen extends StatefulWidget {
  const MedicineSearchScreen({super.key});

  @override
  State<MedicineSearchScreen> createState() => _MedicineSearchScreenState();
}

class _MedicineSearchScreenState extends State<MedicineSearchScreen> {
  final _service = PharmacyService(ApiClient.instance);
  final _queryController = TextEditingController();
  List<Medicine>? _results;
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
      final results = await _service.search(_queryController.text.trim());
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
      appBar: AppBar(title: const Text('Medicines')),
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
                      decoration: const InputDecoration(labelText: 'Medicine or generic name'),
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
                        ? const Center(child: Text('No matching medicines found in stock right now.'))
                        : ListView.separated(
                            itemCount: _results!.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final m = _results![index];
                              return Card(
                                child: ListTile(
                                  title: Text(m.name),
                                  subtitle: Text('${m.genericName} · ${m.strength} · ${m.dosageForm}\n₹${m.unitPrice.toStringAsFixed(0)}${m.requiresPrescription ? ' · Rx required' : ''}'),
                                  isThreeLine: true,
                                  trailing: ElevatedButton(
                                    onPressed: () => context.push('/medicines/${m.id}/order'),
                                    child: const Text('Order'),
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
