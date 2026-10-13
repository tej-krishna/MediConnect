class DiagnosticTest {
  final String id;
  final String labId;
  final String name;
  final String category;
  final String sampleType;
  final double price;
  final int turnaroundHours;
  final bool homeCollectionAvailable;
  final bool isActive;

  const DiagnosticTest({
    required this.id,
    required this.labId,
    required this.name,
    required this.category,
    required this.sampleType,
    required this.price,
    required this.turnaroundHours,
    required this.homeCollectionAvailable,
    required this.isActive,
  });

  factory DiagnosticTest.fromJson(Map<String, dynamic> json) => DiagnosticTest(
        id: json['id'] as String,
        labId: json['labId'] as String,
        name: json['name'] as String,
        category: json['category'] as String,
        sampleType: json['sampleType'] as String,
        price: (json['price'] as num).toDouble(),
        turnaroundHours: json['turnaroundHours'] as int,
        homeCollectionAvailable: json['homeCollectionAvailable'] as bool,
        isActive: json['isActive'] as bool,
      );
}

class DiagnosticOrderTestLine {
  final String testId;
  final String name;
  final double price;

  const DiagnosticOrderTestLine({required this.testId, required this.name, required this.price});

  factory DiagnosticOrderTestLine.fromJson(Map<String, dynamic> json) => DiagnosticOrderTestLine(
        testId: json['testId'] as String,
        name: json['name'] as String,
        price: (json['price'] as num).toDouble(),
      );
}

class DiagnosticOrder {
  final String id;
  final String patientId;
  final String labId;
  final List<DiagnosticOrderTestLine> tests;
  final double totalAmount;
  final String collectionMethod;
  final String preferredDateTime;
  final String? confirmedDateTime;
  final String status;
  final bool hasReport;
  final String createdAt;

  const DiagnosticOrder({
    required this.id,
    required this.patientId,
    required this.labId,
    required this.tests,
    required this.totalAmount,
    required this.collectionMethod,
    required this.preferredDateTime,
    this.confirmedDateTime,
    required this.status,
    required this.hasReport,
    required this.createdAt,
  });

  factory DiagnosticOrder.fromJson(Map<String, dynamic> json) => DiagnosticOrder(
        id: json['id'] as String,
        patientId: json['patientId'] as String,
        labId: json['labId'] as String,
        tests: (json['tests'] as List).map((t) => DiagnosticOrderTestLine.fromJson(t as Map<String, dynamic>)).toList(),
        totalAmount: (json['totalAmount'] as num).toDouble(),
        collectionMethod: json['collectionMethod'] as String,
        preferredDateTime: json['preferredDateTime'] as String,
        confirmedDateTime: json['confirmedDateTime'] as String?,
        status: json['status'] as String,
        hasReport: json['hasReport'] as bool,
        createdAt: json['createdAt'] as String,
      );
}

class HealthCamp {
  final String id;
  final String providerId;
  final String title;
  final String? description;
  final String locationDescription;
  final String scheduledDate;
  final String startTime;
  final String endTime;
  final int capacity;
  final int registeredCount;
  final int remaining;
  final String status;

  const HealthCamp({
    required this.id,
    required this.providerId,
    required this.title,
    this.description,
    required this.locationDescription,
    required this.scheduledDate,
    required this.startTime,
    required this.endTime,
    required this.capacity,
    required this.registeredCount,
    required this.remaining,
    required this.status,
  });

  factory HealthCamp.fromJson(Map<String, dynamic> json) => HealthCamp(
        id: json['id'] as String,
        providerId: json['providerId'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        locationDescription: json['locationDescription'] as String,
        scheduledDate: json['scheduledDate'] as String,
        startTime: json['startTime'] as String,
        endTime: json['endTime'] as String,
        capacity: json['capacity'] as int,
        registeredCount: json['registeredCount'] as int,
        remaining: json['remaining'] as int,
        status: json['status'] as String,
      );
}

class CampRegistration {
  final String campId;
  final String registeredAt;
  final HealthCamp? camp;

  const CampRegistration({required this.campId, required this.registeredAt, this.camp});

  factory CampRegistration.fromJson(Map<String, dynamic> json) => CampRegistration(
        campId: json['campId'] as String,
        registeredAt: json['registeredAt'] as String,
        camp: json['camp'] == null ? null : HealthCamp.fromJson(json['camp'] as Map<String, dynamic>),
      );
}
