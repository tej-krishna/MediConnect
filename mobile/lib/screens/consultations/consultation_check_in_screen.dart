import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../../app/app_theme.dart';
import '../../models/consultation.dart';
import '../../services/api_client.dart';
import '../../services/consultation_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';

/// Shared by both sides of a home visit — a patient and the doctor both land here and tap the
/// same button; the backend only reports "within range" once both check-ins land within 30m of
/// each other (see backend/src/modules/scheduling/consultation.service.ts's checkIn).
class ConsultationCheckInScreen extends StatefulWidget {
  const ConsultationCheckInScreen({super.key, required this.consultationId});
  final String consultationId;

  @override
  State<ConsultationCheckInScreen> createState() => _ConsultationCheckInScreenState();
}

class _ConsultationCheckInScreenState extends State<ConsultationCheckInScreen> {
  final _service = ConsultationService(ApiClient.instance);
  Consultation? _consultation;
  Object? _error;
  bool _checkingIn = false;
  int? _distanceMeters;
  bool? _withinRange;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final consultation = await _service.getById(widget.consultationId);
      if (!mounted) return;
      setState(() => _consultation = consultation);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _checkIn() async {
    setState(() {
      _checkingIn = true;
      _error = null;
    });
    try {
      final permission = await _ensureLocationPermission();
      if (permission == null) {
        setState(() => _error = 'Location permission is required to check in.');
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 15)),
      );
      final result = await _service.checkIn(widget.consultationId, lat: position.latitude, lng: position.longitude);
      if (!mounted) return;
      setState(() {
        _consultation = result.consultation;
        _distanceMeters = result.distanceMeters;
        _withinRange = result.withinRange;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _checkingIn = false);
    }
  }

  /// Returns the granted permission, or null if location services/permission aren't available —
  /// mirrors the website's useGeolocation hook's "ask, then give up cleanly" behavior.
  Future<LocationPermission?> _ensureLocationPermission() async {
    if (!await Geolocator.isLocationServiceEnabled()) return null;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) return null;
    return permission;
  }

  @override
  Widget build(BuildContext context) {
    final consultation = _consultation;
    return Scaffold(
      appBar: AppBar(title: const Text('Home Visit Check-In')),
      body: SafeArea(
        child: consultation == null
            ? (_error != null ? Padding(padding: const EdgeInsets.all(16), child: ErrorBanner.fromException(_error!, onRetry: _load)) : const LoadingView())
            : Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_error != null) ...[ErrorBanner.fromException(_error!), const SizedBox(height: 12)],
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (consultation.homeVisitAddress != null) ...[
                              Text(consultation.homeVisitAddress!.line1, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                              const SizedBox(height: 2),
                              Text(
                                '${consultation.homeVisitAddress!.city}, ${consultation.homeVisitAddress!.state} ${consultation.homeVisitAddress!.postalCode}',
                                style: const TextStyle(color: AppTheme.textMuted),
                              ),
                              const SizedBox(height: 10),
                            ],
                            if (consultation.confirmedDateTime != null)
                              Text('Scheduled: ${DateFormat('EEE, MMM d · h:mm a').format(DateTime.parse(consultation.confirmedDateTime!))}'),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _checkingIn ? null : _checkIn,
                              child: Text(_checkingIn ? 'Checking…' : "I'm here"),
                            ),
                            if (_withinRange != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: _withinRange! ? AppTheme.primaryLight : AppTheme.warningBg,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  _distanceMeters == null
                                      ? 'Waiting for the other side to check in too…'
                                      : _withinRange!
                                          ? "You're ${_distanceMeters}m apart — within range!"
                                          : "You're ${_distanceMeters}m apart — move closer and try again.",
                                  style: TextStyle(color: _withinRange! ? AppTheme.primaryDark : AppTheme.warning, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
