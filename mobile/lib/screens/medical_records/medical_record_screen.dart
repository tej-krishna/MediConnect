import 'package:flutter/material.dart';
import '../../models/medical_records.dart';
import '../../services/api_client.dart';
import '../../services/medical_records_service.dart';
import '../../widgets/error_banner.dart';

/// `patientId` defaults to "me"; a caregiver reaches someone else's record at
/// /medical-records/:patientId with whatever scope they were granted — see the backend's
/// medicalRecords.access.ts, the one authorization gate every read/write in this module goes
/// through. Each section (profile/documents/visits) loads and fails independently, the same
/// `Promise.allSettled` reasoning the website's MedicalRecordPage uses: a caregiver missing one
/// scope shouldn't break the whole page, just that one section.
class MedicalRecordScreen extends StatefulWidget {
  const MedicalRecordScreen({super.key, this.patientId = 'me'});
  final String patientId;

  @override
  State<MedicalRecordScreen> createState() => _MedicalRecordScreenState();
}

class _MedicalRecordScreenState extends State<MedicalRecordScreen> {
  final _service = MedicalRecordsService(ApiClient.instance);

  MedicalProfile? _profile;
  Object? _profileError;
  List<MedicalDocument>? _documents;
  Object? _documentsError;
  List<VisitRecord>? _visits;
  Object? _visitsError;

  final _bloodTypeController = TextEditingController();
  final _allergiesController = TextEditingController();
  final _conditionsController = TextEditingController();
  final _medicationsController = TextEditingController();
  bool _savingProfile = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  bool get _isSelf => widget.patientId == 'me';

  Future<void> _load() async {
    await Future.wait([_loadProfile(), _loadDocuments(), _loadVisits()]);
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await _service.getProfile(widget.patientId);
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _profileError = null;
        _bloodTypeController.text = profile?.bloodType ?? '';
        _allergiesController.text = profile?.allergies.join(', ') ?? '';
        _conditionsController.text = profile?.chronicConditions.join(', ') ?? '';
        _medicationsController.text = profile?.currentMedications.join(', ') ?? '';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _profileError = e);
    }
  }

  Future<void> _loadDocuments() async {
    try {
      final documents = await _service.listDocuments(widget.patientId);
      if (!mounted) return;
      setState(() {
        _documents = documents;
        _documentsError = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _documentsError = e);
    }
  }

  Future<void> _loadVisits() async {
    try {
      final visits = await _service.listVisits(widget.patientId);
      if (!mounted) return;
      setState(() {
        _visits = visits;
        _visitsError = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _visitsError = e);
    }
  }

  List<String> _splitCsv(String text) => text.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();

  Future<void> _saveProfile() async {
    setState(() => _savingProfile = true);
    try {
      await _service.updateProfile(
        widget.patientId,
        bloodType: _bloodTypeController.text.trim().isEmpty ? null : _bloodTypeController.text.trim(),
        allergies: _splitCsv(_allergiesController.text),
        chronicConditions: _splitCsv(_conditionsController.text),
        currentMedications: _splitCsv(_medicationsController.text),
      );
      await _loadProfile();
    } catch (e) {
      if (!mounted) return;
      setState(() => _profileError = e);
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canEditProfile = _isSelf; // manage_profile-scoped caregiver editing is deferred — see
    // ARCHITECTURE.md's Phase 14 notes; this mobile build covers the patient's own full read/write
    // access plus a caregiver's read access, not yet a caregiver's own write access.
    return Scaffold(
      appBar: AppBar(title: const Text('Medical Record')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Profile', style: Theme.of(context).textTheme.titleMedium),
              if (_profile != null)
                Text('Last updated ${_profile!.updatedAt}', style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 8),
              if (_profileError != null) ErrorBanner.fromException(_profileError!, onRetry: _loadProfile),
              if (_profileError == null)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          controller: _bloodTypeController,
                          enabled: canEditProfile,
                          decoration: const InputDecoration(labelText: 'Blood type'),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _allergiesController,
                          enabled: canEditProfile,
                          decoration: const InputDecoration(labelText: 'Allergies (comma-separated)'),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _conditionsController,
                          enabled: canEditProfile,
                          decoration: const InputDecoration(labelText: 'Chronic conditions (comma-separated)'),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _medicationsController,
                          enabled: canEditProfile,
                          decoration: const InputDecoration(labelText: 'Current medications (comma-separated)'),
                        ),
                        if (canEditProfile) ...[
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: _savingProfile ? null : _saveProfile,
                            child: Text(_savingProfile ? 'Saving…' : 'Save profile'),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 20),
              Text('Documents', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              if (_documentsError != null) ErrorBanner.fromException(_documentsError!, onRetry: _loadDocuments),
              if (_documents != null)
                _documents!.isEmpty
                    ? const Text('No documents uploaded yet.')
                    : Column(
                        children: _documents!
                            .map((d) => Card(
                                  child: ListTile(
                                    title: Text(d.title),
                                    subtitle: Text('${d.documentType.replaceAll('_', ' ')} · ${d.originalFilename}'),
                                  ),
                                ))
                            .toList(),
                      ),
              const SizedBox(height: 20),
              Text('Visits', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              if (_visitsError != null) ErrorBanner.fromException(_visitsError!, onRetry: _loadVisits),
              if (_visits != null)
                _visits!.isEmpty
                    ? const Text('No visits logged yet.')
                    : Column(
                        children: _visits!
                            .map((v) => Card(
                                  child: ListTile(
                                    title: Text(v.reasonForVisit),
                                    subtitle: Text('${v.visitDate}${v.notes != null ? '\n${v.notes}' : ''}'),
                                    isThreeLine: v.notes != null,
                                  ),
                                ))
                            .toList(),
                      ),
            ],
          ),
        ),
      ),
    );
  }
}
