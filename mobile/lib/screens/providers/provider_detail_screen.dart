import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../app/app_theme.dart';
import '../../app/auth_provider.dart';
import '../../models/provider.dart';
import '../../models/scheduling.dart';
import '../../services/api_client.dart';
import '../../services/provider_service.dart';
import '../../services/scheduling_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/initials_avatar.dart';

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
    final provider = _provider;
    return Scaffold(
      appBar: AppBar(title: Text(provider?.organizationName ?? 'Provider')),
      body: SafeArea(
        child: _error != null && provider == null
            ? Padding(padding: const EdgeInsets.all(16), child: ErrorBanner.fromException(_error!, onRetry: _load))
            : provider == null
                ? const LoadingView()
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_error != null) ...[ErrorBanner.fromException(_error!), const SizedBox(height: 12)],
                      if (_message != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: AppTheme.primaryLight, borderRadius: BorderRadius.circular(12)),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle, color: AppTheme.primaryDark, size: 20),
                              const SizedBox(width: 8),
                              Expanded(child: Text(_message!, style: const TextStyle(color: AppTheme.primaryDark, fontWeight: FontWeight.w600))),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      Row(
                        children: [
                          InitialsAvatar(name: provider.organizationName, icon: providerTypeIcons[provider.providerType], radius: 30),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(provider.organizationName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                                const SizedBox(height: 2),
                                Text(
                                  [providerTypeLabels[provider.providerType] ?? provider.providerType, if (provider.specialization != null) provider.specialization!].join(' · '),
                                  style: const TextStyle(color: AppTheme.textMuted),
                                ),
                                if (provider.isCurrentlyAvailable != null) ...[
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Container(width: 7, height: 7, decoration: BoxDecoration(color: provider.isCurrentlyAvailable! ? AppTheme.primary : AppTheme.emergency, shape: BoxShape.circle)),
                                      const SizedBox(width: 6),
                                      Text(
                                        provider.isCurrentlyAvailable! ? 'Currently available' : 'Not currently available',
                                        style: TextStyle(color: provider.isCurrentlyAvailable! ? AppTheme.primaryDark : AppTheme.emergency, fontWeight: FontWeight.w600, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _DetailRow(icon: Icons.location_on_outlined, text: provider.address.toString()),
                              if (provider.consultationFee != null) ...[
                                const SizedBox(height: 10),
                                _DetailRow(icon: Icons.payments_outlined, text: 'Consultation fee: ₹${provider.consultationFee!.toStringAsFixed(0)}'),
                              ],
                              if (provider.operatingHoursNote != null) ...[
                                const SizedBox(height: 10),
                                _DetailRow(icon: Icons.schedule_outlined, text: provider.operatingHoursNote!),
                              ],
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () => _call(provider.contactPhone),
                          icon: const Icon(Icons.call_outlined),
                          label: const Text('Call'),
                        ),
                      ),
                      if (_slots != null) ...[
                        const SizedBox(height: 24),
                        Text('Available slots', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 12),
                        if (_slots!.isEmpty)
                          const EmptyState(icon: Icons.event_busy_outlined, message: 'No open slots right now.')
                        else
                          for (final slot in _slots!) ...[
                            Card(
                              child: ListTile(
                                leading: const Icon(Icons.schedule_outlined, color: AppTheme.primary),
                                title: Text(DateFormat('EEE, MMM d · h:mm a').format(DateTime.parse(slot.startTime))),
                                subtitle: Text('${slot.remaining} of ${slot.capacity} spots left'),
                                trailing: ElevatedButton(
                                  onPressed: _bookingSlotId == slot.id ? null : () => _book(slot),
                                  child: Text(_bookingSlotId == slot.id ? 'Booking…' : 'Book'),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                          ],
                      ],
                    ],
                  ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppTheme.textFaint),
        const SizedBox(width: 10),
        Expanded(child: Text(text)),
      ],
    );
  }
}
