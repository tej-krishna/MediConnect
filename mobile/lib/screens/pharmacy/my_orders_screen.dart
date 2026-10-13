import 'package:flutter/material.dart';
import '../../models/pharmacy.dart';
import '../../services/api_client.dart';
import '../../services/pharmacy_service.dart';
import '../../widgets/error_banner.dart';

const _cancellableStatuses = {'pending_prescription', 'placed', 'confirmed'};

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  final _service = PharmacyService(ApiClient.instance);
  List<MedicineOrder>? _orders;
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
      await _service.transitionOrder(id, 'cancel');
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Orders')),
      body: SafeArea(
        child: _error != null && _orders == null
            ? Padding(padding: const EdgeInsets.all(16), child: ErrorBanner.fromException(_error!, onRetry: _load))
            : _orders == null
                ? const Center(child: CircularProgressIndicator())
                : _orders!.isEmpty
                    ? const Center(child: Text("You haven't placed any medicine orders yet."))
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
                                      Text('Order — ${o.status.replaceAll('_', ' ')}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                      const SizedBox(height: 4),
                                      ...o.items.map((i) => Text('${i.name} × ${i.quantity}')),
                                      const SizedBox(height: 4),
                                      Text('Total: ₹${o.totalAmount.toStringAsFixed(0)}'),
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
