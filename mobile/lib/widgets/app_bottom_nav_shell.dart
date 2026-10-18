import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../app/app_theme.dart';

/// Wraps the three top-level screens (Home, Pharmacy, Profile) in the persistent bottom tab bar
/// from the reference design. Each tab is a plain top-level go_router route (not a nested
/// StatefulShellRoute) — simpler, and consistent with how the rest of the app already navigates
/// with context.push/context.go, at the cost of each tab rebuilding fresh when selected rather
/// than preserving scroll/form state in the background. That trade-off is fine here: none of the
/// three tabs holds in-progress input worth preserving across a tab switch.
class AppBottomNavShell extends StatelessWidget {
  const AppBottomNavShell({super.key, required this.currentIndex, required this.body, this.appBar, this.floatingActionButton});

  final int currentIndex;
  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? floatingActionButton;

  static const _destinations = [
    (route: '/', icon: Icons.home_outlined, activeIcon: Icons.home, label: 'Home'),
    (route: '/medicines', icon: Icons.medication_outlined, activeIcon: Icons.medication, label: 'Pharmacy'),
    (route: '/account', icon: Icons.person_outline, activeIcon: Icons.person, label: 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: appBar,
      body: SafeArea(bottom: false, child: body),
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 4, 12, 10),
          child: Container(
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppTheme.border),
            ),
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                for (var i = 0; i < _destinations.length; i++)
                  _NavButton(
                    icon: i == currentIndex ? _destinations[i].activeIcon : _destinations[i].icon,
                    label: _destinations[i].label,
                    selected: i == currentIndex,
                    onTap: i == currentIndex ? null : () => context.go(_destinations[i].route),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({required this.icon, required this.label, required this.selected, required this.onTap});

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppTheme.primary : AppTheme.textFaint;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: selected ? FontWeight.w700 : FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}
