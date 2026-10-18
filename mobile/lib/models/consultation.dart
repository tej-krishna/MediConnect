class ConsultationDoctorSummary {
  final String organizationName;
  final String providerType;
  final Map<String, dynamic> typeDetails;

  const ConsultationDoctorSummary({required this.organizationName, required this.providerType, required this.typeDetails});

  factory ConsultationDoctorSummary.fromJson(Map<String, dynamic> json) => ConsultationDoctorSummary(
        organizationName: json['organizationName'] as String,
        providerType: json['providerType'] as String,
        typeDetails: (json['typeDetails'] as Map?)?.cast<String, dynamic>() ?? const {},
      );

  String? get specialization => typeDetails['specialization'] as String?;
}

class ConsultationAddress {
  final String line1;
  final String city;
  final String state;
  final String postalCode;

  const ConsultationAddress({required this.line1, required this.city, required this.state, required this.postalCode});

  factory ConsultationAddress.fromJson(Map<String, dynamic> json) => ConsultationAddress(
        line1: json['line1'] as String,
        city: json['city'] as String,
        state: json['state'] as String,
        postalCode: json['postalCode'] as String,
      );

  Map<String, dynamic> toJson() => {'line1': line1, 'city': city, 'state': state, 'postalCode': postalCode};
}

class GeoCheckIn {
  final double lat;
  final double lng;
  final String at;

  const GeoCheckIn({required this.lat, required this.lng, required this.at});

  factory GeoCheckIn.fromJson(Map<String, dynamic> json) =>
      GeoCheckIn(lat: (json['lat'] as num).toDouble(), lng: (json['lng'] as num).toDouble(), at: json['at'] as String);
}

class Consultation {
  final String id;
  final String patientId;
  final String doctorId;
  final ConsultationDoctorSummary? doctor;
  final String visitType; // 'online' | 'home_visit'
  final ConsultationAddress? homeVisitAddress;
  final String preferredDateTime;
  final String? confirmedDateTime;
  final String status; // 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  final GeoCheckIn? doctorCheckIn;
  final GeoCheckIn? patientCheckIn;

  const Consultation({
    required this.id,
    required this.patientId,
    required this.doctorId,
    this.doctor,
    required this.visitType,
    this.homeVisitAddress,
    required this.preferredDateTime,
    this.confirmedDateTime,
    required this.status,
    this.doctorCheckIn,
    this.patientCheckIn,
  });

  factory Consultation.fromJson(Map<String, dynamic> json) => Consultation(
        id: json['id'] as String,
        patientId: json['patientId'] as String,
        doctorId: json['doctorId'] as String,
        doctor: json['doctor'] == null ? null : ConsultationDoctorSummary.fromJson(json['doctor'] as Map<String, dynamic>),
        visitType: json['visitType'] as String,
        homeVisitAddress: json['homeVisitAddress'] == null
            ? null
            : ConsultationAddress.fromJson(json['homeVisitAddress'] as Map<String, dynamic>),
        preferredDateTime: json['preferredDateTime'] as String,
        confirmedDateTime: json['confirmedDateTime'] as String?,
        status: json['status'] as String,
        doctorCheckIn: json['doctorCheckIn'] == null ? null : GeoCheckIn.fromJson(json['doctorCheckIn'] as Map<String, dynamic>),
        patientCheckIn: json['patientCheckIn'] == null ? null : GeoCheckIn.fromJson(json['patientCheckIn'] as Map<String, dynamic>),
      );
}
