import '../models/medical_records.dart';
import 'api_client.dart';

class MedicalRecordsService {
  MedicalRecordsService(this._client);
  final ApiClient _client;

  Future<MedicalProfile?> getProfile(String patientId) async {
    final result = await _client.get<Map<String, dynamic>>('/medical-records/$patientId/profile');
    final profile = result.data['profile'];
    return profile == null ? null : MedicalProfile.fromJson(profile as Map<String, dynamic>);
  }

  Future<MedicalProfile> updateProfile(
    String patientId, {
    String? bloodType,
    List<String>? allergies,
    List<String>? chronicConditions,
    List<String>? currentMedications,
  }) async {
    final result = await _client.patch<Map<String, dynamic>>('/medical-records/$patientId/profile', body: {
      'bloodType': ?bloodType,
      'allergies': ?allergies,
      'chronicConditions': ?chronicConditions,
      'currentMedications': ?currentMedications,
    });
    return MedicalProfile.fromJson(result.data['profile'] as Map<String, dynamic>);
  }

  Future<List<MedicalDocument>> listDocuments(String patientId) async {
    final result = await _client.get<Map<String, dynamic>>('/medical-records/$patientId/documents');
    return (result.data['documents'] as List).map((d) => MedicalDocument.fromJson(d as Map<String, dynamic>)).toList();
  }

  Future<List<VisitRecord>> listVisits(String patientId) async {
    final result = await _client.get<Map<String, dynamic>>('/medical-records/$patientId/visits');
    return (result.data['visits'] as List).map((v) => VisitRecord.fromJson(v as Map<String, dynamic>)).toList();
  }

  Future<VisitRecord> createVisit(String patientId, {required String visitDate, required String reasonForVisit, String? notes}) async {
    final result = await _client.post<Map<String, dynamic>>('/medical-records/$patientId/visits', body: {
      'visitDate': visitDate,
      'reasonForVisit': reasonForVisit,
      'notes': ?notes,
    });
    return VisitRecord.fromJson(result.data['visit'] as Map<String, dynamic>);
  }

  Future<CaregiverGrant> inviteCaregiver({required String caregiverEmail, required List<String> scopes}) async {
    final result = await _client.post<Map<String, dynamic>>('/medical-records/caregivers', body: {
      'caregiverEmail': caregiverEmail,
      'scopes': scopes,
    });
    return CaregiverGrant.fromJson(result.data['grant'] as Map<String, dynamic>);
  }

  Future<List<CaregiverGrant>> listMyGrants() async {
    final result = await _client.get<Map<String, dynamic>>('/medical-records/caregivers');
    return (result.data['grants'] as List).map((g) => CaregiverGrant.fromJson(g as Map<String, dynamic>)).toList();
  }

  Future<void> revokeGrant(String grantId) async {
    await _client.post<Map<String, dynamic>>('/medical-records/caregivers/$grantId/revoke');
  }

  Future<List<CaregiverGrant>> listInvitesToMe() async {
    final result = await _client.get<Map<String, dynamic>>('/medical-records/caregiver-invites');
    return (result.data['grants'] as List).map((g) => CaregiverGrant.fromJson(g as Map<String, dynamic>)).toList();
  }

  Future<CaregiverGrant> acceptInvite(String grantId) async {
    final result = await _client.post<Map<String, dynamic>>('/medical-records/caregiver-invites/$grantId/accept');
    return CaregiverGrant.fromJson(result.data['grant'] as Map<String, dynamic>);
  }

  Future<CaregiverGrant> declineInvite(String grantId) async {
    final result = await _client.post<Map<String, dynamic>>('/medical-records/caregiver-invites/$grantId/decline');
    return CaregiverGrant.fromJson(result.data['grant'] as Map<String, dynamic>);
  }
}
