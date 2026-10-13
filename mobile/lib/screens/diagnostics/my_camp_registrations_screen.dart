import 'package:flutter/material.dart';
import '../../models/diagnostics.dart';
import '../../services/api_client.dart';
import '../../services/diagnostics_service.dart';
import '../../widgets/error_banner.dart';

class MyCampRegistrationsScreen extends StatefulWidget {
  const MyCampRegistrationsScreen({super.key});

  @override
  State<MyCampRegistrationsScreen> createState() => _MyCampRegistrationsScreenState();
}

class _MyCampRegistrationsScreenState extends State<MyCampRegistrationsScreen> {
  final _service = DiagnosticsService(ApiClient.instance);
  List<CampRegistration>? _registrations;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final registrations = await _service.listMyCampRegistrations();
      if (!mounted) return;
      setState(() => _registrations = registrations);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _cancel(String campId) async {
    try {
      await _service.cancelCampRegistration(campId);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Camp Registrations')),
      body: SafeArea(
        child: _error != null && _registrations == null
            ? Padding(padding: const EdgeInsets.all(16), child: ErrorBanner.fromException(_error!, onRetry: _load))
            : _registrations == null
                ? const Center(child: CircularProgressIndicator())
                : _registrations!.isEmpty
                    ? const Center(child: Text("You haven't registered for any health camps yet."))
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_error != null) ErrorBanner.fromException(_error!),
                          ..._registrations!.map((r) => Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  title: Text(r.camp?.title ?? 'Camp'),
                                  subtitle: Text(r.camp?.locationDescription ?? 'Registered ${r.registeredAt}'),
                                  trailing: TextButton(onPressed: () => _cancel(r.campId), child: const Text('Cancel')),
                                ),
                              )),
                        ],
                      ),
      ),
    );
  }
}
