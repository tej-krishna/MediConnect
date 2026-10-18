import 'package:flutter/material.dart';
import '../app/app_theme.dart';

/// A colored circle showing a name's initials — the app has no photo field for users or
/// providers, so this (not a placeholder image) is the honest way to give a card or header the
/// "avatar" presence the reference design uses real photos for.
class InitialsAvatar extends StatelessWidget {
  const InitialsAvatar({super.key, required this.name, this.radius = 24, this.icon});

  final String name;
  final double radius;
  /// When set, shown instead of initials (e.g. a category/provider-type icon).
  final IconData? icon;

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).take(2);
    if (parts.isEmpty) return '?';
    return parts.map((p) => p[0].toUpperCase()).join();
  }

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.accentFor(name);
    return CircleAvatar(
      radius: radius,
      backgroundColor: color.withValues(alpha: 0.15),
      child: icon != null
          ? Icon(icon, color: color, size: radius)
          : Text(
              _initials,
              style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: radius * 0.75),
            ),
    );
  }
}
