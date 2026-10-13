import '../models/emergency_guide.dart';
import 'api_client.dart';

class EmergencyService {
  EmergencyService(this._client);
  final ApiClient _client;

  Future<List<EmergencyGuide>> listGuides() async {
    final result = await _client.get<Map<String, dynamic>>('/emergency/guides');
    return (result.data['guides'] as List)
        .map((g) => EmergencyGuide.fromJson(g as Map<String, dynamic>))
        .toList();
  }
}
