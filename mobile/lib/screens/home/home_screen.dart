import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart' as provider_pkg;
import '../../app/app_theme.dart';
import '../../app/auth_provider.dart';
import '../../models/provider.dart';
import '../../models/scheduling.dart';
import '../../services/api_client.dart';
import '../../services/provider_service.dart';
import '../../services/scheduling_service.dart';
import '../../widgets/app_bottom_nav_shell.dart';
import '../../widgets/appointment_card.dart';
import '../../widgets/category_tile.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/initials_avatar.dart';
import '../../widgets/provider_list_card.dart';
import '../../widgets/section_header.dart';

/// A curated set of common specializations to browse by — the backend has no specialization
/// taxonomy of its own (a doctor's specialization is free text in typeDetails), so this maps each
/// tile to the nearest real filter the search API supports: providerType=doctor, with the
/// specialization carried along as a client-side text filter the search screen applies locally.
const _specialistCategories = [
  (label: 'Dentist', icon: Icons.sentiment_satisfied_alt_outlined, query: 'dent'),
  (label: 'ENT', icon: Icons.hearing_outlined, query: 'ent'),
  (label: 'Neurologist', icon: Icons.psychology_outlined, query: 'neuro'),
  (label: 'Cardiologist', icon: Icons.favorite_outline, query: 'cardio'),
  (label: 'Orthopedic', icon: Icons.accessibility_new_outlined, query: 'ortho'),
  (label: 'General', icon: Icons.medical_information_outlined, query: ''),
];

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _schedulingService = SchedulingService(ApiClient.instance);
  final _providerService = ProviderService(ApiClient.instance);

  List<Appointment>? _appointments;
  List<PublicProvider>? _nearbyHospitals;
  List<PublicProvider>? _forYouDoctors;
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _schedulingService.listMyAppointments(),
        _providerService.search(providerType: 'hospital'),
        _providerService.search(providerType: 'doctor'),
      ]);
      if (!mounted) return;
      final appointments = (results[0] as List<Appointment>).where((a) => a.status == 'booked').toList()
        ..sort((a, b) {
          final aStart = a.slot?.startTime ?? a.bookedAt;
          final bStart = b.slot?.startTime ?? b.bookedAt;
          return aStart.compareTo(bStart);
        });
      setState(() {
        _appointments = appointments;
        _nearbyHospitals = (results[1] as List<PublicProvider>).take(6).toList();
        _forYouDoctors = (results[2] as List<PublicProvider>).take(8).toList();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openProviderSearch({String? providerType}) {
    context.push('/providers', extra: providerType == null ? null : {'providerType': providerType});
  }

  @override
  Widget build(BuildContext context) {
    final user = provider_pkg.Provider.of<AuthProvider>(context).user;
    final firstName = user?.fullName.split(' ').first ?? 'there';

    return AppBottomNavShell(
      currentIndex: 0,
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppTheme.primary,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            Row(
              children: [
                InitialsAvatar(name: user?.fullName ?? '?', radius: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Hey, $firstName', style: Theme.of(context).textTheme.titleLarge),
                      const Text("Let's find you care", style: TextStyle(color: AppTheme.textMuted)),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => context.push('/emergency'),
                  icon: const Icon(Icons.emergency_outlined, color: AppTheme.emergency),
                  tooltip: 'Emergency',
                ),
              ],
            ),
            const SizedBox(height: 20),
            InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => _openProviderSearch(),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(color: AppTheme.surfaceMuted, borderRadius: BorderRadius.circular(14)),
                child: const Row(
                  children: [
                    Icon(Icons.search, color: AppTheme.textFaint),
                    SizedBox(width: 10),
                    Expanded(child: Text('Find a doctor or speciality', style: TextStyle(color: AppTheme.textFaint))),
                    Icon(Icons.tune, color: AppTheme.primary),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            if (_error != null) ...[
              ErrorBanner.fromException(_error!, onRetry: _load),
              const SizedBox(height: 16),
            ],
            if (_loading && _appointments == null)
              const Padding(padding: EdgeInsets.symmetric(vertical: 40), child: LoadingView())
            else ...[
              if ((_appointments ?? []).isNotEmpty) ...[
                SectionHeader(title: 'Upcoming Appointments', onSeeAll: () => context.push('/appointments')),
                const SizedBox(height: 12),
                SizedBox(
                  height: 178,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _appointments!.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 12),
                    itemBuilder: (context, i) => AppointmentCard(
                      appointment: _appointments![i],
                      onTap: () => context.push('/appointments'),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
              const Text('Specialists', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 12),
              SizedBox(
                height: 90,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _specialistCategories.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final c = _specialistCategories[i];
                    return CategoryTile(
                      label: c.label,
                      icon: c.icon,
                      onTap: () => context.push('/providers', extra: {'providerType': 'doctor', 'query': c.query}),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
              SectionHeader(title: 'Nearby', onSeeAll: () => _openProviderSearch(providerType: 'hospital')),
              const SizedBox(height: 12),
              if ((_nearbyHospitals ?? []).isEmpty)
                const EmptyState(icon: Icons.local_hospital_outlined, message: 'No verified hospitals listed yet.')
              else
                Column(
                  children: [
                    for (final p in _nearbyHospitals!) ...[
                      ProviderListCard(provider: p, onTap: () => context.push('/providers/${p.id}')),
                      const SizedBox(height: 10),
                    ],
                  ],
                ),
              const SizedBox(height: 12),
              SectionHeader(title: 'For You', onSeeAll: () => _openProviderSearch(providerType: 'doctor')),
              const SizedBox(height: 12),
              if ((_forYouDoctors ?? []).isEmpty)
                const EmptyState(icon: Icons.medical_services_outlined, message: 'No verified doctors listed yet.')
              else
                SizedBox(
                  height: 150,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _forYouDoctors!.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 12),
                    itemBuilder: (context, i) => ProviderGridCard(provider: _forYouDoctors![i], onTap: () => context.push('/providers/${_forYouDoctors![i].id}')),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
