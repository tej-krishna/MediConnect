import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../app/app_theme.dart';
import '../../models/consultation.dart';
import '../../models/provider.dart';
import '../../services/api_client.dart';
import '../../services/consultation_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';

const _cancellableStatuses = {'requested', 'confirmed'};

bool _canReportNoShow(Consultation c) {
  if (c.status != 'confirmed' || c.confirmedDateTime == null) return false;
  return DateTime.parse(c.confirmedDateTime!).isBefore(DateTime.now());
}

class MyConsultationsScreen extends StatefulWidget {
  const MyConsultationsScreen({super.key});

  @override
  State<MyConsultationsScreen> createState() => _MyConsultationsScreenState();
}

class _MyConsultationsScreenState extends State<MyConsultationsScreen> {
  final _service = ConsultationService(ApiClient.instance);
  List<Consultation>? _consultations;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final consultations = await _service.listMine();
      if (!mounted) return;
      setState(() => _consultations = consultations);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _cancel(String id) async {
    try {
      await _service.cancel(id);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _reportNoShow(String id) async {
    try {
      await _service.reportNoShow(id);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Consultations')),
      body: SafeArea(
        child: _error != null && _consultations == null
            ? Padding(padding: const EdgeInsets.all(16), child: ErrorBanner.fromException(_error!, onRetry: _load))
            : _consultations == null
                ? const LoadingView()
                : _consultations!.isEmpty
                    ? const EmptyState(
                        icon: Icons.video_call_outlined,
                        message: "You haven't requested any online or home-visit consultations yet.",
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        color: AppTheme.primary,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            if (_error != null) ...[ErrorBanner.fromException(_error!), const SizedBox(height: 12)],
                            for (final c in _consultations!) ...[
                              _ConsultationTile(
                                consultation: c,
                                onCancel: _cancellableStatuses.contains(c.status) ? () => _cancel(c.id) : null,
                                onReportNoShow: _canReportNoShow(c) ? () => _reportNoShow(c.id) : null,
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

class _ConsultationTile extends StatelessWidget {
  const _ConsultationTile({required this.consultation, this.onCancel, this.onReportNoShow});

  final Consultation consultation;
  final VoidCallback? onCancel;
  final VoidCallback? onReportNoShow;

  @override
  Widget build(BuildContext context) {
    final doctor = consultation.doctor;
    final icon = providerTypeIcons[doctor?.providerType ?? 'doctor'] ?? Icons.medical_services_outlined;
    final isOnline = consultation.visitType == 'online';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: AppTheme.primary, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(doctor?.organizationName ?? 'Doctor', style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                Text(isOnline ? 'Online' : 'Home visit', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
              ],
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
                if (consultation.status == 'confirmed' && isOnline)
                  ElevatedButton(
                    onPressed: () => context.push('/consultations/${consultation.id}/call'),
                    child: const Text('Join call'),
                  ),
                if (consultation.status == 'confirmed' && !isOnline)
                  ElevatedButton(
                    onPressed: () => context.push('/consultations/${consultation.id}/check-in'),
                    child: const Text("I'm here"),
                  ),
                if (onCancel != null) OutlinedButton(onPressed: onCancel, child: const Text('Cancel')),
                if (onReportNoShow != null)
                  OutlinedButton(onPressed: onReportNoShow, child: const Text("Doctor didn't show up")),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
