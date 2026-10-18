import 'package:flutter/material.dart';
import '../app/app_theme.dart';

/// A section title with an optional "See all" action — the repeating "Upcoming Appointments / See
/// All", "Nearby / See All" pattern from the reference design.
class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.onSeeAll});

  final String title;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        if (onSeeAll != null)
          TextButton(
            onPressed: onSeeAll,
            style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 0), tapTargetSize: MaterialTapTargetSize.shrinkWrap),
            child: const Text('See All', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600)),
          ),
      ],
    );
  }
}
