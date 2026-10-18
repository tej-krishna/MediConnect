import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../app/app_theme.dart';
import '../../models/provider.dart';
import '../../models/scheduling.dart';
import '../../services/api_client.dart';
import '../../services/scheduling_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/initials_avatar.dart';

const _cancellableStatuses = {'booked'};

const _statusColors = {
  'booked': AppTheme.primary,
  'completed': AppTheme.textMuted,
  'cancelled': AppTheme.emergency,
  'no_show': AppTheme.warning,
};

class MyAppointmentsScreen extends StatefulWidget {
  const MyAppointmentsScreen({super.key});

  @override
  State<MyAppointmentsScreen> createState() => _MyAppointmentsScreenState();
}

class _MyAppointmentsScreenState extends State<MyAppointmentsScreen> {
  final _service = SchedulingService(ApiClient.instance);
  List<Appointment>? _appointments;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final appointments = await _service.listMyAppointments();
      if (!mounted) return;
      setState(() => _appointments = appointments);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _cancel(String id) async {
    try {
      await _service.cancelAppointment(id);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Appointments')),
      body: SafeArea(
        child: _error != null && _appointments == null
            ? Padding(padding: const EdgeInsets.all(16), child: ErrorBanner.fromException(_error!, onRetry: _load))
            : _appointments == null
                ? const LoadingView()
                : _appointments!.isEmpty
                    ? const EmptyState(icon: Icons.calendar_month_outlined, message: "You haven't booked any appointments yet.")
                    : RefreshIndicator(
                        onRefresh: _load,
                        color: AppTheme.primary,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            if (_error != null) ...[ErrorBanner.fromException(_error!), const SizedBox(height: 12)],
                            for (final a in _appointments!) ...[
                              _AppointmentTile(appointment: a, onCancel: _cancellableStatuses.contains(a.status) ? () => _cancel(a.id) : null),
                              const SizedBox(height: 10),
                            ],
                          ],
                        ),
                      ),
      ),
    );
  }
}

class _AppointmentTile extends StatelessWidget {
  const _AppointmentTile({required this.appointment, this.onCancel});

  final Appointment appointment;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final provider = appointment.provider;
    final slot = appointment.slot;
    final icon = providerTypeIcons[provider?.providerType ?? 'doctor'] ?? Icons.medical_services_outlined;
    final statusColor = _statusColors[appointment.status] ?? AppTheme.textMuted;
    final when = slot != null
        ? '${DateFormat('EEE, MMM d').format(DateTime.parse(slot.startTime))} · ${DateFormat.jm().format(DateTime.parse(slot.startTime))} - ${DateFormat.jm().format(DateTime.parse(slot.endTime))}'
        : 'Booked ${DateFormat('EEE, MMM d').format(DateTime.parse(appointment.bookedAt))}';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InitialsAvatar(name: provider?.organizationName ?? '?', icon: icon, radius: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(provider?.organizationName ?? 'Appointment', style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(
                    (provider?.typeDetails['specialization'] as String?) ?? (providerTypeLabels[provider?.providerType] ?? ''),
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                  ),
                  const SizedBox(height: 6),
                  Text(when, style: const TextStyle(fontSize: 13)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Container(width: 7, height: 7, decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle)),
                      const SizedBox(width: 6),
                      Text(appointment.status.replaceAll('_', ' '), style: TextStyle(color: statusColor, fontWeight: FontWeight.w600, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
            if (onCancel != null) TextButton(onPressed: onCancel, child: const Text('Cancel')),
          ],
        ),
      ),
    );
  }
}
