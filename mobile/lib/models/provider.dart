import 'package:flutter/material.dart';

class Address {
  final String line1;
  final String city;
  final String state;
  final String postalCode;

  const Address({required this.line1, required this.city, required this.state, required this.postalCode});

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        line1: json['line1'] as String,
        city: json['city'] as String,
        state: json['state'] as String,
        postalCode: json['postalCode'] as String,
      );

  @override
  String toString() => '$line1, $city, $state $postalCode';
}

/// Public discovery shape only — deliberately excludes registrationNumber/contactEmail/documents,
/// same fields the website's own PublicProvider type never carries (see provider.controller.ts's
/// toPublicListing, which maps a distinct, narrower shape than the owner/admin view).
class PublicProvider {
  final String id;
  final String providerType;
  final String organizationName;
  final String contactPhone;
  final Address address;
  final double? lat;
  final double? lng;
  final double? consultationFee;
  final String? operatingHoursNote;
  final String? verifiedAt;
  final bool? isCurrentlyAvailable;
  final double? distanceMeters;
  final Map<String, dynamic> typeDetails;

  const PublicProvider({
    required this.id,
    required this.providerType,
    required this.organizationName,
    required this.contactPhone,
    required this.address,
    this.lat,
    this.lng,
    this.consultationFee,
    this.operatingHoursNote,
    this.verifiedAt,
    this.isCurrentlyAvailable,
    this.distanceMeters,
    this.typeDetails = const {},
  });

  /// e.g. a doctor's free-text specialization — the backend has no dedicated field for it, just
  /// `typeDetails.specialization` (see provider.validation.ts's per-type typeDetails union).
  String? get specialization => typeDetails['specialization'] as String?;

  factory PublicProvider.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>?;
    return PublicProvider(
      id: json['id'] as String,
      providerType: json['providerType'] as String,
      organizationName: json['organizationName'] as String,
      contactPhone: json['contactPhone'] as String,
      address: Address.fromJson(json['address'] as Map<String, dynamic>),
      lat: location == null ? null : (location['lat'] as num).toDouble(),
      lng: location == null ? null : (location['lng'] as num).toDouble(),
      consultationFee: (json['consultationFee'] as num?)?.toDouble(),
      operatingHoursNote: json['operatingHoursNote'] as String?,
      verifiedAt: json['verifiedAt'] as String?,
      isCurrentlyAvailable: json['isCurrentlyAvailable'] as bool?,
      distanceMeters: (json['distanceMeters'] as num?)?.toDouble(),
      typeDetails: (json['typeDetails'] as Map?)?.cast<String, dynamic>() ?? const {},
    );
  }
}

const providerTypeIcons = <String, IconData>{
  'doctor': Icons.medical_services_outlined,
  'hospital': Icons.local_hospital_outlined,
  'clinic': Icons.local_hospital_outlined,
  'pharmacy': Icons.medication_outlined,
  'diagnostic_lab': Icons.biotech_outlined,
  'ambulance_provider': Icons.emergency_outlined,
  'equipment_provider': Icons.accessible_outlined,
  'mobile_van_operator': Icons.directions_bus_outlined,
  'ngo_coordinator': Icons.volunteer_activism_outlined,
  'insurance_provider': Icons.shield_outlined,
};

const providerTypeLabels = <String, String>{
  'doctor': 'Doctor',
  'hospital': 'Hospital',
  'clinic': 'Clinic',
  'pharmacy': 'Pharmacy',
  'diagnostic_lab': 'Diagnostic Lab',
  'ambulance_provider': 'Ambulance Service',
  'equipment_provider': 'Medical Equipment',
  'mobile_van_operator': 'Mobile Medical Van',
  'ngo_coordinator': 'NGO / Health Camp',
  'insurance_provider': 'Insurance Provider',
};
