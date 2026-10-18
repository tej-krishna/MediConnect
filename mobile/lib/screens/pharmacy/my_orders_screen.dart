import 'package:flutter/material.dart';
import '../../app/app_theme.dart';
import '../../models/pharmacy.dart';
import '../../services/api_client.dart';
import '../../services/pharmacy_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';

const _cancellableStatuses = {'pending_prescription', 'placed', 'confirmed'};

const _statusColors = {
  'delivered': AppTheme.primary,
  'cancelled': AppTheme.emergency,
  'pending_prescription': AppTheme.warning,
};

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
                ? const LoadingView()
                : _orders!.isEmpty
                    ? const EmptyState(icon: Icons.local_shipping_outlined, message: "You haven't placed any medicine orders yet.")
                    : RefreshIndicator(
                        onRefresh: _load,
                        color: AppTheme.primary,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            if (_error != null) ...[ErrorBanner.fromException(_error!), const SizedBox(height: 12)],
                            for (final o in _orders!) ...[
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            width: 7,
                                            height: 7,
                                            decoration: BoxDecoration(color: _statusColors[o.status] ?? AppTheme.textMuted, shape: BoxShape.circle),
                                          ),
                                          const SizedBox(width: 6),
                                          Text(o.status.replaceAll('_', ' '), style: TextStyle(color: _statusColors[o.status] ?? AppTheme.textMuted, fontWeight: FontWeight.w700, fontSize: 13)),
                                          const Spacer(),
                                          Text('₹${o.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(o.items.map((i) => '${i.name} × ${i.quantity}').join(', '), style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                                      if (_cancellableStatuses.contains(o.status)) ...[
                                        const SizedBox(height: 6),
                                        Align(
                                          alignment: Alignment.centerRight,
                                          child: TextButton(onPressed: () => _cancel(o.id), child: const Text('Cancel')),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),
                            ],
                          ],
                        ),
                      ),
      ),
    );
  }
}
