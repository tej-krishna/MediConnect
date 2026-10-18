import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../app/app_theme.dart';
import '../../app/auth_provider.dart';
import '../../widgets/activity_tile.dart';
import '../../widgets/app_bottom_nav_shell.dart';
import '../../widgets/initials_avatar.dart';

const _activityLinks = [
  (label: 'Find Care', icon: Icons.local_hospital_outlined, route: '/providers', emergency: false),
  (label: 'Appointments', icon: Icons.calendar_month_outlined, route: '/appointments', emergency: false),
  (label: 'Consultations', icon: Icons.video_call_outlined, route: '/consultations', emergency: false),
  (label: 'Medicine Orders', icon: Icons.local_shipping_outlined, route: '/orders', emergency: false),
  (label: 'Diagnostic Tests', icon: Icons.biotech_outlined, route: '/diagnostic-tests', emergency: false),
  (label: 'Diagnostic Orders', icon: Icons.description_outlined, route: '/diagnostic-orders', emergency: false),
  (label: 'Health Camps', icon: Icons.event_outlined, route: '/health-camps', emergency: false),
  (label: 'My Camps', icon: Icons.how_to_reg_outlined, route: '/my-camps', emergency: false),
  (label: 'Medical Record', icon: Icons.folder_shared_outlined, route: '/medical-records', emergency: false),
  (label: 'Caregiver Invites', icon: Icons.people_outline, route: '/caregiver-invites', emergency: false),
  (label: 'Emergency', icon: Icons.emergency_outlined, route: '/emergency', emergency: true),
];

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return AppBottomNavShell(
      currentIndex: 2,
      appBar: AppBar(title: const Text('Profile')),
      body: user == null
          ? const SizedBox.shrink()
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        InitialsAvatar(name: user.fullName, radius: 28),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(user.fullName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                              const SizedBox(height: 2),
                              Text(user.email, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                              if (user.phone != null && user.phone!.isNotEmpty) Text(user.phone!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                              const SizedBox(height: 6),
                              Wrap(
                                spacing: 6,
                                children: user.roles
                                    .map((r) => Chip(label: Text(r.replaceAll('_', ' '), style: const TextStyle(fontSize: 11)), visualDensity: VisualDensity.compact))
                                    .toList(),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text('My activity', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 3,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 0.95,
                  children: _activityLinks
                      .map((l) => ActivityTile(label: l.label, icon: l.icon, emergency: l.emergency, onTap: () => context.push(l.route)))
                      .toList(),
                ),
                if (user.roles.contains('doctor') || user.roles.contains('clinic_admin')) ...[
                  const SizedBox(height: 20),
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.medical_services_outlined, color: AppTheme.primary),
                      title: const Text('Consultation requests'),
                      subtitle: const Text('Accept online & home-visit requests from patients'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/doctor/consultations'),
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                OutlinedButton.icon(
                  onPressed: () => context.read<AuthProvider>().logout(),
                  icon: const Icon(Icons.logout),
                  label: const Text('Log out'),
                ),
              ],
            ),
    );
  }
}
