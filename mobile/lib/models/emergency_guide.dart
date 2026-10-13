class EmergencyGuide {
  final String id;
  final String title;
  final List<String> redFlagSymptoms;
  final String guidance;
  final bool clinicallyReviewed;

  const EmergencyGuide({
    required this.id,
    required this.title,
    required this.redFlagSymptoms,
    required this.guidance,
    required this.clinicallyReviewed,
  });

  factory EmergencyGuide.fromJson(Map<String, dynamic> json) => EmergencyGuide(
        id: json['id'] as String,
        title: json['title'] as String,
        redFlagSymptoms: (json['redFlagSymptoms'] as List).cast<String>(),
        guidance: json['guidance'] as String,
        clinicallyReviewed: json['clinicallyReviewed'] as bool,
      );
}
