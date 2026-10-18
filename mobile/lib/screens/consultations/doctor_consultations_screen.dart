import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../app/app_theme.dart';
import '../../models/consultation.dart';
import '../../models/provider.dart';
import '../../services/api_client.dart';
import '../../services/consultation_service.dart';
import '../../services/provider_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';

/// A doctor/clinic's own "incoming requests" screen — the first provider-facing screen mobile has
/// ever had (every other provider feature is web-only); scoped to just the consultations flow
/// rather than a full dashboard, since that's the one thing a doctor genuinely needs on the go.
class DoctorConsultationsScreen extends StatefulWidget {
  const DoctorConsultationsScreen({super.key});

  @override
  State<DoctorConsultationsScreen> createState() => _DoctorConsultationsScreenState();
}

class _DoctorConsultationsScreenState extends State<DoctorConsultationsScreen> {
  final _providerService = ProviderService(ApiClient.instance);
  final _consultationService = ConsultationService(ApiClient.instance);

  OwnerProviderApplication? _doctorApp;
  List<Consultation>? _consultations;
  Object? _error;
  bool _loadingApp = true;
  bool _togglingAvailability = false;
  final Map<String, DateTime> _confirmDateTimes = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _error = null;
      _loadingApp = true;
    });
    try {
      final apps = await _providerService.listMyApplications();
      final doctorApp = apps
          .cast<OwnerProviderApplication?>()
          .firstWhere((a) => a != null && (a.providerType == 'doctor' || a.providerType == 'clinic') && a.status == 'approved', orElse: () => null);
      if (!mounted) return;
      setState(() => _doctorApp = doctorApp);
      if (doctorApp != null) {
        final consultations = await _consultationService.listForDoctor(doctorApp.id);
        if (!mounted) return;
        setState(() => _consultations = consultations);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loadingApp = false);
    }
  }

  Future<void> _toggleAvailability(String field) async {
    final app = _doctorApp;
    if (app == null) return;
    setState(() => _togglingAvailability = true);
    try {
      await _providerService.setConsultationAvailability(
        app.id,
        acceptsOnlineConsultations: field == 'online' ? !(app.acceptsOnlineConsultations ?? false) : null,
        acceptsHomeVisits: field == 'home_visit' ? !(app.acceptsHomeVisits ?? false) : null,
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _togglingAvailability = false);
    }
  }

  Future<void> _pickConfirmDateTime(String consultationId) async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      initialDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
    if (time == null) return;
    setState(() => _confirmDateTimes[consultationId] = DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  Future<void> _confirm(String id) async {
    final dateTime = _confirmDateTimes[id];
    if (dateTime == null) {
      setState(() => _error = 'Pick a date and time first.');
      return;
    }
    try {
      await _consultationService.confirm(id, dateTime);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _decline(String id) async {
    try {
      await _consultationService.cancel(id);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _complete(String id) async {
    try {
      await _consultationService.complete(id);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Consultation Requests')),
      body: SafeArea(
        child: _loadingApp
            ? const LoadingView()
            : _doctorApp == null
                ? const EmptyState(
                    icon: Icons.medical_services_outlined,
                    message: "You don't have an approved doctor or clinic listing on MediConnect yet.",
                  )
                : RefreshIndicator(
                    onRefresh: _load,
                    color: AppTheme.primary,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (_error != null) ...[ErrorBanner.fromException(_error!), const SizedBox(height: 12)],
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Consultation availability', style: TextStyle(fontWeight: FontWeight.w700)),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Expanded(
                                      child: SwitchListTile(
                                        contentPadding: EdgeInsets.zero,
                                        title: const Text('Online', style: TextStyle(fontSize: 13)),
                                        value: _doctorApp!.acceptsOnlineConsultations ?? false,
                                        onChanged: _togglingAvailability ? null : (_) => _toggleAvailability('online'),
                                      ),
                                    ),
                                    Expanded(
                                      child: SwitchListTile(
                                        contentPadding: EdgeInsets.zero,
                                        title: const Text('Home visits', style: TextStyle(fontSize: 13)),
                                        value: _doctorApp!.acceptsHomeVisits ?? false,
                                        onChanged: _togglingAvailability ? null : (_) => _toggleAvailability('home_visit'),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (_consultations == null)
                          const LoadingView()
                        else if (_consultations!.isEmpty)
                          const EmptyState(icon: Icons.inbox_outlined, message: 'No consultation requests yet.')
                        else
                          for (final c in _consultations!) ...[
                            _DoctorConsultationTile(
                              consultation: c,
                              confirmDateTime: _confirmDateTimes[c.id],
                              onPickDateTime: () => _pickConfirmDateTime(c.id),
                              onConfirm: () => _confirm(c.id),
                              onDecline: () => _decline(c.id),
                              onComplete: () => _complete(c.id),
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

class _DoctorConsultationTile extends StatelessWidget {
  const _DoctorConsultationTile({
    required this.consultation,
    required this.confirmDateTime,
    required this.onPickDateTime,
    required this.onConfirm,
    required this.onDecline,
    required this.onComplete,
  });

  final Consultation consultation;
  final DateTime? confirmDateTime;
  final VoidCallback onPickDateTime;
  final VoidCallback onConfirm;
  final VoidCallback onDecline;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final isOnline = consultation.visitType == 'online';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isOnline ? 'Online' : 'Home visit', style: const TextStyle(fontWeight: FontWeight.w700)),
            if (consultation.homeVisitAddress != null)
              Text(
                '${consultation.homeVisitAddress!.line1}, ${consultation.homeVisitAddress!.city}',
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
              ),
            const SizedBox(height: 6),
            Text(
              consultation.confirmedDateTime != null
                  ? 'Confirmed: ${DateFormat('EEE, MMM d · h:mm a').format(DateTime.parse(consultation.confirmedDateTime!))}'
                  : 'Preferred: ${DateFormat('EEE, MMM d · h:mm a').format(DateTime.parse(consultation.preferredDateTime))}',
              style: const TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 6),
            Text(consultation.status.replaceAll('_', ' '), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (consultation.status == 'requested') ...[
                  OutlinedButton(
                    onPressed: onPickDateTime,
                    child: Text(confirmDateTime == null ? 'Pick time' : DateFormat('MMM d, h:mm a').format(confirmDateTime!)),
                  ),
                  ElevatedButton(onPressed: onConfirm, child: const Text('Accept')),
                  OutlinedButton(onPressed: onDecline, child: const Text('Decline')),
                ],
                if (consultation.status == 'confirmed' && isOnline)
                  ElevatedButton(
                    onPressed: () => context.push('/consultations/${consultation.id}/call'),
                    child: const Text('Join call'),
                  ),
                if (consultation.status == 'confirmed' && !isOnline)
                  ElevatedButton(
                    onPressed: () => context.push('/consultations/${consultation.id}/check-in'),
                    child: const Text('Check in'),
                  ),
                if (consultation.status == 'confirmed')
                  OutlinedButton(onPressed: onComplete, child: const Text('Mark completed')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
