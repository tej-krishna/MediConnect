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

class Appointment {
  final String id;
  final String slotId;
  final String providerId;
  final String patientId;
  final String status;
  final String bookedAt;
  final String? cancelledAt;

  const Appointment({
    required this.id,
    required this.slotId,
    required this.providerId,
    required this.patientId,
    required this.status,
    required this.bookedAt,
    this.cancelledAt,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) => Appointment(
        id: json['id'] as String,
        slotId: json['slotId'] as String,
        providerId: json['providerId'] as String,
        patientId: json['patientId'] as String,
        status: json['status'] as String,
        bookedAt: json['bookedAt'] as String,
        cancelledAt: json['cancelledAt'] as String?,
      );
}
