import '../models/diagnostics.dart';
import 'api_client.dart';

class DiagnosticsService {
  DiagnosticsService(this._client);
  final ApiClient _client;

  Future<List<DiagnosticTest>> searchTests(String query, {String? city}) async {
    final result = await _client.get<Map<String, dynamic>>('/diagnostic-tests/search', query: {
      'query': query,
      if (city != null && city.isNotEmpty) 'city': city,
    });
    return (result.data['tests'] as List).map((t) => DiagnosticTest.fromJson(t as Map<String, dynamic>)).toList();
  }

  Future<DiagnosticTest> getTestById(String id) async {
    final result = await _client.get<Map<String, dynamic>>('/diagnostic-tests/$id');
    return DiagnosticTest.fromJson(result.data['test'] as Map<String, dynamic>);
  }

  Future<DiagnosticOrder> createOrder({
    required String labId,
    required List<String> testIds,
    required String collectionMethod,
    Map<String, String>? homeAddress,
    required DateTime preferredDateTime,
  }) async {
    final result = await _client.post<Map<String, dynamic>>('/diagnostic-orders', body: {
      'labId': labId,
      'testIds': testIds,
      'collectionMethod': collectionMethod,
      'homeAddress': ?homeAddress,
      'preferredDateTime': preferredDateTime.toIso8601String(),
    });
    return DiagnosticOrder.fromJson(result.data['order'] as Map<String, dynamic>);
  }

  Future<List<DiagnosticOrder>> listMyOrders() async {
    final result = await _client.get<Map<String, dynamic>>('/diagnostic-orders/mine');
    return (result.data['orders'] as List).map((o) => DiagnosticOrder.fromJson(o as Map<String, dynamic>)).toList();
  }

  Future<DiagnosticOrder> cancelOrder(String id) async {
    final result = await _client.post<Map<String, dynamic>>('/diagnostic-orders/$id/transition', body: {'action': 'cancel'});
    return DiagnosticOrder.fromJson(result.data['order'] as Map<String, dynamic>);
  }

  Future<List<HealthCamp>> searchCamps({String? city}) async {
    final result = await _client.get<Map<String, dynamic>>('/health-camps/search', query: {
      if (city != null && city.isNotEmpty) 'city': city,
    });
    return (result.data['camps'] as List).map((c) => HealthCamp.fromJson(c as Map<String, dynamic>)).toList();
  }

  Future<void> registerForCamp(String campId) async {
    await _client.post<Map<String, dynamic>>('/health-camps/$campId/register');
  }

  Future<void> cancelCampRegistration(String campId) async {
    await _client.post<Map<String, dynamic>>('/health-camps/$campId/cancel-registration');
  }

  Future<List<CampRegistration>> listMyCampRegistrations() async {
    final result = await _client.get<Map<String, dynamic>>('/health-camps/registrations/mine');
    return (result.data['registrations'] as List)
        .map((r) => CampRegistration.fromJson(r as Map<String, dynamic>))
        .toList();
  }
}
