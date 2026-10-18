import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../app/app_theme.dart';
import '../../models/emergency_guide.dart';
import '../../services/api_client.dart';
import '../../services/emergency_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';

/// Public — no ProtectedRoute-equivalent guard, the same deliberate choice the website makes: an
/// emergency shouldn't have a login wall. Deliberately not a symptom checker, same as the website
/// — checking any red-flag symptom shows the same unconditional "call now" banner, no scoring.
class EmergencyScreen extends StatefulWidget {
  const EmergencyScreen({super.key});

  @override
  State<EmergencyScreen> createState() => _EmergencyScreenState();
}

class _EmergencyScreenState extends State<EmergencyScreen> {
  final _service = EmergencyService(ApiClient.instance);
  List<EmergencyGuide>? _guides;
  Object? _error;
  final Set<String> _checkedSymptoms = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final guides = await _service.listGuides();
      if (!mounted) return;
      setState(() => _guides = guides);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _call112() async {
    final uri = Uri(scheme: 'tel', path: '112');
    await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    final anyChecked = _checkedSymptoms.isNotEmpty;
    return Scaffold(
      appBar: AppBar(title: const Text('Emergency')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              color: AppTheme.emergency.withValues(alpha: 0.08),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'In a medical emergency in India, call 112 immediately. Do not wait to search for a cheaper provider or a specific hospital.',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.emergency),
                      onPressed: _call112,
                      icon: const Icon(Icons.call),
                      label: const Text('Call 112 now'),
                    ),
                  ],
                ),
              ),
            ),
            if (anyChecked)
              Container(
                margin: const EdgeInsets.only(top: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.emergency,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Based on what you selected, call 112 now.',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            const SizedBox(height: 16),
            if (_error != null) ErrorBanner.fromException(_error!, onRetry: _load),
            if (_guides == null && _error == null) const LoadingView(),
            if (_guides != null)
              ..._guides!.map((guide) => Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(guide.title, style: Theme.of(context).textTheme.titleMedium),
                          if (!guide.clinicallyReviewed)
                            const Padding(
                              padding: EdgeInsets.only(top: 4),
                              child: Text(
                                'General guidance, not yet confirmed by a clinical reviewer.',
                                style: TextStyle(fontStyle: FontStyle.italic, fontSize: 12, color: Colors.grey),
                              ),
                            ),
                          const SizedBox(height: 8),
                          ...guide.redFlagSymptoms.map((symptom) => CheckboxListTile(
                                dense: true,
                                contentPadding: EdgeInsets.zero,
                                controlAffinity: ListTileControlAffinity.leading,
                                title: Text(symptom),
                                value: _checkedSymptoms.contains('${guide.id}:$symptom'),
                                onChanged: (checked) {
                                  setState(() {
                                    final key = '${guide.id}:$symptom';
                                    if (checked == true) {
                                      _checkedSymptoms.add(key);
                                    } else {
                                      _checkedSymptoms.remove(key);
                                    }
                                  });
                                },
                              )),
                          const SizedBox(height: 8),
                          Text(guide.guidance),
                        ],
                      ),
                    ),
                  )),
          ],
        ),
      ),
    );
  }
}
