import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../app/auth_provider.dart';
import '../../models/provider.dart';
import '../../models/scheduling.dart';
import '../../services/api_client.dart';
import '../../services/provider_service.dart';
import '../../services/scheduling_service.dart';
import '../../widgets/error_banner.dart';

const _schedulingTypes = {'doctor', 'hospital', 'clinic'};

class ProviderDetailScreen extends StatefulWidget {
  const ProviderDetailScreen({super.key, required this.providerId});
  final String providerId;

  @override
  State<ProviderDetailScreen> createState() => _ProviderDetailScreenState();
}

class _ProviderDetailScreenState extends State<ProviderDetailScreen> {
  final _providerService = ProviderService(ApiClient.instance);
  final _schedulingService = SchedulingService(ApiClient.instance);
  PublicProvider? _provider;
  List<Slot>? _slots;
  Object? _error;
  String? _bookingSlotId;
  String? _message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final provider = await _providerService.getById(widget.providerId);
      List<Slot>? slots;
      if (_schedulingTypes.contains(provider.providerType)) {
        slots = await _schedulingService.listAvailableSlots(widget.providerId);
      }
      if (!mounted) return;
      setState(() {
        _provider = provider;
        _slots = slots;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _book(Slot slot) async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      context.push('/login');
      return;
    }
    setState(() {
      _bookingSlotId = slot.id;
      _message = null;
    });
    try {
      await _schedulingService.bookAppointment(slot.id);
      if (!mounted) return;
      setState(() => _message = 'Appointment booked. See it under My Appointments.');
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _bookingSlotId = null);
    }
  }

  Future<void> _call(String phone) async {
    await launchUrl(Uri(scheme: 'tel', path: phone));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_provider?.organizationName ?? 'Provider')),
      body: SafeArea(
        child: _error != null && _provider == null
            ? Padding(padding: const EdgeInsets.all(16), child: ErrorBanner.fromException(_error!, onRetry: _load))
            : _provider == null
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_error != null) ErrorBanner.fromException(_error!),
                      if (_message != null)
                        Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                          child: Text(_message!, style: TextStyle(color: Colors.green.shade900)),
                        ),
                      Text(providerTypeLabels[_provider!.providerType] ?? _provider!.providerType),
                      const SizedBox(height: 8),
                      Text(_provider!.address.toString()),
                      if (_provider!.consultationFee != null) ...[
                        const SizedBox(height: 8),
                        Text('Consultation fee: ₹${_provider!.consultationFee!.toStringAsFixed(0)}'),
                      ],
                      if (_provider!.operatingHoursNote != null) ...[
                        const SizedBox(height: 8),
                        Text(_provider!.operatingHoursNote!),
                      ],
                      if (_provider!.isCurrentlyAvailable != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          _provider!.isCurrentlyAvailable! ? 'Currently available' : 'Not currently available',
                          style: TextStyle(
                            color: _provider!.isCurrentlyAvailable! ? Colors.green : Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          ElevatedButton.icon(
                            onPressed: () => _call(_provider!.contactPhone),
                            icon: const Icon(Icons.call),
                            label: const Text('Call'),
                          ),
                        ],
                      ),
                      if (_slots != null) ...[
                        const Divider(height: 32),
                        Text('Available slots', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        if (_slots!.isEmpty) const Text('No open slots right now.'),
                        ..._slots!.map((slot) => Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                title: Text(slot.startTime),
                                subtitle: Text('${slot.remaining} of ${slot.capacity} spots left'),
                                trailing: ElevatedButton(
                                  onPressed: _bookingSlotId == slot.id ? null : () => _book(slot),
                                  child: Text(_bookingSlotId == slot.id ? 'Booking…' : 'Book'),
                                ),
                              ),
                            )),
                      ],
                    ],
                  ),
      ),
    );
  }
}
