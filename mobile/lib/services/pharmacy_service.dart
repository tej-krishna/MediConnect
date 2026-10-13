import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../models/pharmacy.dart';
import 'api_client.dart';

class PharmacyService {
  PharmacyService(this._client);
  final ApiClient _client;

  Future<List<Medicine>> search(String query, {String? city}) async {
    final result = await _client.get<Map<String, dynamic>>('/medicines/search', query: {
      'query': query,
      if (city != null && city.isNotEmpty) 'city': city,
    });
    return (result.data['medicines'] as List).map((m) => Medicine.fromJson(m as Map<String, dynamic>)).toList();
  }

  Future<Medicine> getById(String id) async {
    final result = await _client.get<Map<String, dynamic>>('/medicines/$id');
    return Medicine.fromJson(result.data['medicine'] as Map<String, dynamic>);
  }

  Future<MedicineOrder> createOrder({
    required String pharmacyId,
    required String medicineItemId,
    required int quantity,
    required Map<String, String> deliveryAddress,
  }) async {
    final result = await _client.post<Map<String, dynamic>>('/orders', body: {
      'pharmacyId': pharmacyId,
      'items': [
        {'medicineItemId': medicineItemId, 'quantity': quantity}
      ],
      'deliveryAddress': deliveryAddress,
    });
    return MedicineOrder.fromJson(result.data['order'] as Map<String, dynamic>);
  }

  Future<MedicineOrder> uploadPrescription(String orderId, Uint8List bytes, String filename) async {
    final form = FormData.fromMap({
      'prescription': MultipartFile.fromBytes(bytes, filename: filename),
    });
    final result = await _client.postForm<Map<String, dynamic>>('/orders/$orderId/prescription', form);
    return MedicineOrder.fromJson(result.data['order'] as Map<String, dynamic>);
  }

  Future<List<MedicineOrder>> listMyOrders() async {
    final result = await _client.get<Map<String, dynamic>>('/orders/mine');
    return (result.data['orders'] as List).map((o) => MedicineOrder.fromJson(o as Map<String, dynamic>)).toList();
  }

  Future<MedicineOrder> transitionOrder(String orderId, String action) async {
    final result = await _client.post<Map<String, dynamic>>('/orders/$orderId/transition', body: {'action': action});
    return MedicineOrder.fromJson(result.data['order'] as Map<String, dynamic>);
  }
}
