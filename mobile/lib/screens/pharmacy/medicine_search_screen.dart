import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/app_theme.dart';
import '../../models/pharmacy.dart';
import '../../services/api_client.dart';
import '../../services/pharmacy_service.dart';
import '../../widgets/app_bottom_nav_shell.dart';
import '../../widgets/empty_state.dart';
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
    return AppBottomNavShell(
      currentIndex: 1,
      appBar: AppBar(
        title: const Text('Pharmacy'),
        actions: [IconButton(onPressed: () => context.push('/orders'), icon: const Icon(Icons.local_shipping_outlined), tooltip: 'My orders')],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              decoration: BoxDecoration(color: AppTheme.surfaceMuted, borderRadius: BorderRadius.circular(14)),
              child: Row(
                children: [
                  const SizedBox(width: 14),
                  const Icon(Icons.search, color: AppTheme.textFaint),
                  Expanded(
                    child: TextField(
                      controller: _queryController,
                      decoration: const InputDecoration(hintText: 'Medicine or generic name', border: InputBorder.none, filled: false),
                      onSubmitted: (_) => _search(),
                    ),
                  ),
                  TextButton(onPressed: _loading ? null : _search, child: Text(_loading ? '...' : 'Search')),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (_error != null) ErrorBanner.fromException(_error!, onRetry: _search),
            Expanded(
              child: _loading
                  ? const LoadingView()
                  : _results == null
                      ? const EmptyState(icon: Icons.medication_outlined, message: 'Search for a medicine by name to see pharmacies with it in stock.')
                      : _results!.isEmpty
                          ? const EmptyState(icon: Icons.inbox_outlined, message: 'No matching medicines found in stock right now.')
                          : ListView.separated(
                              itemCount: _results!.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 10),
                              itemBuilder: (context, index) {
                                final m = _results![index];
                                return Card(
                                  child: ListTile(
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                    leading: const CircleAvatar(backgroundColor: AppTheme.primaryLight, child: Icon(Icons.medication_outlined, color: AppTheme.primaryDark)),
                                    title: Text(m.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                    subtitle: Text('${m.genericName} · ${m.strength} · ${m.dosageForm}\n₹${m.unitPrice.toStringAsFixed(0)}${m.requiresPrescription ? ' · Rx required' : ''}'),
                                    isThreeLine: true,
                                    trailing: FilledButton(
                                      style: FilledButton.styleFrom(backgroundColor: AppTheme.primary),
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
    );
  }
}
