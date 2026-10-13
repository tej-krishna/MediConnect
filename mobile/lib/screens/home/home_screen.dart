import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../app/app_theme.dart';
import '../../app/auth_provider.dart';

class _HomeTile {
  final String label;
  final IconData icon;
  final String route;
  final bool emergency;
  const _HomeTile(this.label, this.icon, this.route, {this.emergency = false});
}

const _tiles = [
  _HomeTile('Emergency', Icons.emergency, '/emergency', emergency: true),
  _HomeTile('Find Care', Icons.local_hospital, '/providers'),
  _HomeTile('Medicines', Icons.medication, '/medicines'),
  _HomeTile('Diagnostic Tests', Icons.biotech, '/diagnostic-tests'),
  _HomeTile('Health Camps', Icons.event, '/health-camps'),
  _HomeTile('My Appointments', Icons.calendar_month, '/appointments'),
  _HomeTile('My Orders', Icons.local_shipping, '/orders'),
  _HomeTile('Diagnostic Orders', Icons.description, '/diagnostic-orders'),
  _HomeTile('My Camp Registrations', Icons.how_to_reg, '/my-camps'),
  _HomeTile('Medical Record', Icons.folder_shared, '/medical-records'),
  _HomeTile('Caregiver Invites', Icons.people, '/caregiver-invites'),
];

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      appBar: AppBar(
        title: const Text('MediConnect'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () => context.push('/account'),
            tooltip: 'My account',
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (user != null)
                Text('Hi, ${user.fullName.split(' ').first}', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              Expanded(
                child: GridView.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.3,
                  children: _tiles.map((tile) => _buildTile(context, tile)).toList(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTile(BuildContext context, _HomeTile tile) {
    return Card(
      color: tile.emergency ? AppTheme.emergency.withValues(alpha: 0.08) : null,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push(tile.route),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(tile.icon, size: 32, color: tile.emergency ? AppTheme.emergency : AppTheme.primary),
              const SizedBox(height: 8),
              Text(tile.label, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}
