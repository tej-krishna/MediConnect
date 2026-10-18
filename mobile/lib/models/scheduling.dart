class Slot {
  final String id;
  final String providerId;
  final String startTime;
  final String endTime;
  final int capacity;
  final int bookedCount;
  final int remaining;
  final String status;

  const Slot({
    required this.id,
    required this.providerId,
    required this.startTime,
    required this.endTime,
    required this.capacity,
    required this.bookedCount,
    required this.remaining,
    required this.status,
  });

  factory Slot.fromJson(Map<String, dynamic> json) => Slot(
        id: json['id'] as String,
        providerId: json['providerId'] as String,
        startTime: json['startTime'] as String,
        endTime: json['endTime'] as String,
        capacity: json['capacity'] as int,
        bookedCount: json['bookedCount'] as int,
        remaining: json['remaining'] as int,
        status: json['status'] as String,
      );
}

/// Only present on GET /appointments/mine (the backend populates providerId/slotId there so the
/// Home screen's "Upcoming appointments" card can show a name and time without a round trip per
/// appointment) — never on the provider-side listing.
class AppointmentProviderSummary {
  final String organizationName;
  final String providerType;
  final Map<String, dynamic> typeDetails;

  const AppointmentProviderSummary({required this.organizationName, required this.providerType, required this.typeDetails});

  factory AppointmentProviderSummary.fromJson(Map<String, dynamic> json) => AppointmentProviderSummary(
        organizationName: json['organizationName'] as String,
        providerType: json['providerType'] as String,
        typeDetails: (json['typeDetails'] as Map?)?.cast<String, dynamic>() ?? const {},
      );
}

class AppointmentSlotSummary {
  final String startTime;
  final String endTime;

  const AppointmentSlotSummary({required this.startTime, required this.endTime});

  factory AppointmentSlotSummary.fromJson(Map<String, dynamic> json) =>
      AppointmentSlotSummary(startTime: json['startTime'] as String, endTime: json['endTime'] as String);
}

class Appointment {
  final String id;
  final String slotId;
  final String providerId;
  final String patientId;
  final String status;
  final String bookedAt;
  final String? cancelledAt;
  final AppointmentProviderSummary? provider;
  final AppointmentSlotSummary? slot;

  const Appointment({
    required this.id,
    required this.slotId,
    required this.providerId,
    required this.patientId,
    required this.status,
    required this.bookedAt,
    this.cancelledAt,
    this.provider,
    this.slot,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) => Appointment(
        id: json['id'] as String,
        slotId: json['slotId'] as String,
        providerId: json['providerId'] as String,
        patientId: json['patientId'] as String,
        status: json['status'] as String,
        bookedAt: json['bookedAt'] as String,
        cancelledAt: json['cancelledAt'] as String?,
        provider: json['provider'] == null ? null : AppointmentProviderSummary.fromJson(json['provider'] as Map<String, dynamic>),
        slot: json['slot'] == null ? null : AppointmentSlotSummary.fromJson(json['slot'] as Map<String, dynamic>),
      );
}
