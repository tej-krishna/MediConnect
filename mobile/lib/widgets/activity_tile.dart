import 'package:flutter/material.dart';
import '../app/app_theme.dart';

/// A square icon+label shortcut tile, used for the Profile screen's "My activity" grid — the
/// mobile equivalent of the website's AccountPage ACTIVITY_LINKS grid.
class ActivityTile extends StatelessWidget {
  const ActivityTile({super.key, required this.label, required this.icon, required this.onTap, this.emergency = false});

  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool emergency;

  @override
  Widget build(BuildContext context) {
    final color = emergency ? AppTheme.emergency : AppTheme.primary;
    return Card(
      color: emergency ? AppTheme.emergency.withValues(alpha: 0.06) : null,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 28, color: color),
              const SizedBox(height: 8),
              Text(label, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5)),
            ],
          ),
        ),
      ),
    );
  }
}
