import '../models/scheduling.dart';
import 'api_client.dart';

class SchedulingService {
  SchedulingService(this._client);
  final ApiClient _client;

  Future<List<Slot>> listAvailableSlots(String providerId) async {
    final result = await _client.get<Map<String, dynamic>>('/providers/applications/$providerId/slots/available');
    return (result.data['slots'] as List).map((s) => Slot.fromJson(s as Map<String, dynamic>)).toList();
  }

  Future<Appointment> bookAppointment(String slotId) async {
    final result = await _client.post<Map<String, dynamic>>('/appointments', body: {'slotId': slotId});
    return Appointment.fromJson(result.data['appointment'] as Map<String, dynamic>);
  }

  Future<Appointment> cancelAppointment(String id) async {
    final result = await _client.post<Map<String, dynamic>>('/appointments/$id/cancel');
    return Appointment.fromJson(result.data['appointment'] as Map<String, dynamic>);
  }

  Future<List<Appointment>> listMyAppointments() async {
    final result = await _client.get<Map<String, dynamic>>('/appointments/mine');
    return (result.data['appointments'] as List).map((a) => Appointment.fromJson(a as Map<String, dynamic>)).toList();
  }
}
