import 'package:flutter/material.dart';
import '../../models/scheduling.dart';
import '../../services/api_client.dart';
import '../../services/scheduling_service.dart';
import '../../widgets/error_banner.dart';

const _cancellableStatuses = {'booked'};

class MyAppointmentsScreen extends StatefulWidget {
  const MyAppointmentsScreen({super.key});

  @override
  State<MyAppointmentsScreen> createState() => _MyAppointmentsScreenState();
}

class _MyAppointmentsScreenState extends State<MyAppointmentsScreen> {
  final _service = SchedulingService(ApiClient.instance);
  List<Appointment>? _appointments;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final appointments = await _service.listMyAppointments();
      if (!mounted) return;
      setState(() => _appointments = appointments);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _cancel(String id) async {
    try {
      await _service.cancelAppointment(id);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Appointments')),
      body: SafeArea(
        child: _error != null && _appointments == null
            ? Padding(padding: const EdgeInsets.all(16), child: ErrorBanner.fromException(_error!, onRetry: _load))
            : _appointments == null
                ? const Center(child: CircularProgressIndicator())
                : _appointments!.isEmpty
                    ? const Center(child: Text("You haven't booked any appointments yet."))
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_error != null) ErrorBanner.fromException(_error!),
                          ..._appointments!.map((a) => Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  title: Text('Booked ${a.bookedAt}'),
                                  subtitle: Text('Status: ${a.status}'),
                                  trailing: _cancellableStatuses.contains(a.status)
                                      ? TextButton(onPressed: () => _cancel(a.id), child: const Text('Cancel'))
                                      : null,
                                ),
                              )),
                        ],
                      ),
      ),
    );
  }
}
