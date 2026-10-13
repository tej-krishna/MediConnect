import 'package:flutter/material.dart';
import '../../models/diagnostics.dart';
import '../../services/api_client.dart';
import '../../services/diagnostics_service.dart';
import '../../widgets/error_banner.dart';

const _cancellableStatuses = {'requested', 'scheduled'};

class MyDiagnosticOrdersScreen extends StatefulWidget {
  const MyDiagnosticOrdersScreen({super.key});

  @override
  State<MyDiagnosticOrdersScreen> createState() => _MyDiagnosticOrdersScreenState();
}

class _MyDiagnosticOrdersScreenState extends State<MyDiagnosticOrdersScreen> {
  final _service = DiagnosticsService(ApiClient.instance);
  List<DiagnosticOrder>? _orders;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final orders = await _service.listMyOrders();
      if (!mounted) return;
      setState(() => _orders = orders);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _cancel(String id) async {
    try {
      await _service.cancelOrder(id);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Diagnostic Orders')),
      body: SafeArea(
        child: _error != null && _orders == null
            ? Padding(padding: const EdgeInsets.all(16), child: ErrorBanner.fromException(_error!, onRetry: _load))
            : _orders == null
                ? const Center(child: CircularProgressIndicator())
                : _orders!.isEmpty
                    ? const Center(child: Text("You haven't booked any diagnostic tests yet."))
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_error != null) ErrorBanner.fromException(_error!),
                          ..._orders!.map((o) => Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(o.tests.map((t) => t.name).join(', '), style: const TextStyle(fontWeight: FontWeight.bold)),
                                      const SizedBox(height: 4),
                                      Text('${o.collectionMethod == 'home_collection' ? 'Home' : 'At lab'} · ${o.status.replaceAll('_', ' ')}'),
                                      Text('Total: ₹${o.totalAmount.toStringAsFixed(0)}'),
                                      if (o.hasReport) const Text('Report ready', style: TextStyle(color: Colors.green)),
                                      if (_cancellableStatuses.contains(o.status))
                                        Align(
                                          alignment: Alignment.centerRight,
                                          child: TextButton(onPressed: () => _cancel(o.id), child: const Text('Cancel')),
                                        ),
                                    ],
                                  ),
                                ),
                              )),
                        ],
                      ),
      ),
    );
  }
}
