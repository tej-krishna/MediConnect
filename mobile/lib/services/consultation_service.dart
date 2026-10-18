import '../models/consultation.dart';
import 'api_client.dart';

class ConsultationService {
  ConsultationService(this._client);
  final ApiClient _client;

  Future<Consultation> request({
    required String doctorId,
    required String visitType,
    required DateTime preferredDateTime,
    ConsultationAddress? homeVisitAddress,
  }) async {
    final result = await _client.post<Map<String, dynamic>>('/consultations', body: {
      'doctorId': doctorId,
      'visitType': visitType,
      'preferredDateTime': preferredDateTime.toIso8601String(),
      if (homeVisitAddress != null) 'homeVisitAddress': homeVisitAddress.toJson(),
    });
    return Consultation.fromJson(result.data['consultation'] as Map<String, dynamic>);
  }

  Future<List<Consultation>> listMine() async {
    final result = await _client.get<Map<String, dynamic>>('/consultations/mine');
    return (result.data['consultations'] as List).map((c) => Consultation.fromJson(c as Map<String, dynamic>)).toList();
  }

  Future<List<Consultation>> listForDoctor(String doctorId) async {
    final result = await _client.get<Map<String, dynamic>>('/providers/applications/$doctorId/consultations');
    return (result.data['consultations'] as List).map((c) => Consultation.fromJson(c as Map<String, dynamic>)).toList();
  }

  Future<Consultation> getById(String id) async {
    final result = await _client.get<Map<String, dynamic>>('/consultations/$id');
    return Consultation.fromJson(result.data['consultation'] as Map<String, dynamic>);
  }

  Future<Consultation> confirm(String id, DateTime confirmedDateTime) => _transition(id, {
        'action': 'confirm',
        'confirmedDateTime': confirmedDateTime.toIso8601String(),
      });

  Future<Consultation> complete(String id) => _transition(id, {'action': 'complete'});

  Future<Consultation> cancel(String id) => _transition(id, {'action': 'cancel'});

  Future<Consultation> reportNoShow(String id) => _transition(id, {'action': 'report_no_show'});

  Future<Consultation> _transition(String id, Map<String, dynamic> body) async {
    final result = await _client.post<Map<String, dynamic>>('/consultations/$id/transition', body: body);
    return Consultation.fromJson(result.data['consultation'] as Map<String, dynamic>);
  }

  Future<({Consultation consultation, int? distanceMeters, bool withinRange})> checkIn(
    String id, {
    required double lat,
    required double lng,
  }) async {
    final result = await _client.post<Map<String, dynamic>>('/consultations/$id/check-in', body: {'lat': lat, 'lng': lng});
    return (
      consultation: Consultation.fromJson(result.data['consultation'] as Map<String, dynamic>),
      distanceMeters: (result.data['distanceMeters'] as num?)?.round(),
      withinRange: result.data['withinRange'] as bool,
    );
  }
}
