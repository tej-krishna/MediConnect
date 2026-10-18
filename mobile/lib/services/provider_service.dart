import '../models/provider.dart';
import 'api_client.dart';

class ProviderService {
  ProviderService(this._client);
  final ApiClient _client;

  Future<List<PublicProvider>> search({double? lat, double? lng, double? radiusKm, String? city, String? providerType}) async {
    final query = <String, dynamic>{
      'lat': ?lat,
      'lng': ?lng,
      'radiusKm': ?radiusKm,
      if (city != null && city.isNotEmpty) 'city': city,
      if (providerType != null && providerType.isNotEmpty) 'providerType': providerType,
    };
    final result = await _client.get<Map<String, dynamic>>('/providers/search', query: query);
    return (result.data['providers'] as List).map((p) => PublicProvider.fromJson(p as Map<String, dynamic>)).toList();
  }

  Future<PublicProvider> getById(String id) async {
    final result = await _client.get<Map<String, dynamic>>('/providers/search/$id');
    return PublicProvider.fromJson(result.data['provider'] as Map<String, dynamic>);
  }

  /// The logged-in user's own provider applications (any type/status) — used to find a doctor's
  /// own clinic/application id for the doctor-side consultation screens.
  Future<List<OwnerProviderApplication>> listMyApplications() async {
    final result = await _client.get<Map<String, dynamic>>('/providers/applications/mine');
    return (result.data['applications'] as List)
        .map((a) => OwnerProviderApplication.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  Future<OwnerProviderApplication> setConsultationAvailability(
    String id, {
    bool? acceptsOnlineConsultations,
    bool? acceptsHomeVisits,
  }) async {
    final result = await _client.patch<Map<String, dynamic>>(
      '/providers/applications/$id/consultation-availability',
      body: {
        'acceptsOnlineConsultations': ?acceptsOnlineConsultations,
        'acceptsHomeVisits': ?acceptsHomeVisits,
      },
    );
    return OwnerProviderApplication.fromJson(result.data['application'] as Map<String, dynamic>);
  }
}
