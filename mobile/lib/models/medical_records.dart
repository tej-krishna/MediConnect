class MedicalProfile {
  final String patientId;
  final String? bloodType;
  final List<String> allergies;
  final List<String> chronicConditions;
  final List<String> currentMedications;
  final String updatedAt;

  const MedicalProfile({
    required this.patientId,
    this.bloodType,
    required this.allergies,
    required this.chronicConditions,
    required this.currentMedications,
    required this.updatedAt,
  });

  factory MedicalProfile.fromJson(Map<String, dynamic> json) => MedicalProfile(
        patientId: json['patientId'] as String,
        bloodType: json['bloodType'] as String?,
        allergies: (json['allergies'] as List).cast<String>(),
        chronicConditions: (json['chronicConditions'] as List).cast<String>(),
        currentMedications: (json['currentMedications'] as List).cast<String>(),
        updatedAt: json['updatedAt'] as String,
      );
}

class MedicalDocument {
  final String id;
  final String patientId;
  final String documentType;
  final String title;
  final String? visitDate;
  final String originalFilename;

  const MedicalDocument({
    required this.id,
    required this.patientId,
    required this.documentType,
    required this.title,
    this.visitDate,
    required this.originalFilename,
  });

  factory MedicalDocument.fromJson(Map<String, dynamic> json) => MedicalDocument(
        id: json['id'] as String,
        patientId: json['patientId'] as String,
        documentType: json['documentType'] as String,
        title: json['title'] as String,
        visitDate: json['visitDate'] as String?,
        originalFilename: json['originalFilename'] as String,
      );
}

class VisitRecord {
  final String id;
  final String patientId;
  final String visitDate;
  final String reasonForVisit;
  final String? notes;

  const VisitRecord({
    required this.id,
    required this.patientId,
    required this.visitDate,
    required this.reasonForVisit,
    this.notes,
  });

  factory VisitRecord.fromJson(Map<String, dynamic> json) => VisitRecord(
        id: json['id'] as String,
        patientId: json['patientId'] as String,
        visitDate: json['visitDate'] as String,
        reasonForVisit: json['reasonForVisit'] as String,
        notes: json['notes'] as String?,
      );
}

class CaregiverGrant {
  final String id;
  final String patientId;
  final String caregiverId;
  final List<String> scopes;
  final String status;
  final String? expiresAt;
  final String invitedAt;

  const CaregiverGrant({
    required this.id,
    required this.patientId,
    required this.caregiverId,
    required this.scopes,
    required this.status,
    this.expiresAt,
    required this.invitedAt,
  });

  factory CaregiverGrant.fromJson(Map<String, dynamic> json) => CaregiverGrant(
        id: json['id'] as String,
        patientId: json['patientId'] as String,
        caregiverId: json['caregiverId'] as String,
        scopes: (json['scopes'] as List).cast<String>(),
        status: json['status'] as String,
        expiresAt: json['expiresAt'] as String?,
        invitedAt: json['invitedAt'] as String,
      );
}
