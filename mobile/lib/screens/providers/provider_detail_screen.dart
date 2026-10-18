import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../app/app_theme.dart';
import '../../app/auth_provider.dart';
import '../../models/consultation.dart';
import '../../models/provider.dart';
import '../../models/scheduling.dart';
import '../../services/api_client.dart';
import '../../services/api_exception.dart';
import '../../services/consultation_service.dart';
import '../../services/provider_service.dart';
import '../../services/scheduling_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/initials_avatar.dart';

/// Hospitals/clinics keep the old self-service slot system — doctors (and clinics, which get
/// both) instead use the request/accept Consultation flow below.
const _schedulingTypes = {'hospital', 'clinic'};
const _consultationTypes = {'doctor', 'clinic'};

class ProviderDetailScreen extends StatefulWidget {
  const ProviderDetailScreen({super.key, required this.providerId});
  final String providerId;

  @override
  State<ProviderDetailScreen> createState() => _ProviderDetailScreenState();
}

class _ProviderDetailScreenState extends State<ProviderDetailScreen> {
  final _providerService = ProviderService(ApiClient.instance);
  final _schedulingService = SchedulingService(ApiClient.instance);
  final _consultationService = ConsultationService(ApiClient.instance);
  PublicProvider? _provider;
  List<Slot>? _slots;
  Object? _error;
  String? _bookingSlotId;
  String? _message;

  String _visitType = 'online';
  DateTime? _preferredDateTime;
  final _homeLine1Controller = TextEditingController();
  final _homeCityController = TextEditingController();
  final _homeStateController = TextEditingController();
  final _homePostalCodeController = TextEditingController();
  bool _requestingConsultation = false;
  String? _consultationMessage;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _homeLine1Controller.dispose();
    _homeCityController.dispose();
    _homeStateController.dispose();
    _homePostalCodeController.dispose();
    super.dispose();
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
        _visitType = provider.acceptsOnlineConsultations == true ? 'online' : 'home_visit';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _pickPreferredDateTime() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      initialDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
    if (time == null) return;
    setState(() => _preferredDateTime = DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  Future<void> _requestConsultation() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      context.push('/login');
      return;
    }
    if (_preferredDateTime == null) {
      setState(() => _consultationMessage = 'Pick a preferred date and time first.');
      return;
    }
    setState(() {
      _requestingConsultation = true;
      _consultationMessage = null;
    });
    try {
      await _consultationService.request(
        doctorId: widget.providerId,
        visitType: _visitType,
        preferredDateTime: _preferredDateTime!,
        homeVisitAddress: _visitType == 'home_visit'
            ? ConsultationAddress(
                line1: _homeLine1Controller.text,
                city: _homeCityController.text,
                state: _homeStateController.text,
                postalCode: _homePostalCodeController.text,
              )
            : null,
      );
      if (!mounted) return;
      setState(() {
        _consultationMessage = 'Request sent! See it under My Consultations once the doctor accepts.';
        _preferredDateTime = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _consultationMessage = e is ApiException ? e.message : 'Could not send this request.');
    } finally {
      if (mounted) setState(() => _requestingConsultation = false);
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
                              if (_consultationTypes.contains(provider.providerType)) ...[
                                const SizedBox(height: 10),
                                _DetailRow(
                                  icon: Icons.verified_outlined,
                                  text: '${provider.reliabilityRating.toStringAsFixed(0)}% reliability — based on completed vs. missed visits',
                                ),
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
                      if (_consultationTypes.contains(provider.providerType) &&
                          (provider.acceptsOnlineConsultations == true || provider.acceptsHomeVisits == true)) ...[
                        const SizedBox(height: 24),
                        Text('Request a consultation', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 12),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                DropdownButtonFormField<String>(
                                  initialValue: _visitType,
                                  decoration: const InputDecoration(labelText: 'Visit type'),
                                  items: [
                                    if (provider.acceptsOnlineConsultations == true)
                                      const DropdownMenuItem(value: 'online', child: Text('Online consultation')),
                                    if (provider.acceptsHomeVisits == true)
                                      const DropdownMenuItem(value: 'home_visit', child: Text('Home visit')),
                                  ],
                                  onChanged: (v) => setState(() => _visitType = v ?? _visitType),
                                ),
                                const SizedBox(height: 12),
                                OutlinedButton(
                                  onPressed: _pickPreferredDateTime,
                                  child: Text(_preferredDateTime == null ? 'Pick preferred date & time' : _preferredDateTime.toString()),
                                ),
                                if (_visitType == 'home_visit') ...[
                                  const SizedBox(height: 12),
                                  TextField(controller: _homeLine1Controller, decoration: const InputDecoration(labelText: 'Address')),
                                  const SizedBox(height: 12),
                                  TextField(controller: _homeCityController, decoration: const InputDecoration(labelText: 'City')),
                                  const SizedBox(height: 12),
                                  TextField(controller: _homeStateController, decoration: const InputDecoration(labelText: 'State')),
                                  const SizedBox(height: 12),
                                  TextField(controller: _homePostalCodeController, decoration: const InputDecoration(labelText: 'Postal code')),
                                ],
                                const SizedBox(height: 16),
                                ElevatedButton(
                                  onPressed: _requestingConsultation ? null : _requestConsultation,
                                  child: Text(_requestingConsultation ? 'Sending…' : 'Send request'),
                                ),
                                if (_consultationMessage != null) ...[
                                  const SizedBox(height: 8),
                                  Text(_consultationMessage!, style: const TextStyle(color: AppTheme.textMuted)),
                                ],
                              ],
                            ),
                          ),
                        ),
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
