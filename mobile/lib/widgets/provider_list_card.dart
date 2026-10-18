import 'package:flutter/material.dart';
import '../app/app_theme.dart';
import '../models/provider.dart';
import 'initials_avatar.dart';

/// The reusable "Nearby" / "For You" / search-result row: icon avatar, name, type + city, and an
/// optional trailing fee — used everywhere the app lists providers so a doctor/hospital/pharmacy
/// reads the same no matter which screen it's shown on.
class ProviderListCard extends StatelessWidget {
  const ProviderListCard({super.key, required this.provider, required this.onTap, this.dense = false});

  final PublicProvider provider;
  final VoidCallback onTap;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final typeLabel = providerTypeLabels[provider.providerType] ?? provider.providerType;
    final icon = providerTypeIcons[provider.providerType] ?? Icons.local_hospital_outlined;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              InitialsAvatar(name: provider.organizationName, icon: icon, radius: dense ? 22 : 26),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(provider.organizationName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text('$typeLabel · ${provider.address.city}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                  ],
                ),
              ),
              if (provider.consultationFee != null) ...[
                const SizedBox(width: 8),
                Text('₹${provider.consultationFee!.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// A narrower vertical card for horizontal carousels ("For You") — same identity, different shape.
class ProviderGridCard extends StatelessWidget {
  const ProviderGridCard({super.key, required this.provider, required this.onTap});

  final PublicProvider provider;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final typeLabel = providerTypeLabels[provider.providerType] ?? provider.providerType;
    final icon = providerTypeIcons[provider.providerType] ?? Icons.local_hospital_outlined;
    return SizedBox(
      width: 140,
      child: Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InitialsAvatar(name: provider.organizationName, icon: icon, radius: 24),
                const SizedBox(height: 10),
                Text(provider.organizationName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 2),
                Text(typeLabel, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
