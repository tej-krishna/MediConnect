import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../app/app_theme.dart';
import '../models/provider.dart';
import '../models/scheduling.dart';

/// The "Dr. Ibrahim Rashed / Dentist Specialist / Tomorrow (Fri, August 14) 8:00-9:30 PM" card
/// from the reference design — needs `appointment.provider`/`appointment.slot`, which only
/// GET /appointments/mine populates (see scheduling.controller.ts's toMyAppointmentView).
class AppointmentCard extends StatelessWidget {
  const AppointmentCard({super.key, required this.appointment, required this.onTap});

  final Appointment appointment;
  final VoidCallback onTap;

  String _formatWhen(DateTime start, DateTime end) {
    final now = DateTime.now();
    final startDay = DateTime(start.year, start.month, start.day);
    final today = DateTime(now.year, now.month, now.day);
    final diffDays = startDay.difference(today).inDays;
    final dayLabel = switch (diffDays) {
      0 => 'Today',
      1 => 'Tomorrow',
      _ => DateFormat('EEE, MMMM d').format(start),
    };
    return '$dayLabel (${DateFormat('EEE, MMMM d').format(start)})\n${DateFormat.jm().format(start)} - ${DateFormat.jm().format(end)}';
  }

  @override
  Widget build(BuildContext context) {
    final provider = appointment.provider;
    final slot = appointment.slot;
    final specialization = provider?.typeDetails['specialization'] as String?;
    final icon = providerTypeIcons[provider?.providerType ?? 'doctor'] ?? Icons.medical_services_outlined;

    return SizedBox(
      width: 230,
      child: Card(
        color: AppTheme.primary,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(radius: 18, backgroundColor: Colors.white24, child: Icon(icon, color: Colors.white, size: 18)),
                const SizedBox(height: 10),
                Text(
                  provider?.organizationName ?? 'Your appointment',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  specialization ?? (providerTypeLabels[provider?.providerType] ?? 'Appointment'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
                const SizedBox(height: 10),
                Text(
                  slot != null ? _formatWhen(DateTime.parse(slot.startTime), DateTime.parse(slot.endTime)) : appointment.status,
                  style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.35),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
