import 'provider.dart';

class Medicine {
  final String id;
  final String pharmacyId;
  final String name;
  final String genericName;
  final String activeIngredient;
  final String strength;
  final String dosageForm;
  final String? manufacturer;
  final double unitPrice;
  final int stockQuantity;
  final bool requiresPrescription;
  final bool isActive;

  const Medicine({
    required this.id,
    required this.pharmacyId,
    required this.name,
    required this.genericName,
    required this.activeIngredient,
    required this.strength,
    required this.dosageForm,
    this.manufacturer,
    required this.unitPrice,
    required this.stockQuantity,
    required this.requiresPrescription,
    required this.isActive,
  });

  factory Medicine.fromJson(Map<String, dynamic> json) => Medicine(
        id: json['id'] as String,
        pharmacyId: json['pharmacyId'] as String,
        name: json['name'] as String,
        genericName: json['genericName'] as String,
        activeIngredient: json['activeIngredient'] as String,
        strength: json['strength'] as String,
        dosageForm: json['dosageForm'] as String,
        manufacturer: json['manufacturer'] as String?,
        unitPrice: (json['unitPrice'] as num).toDouble(),
        stockQuantity: json['stockQuantity'] as int,
        requiresPrescription: json['requiresPrescription'] as bool,
        isActive: json['isActive'] as bool,
      );
}

class OrderItem {
  final String medicineItemId;
  final String name;
  final int quantity;
  final double unitPrice;

  const OrderItem({required this.medicineItemId, required this.name, required this.quantity, required this.unitPrice});

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        medicineItemId: json['medicineItemId'] as String,
        name: json['name'] as String,
        quantity: json['quantity'] as int,
        unitPrice: (json['unitPrice'] as num).toDouble(),
      );
}

class MedicineOrder {
  final String id;
  final String patientId;
  final String pharmacyId;
  final List<OrderItem> items;
  final double totalAmount;
  final bool requiresPrescription;
  final bool hasPrescription;
  final Address deliveryAddress;
  final String status;
  final String createdAt;

  const MedicineOrder({
    required this.id,
    required this.patientId,
    required this.pharmacyId,
    required this.items,
    required this.totalAmount,
    required this.requiresPrescription,
    required this.hasPrescription,
    required this.deliveryAddress,
    required this.status,
    required this.createdAt,
  });

  factory MedicineOrder.fromJson(Map<String, dynamic> json) => MedicineOrder(
        id: json['id'] as String,
        patientId: json['patientId'] as String,
        pharmacyId: json['pharmacyId'] as String,
        items: (json['items'] as List).map((i) => OrderItem.fromJson(i as Map<String, dynamic>)).toList(),
        totalAmount: (json['totalAmount'] as num).toDouble(),
        requiresPrescription: json['requiresPrescription'] as bool,
        hasPrescription: json['hasPrescription'] as bool,
        deliveryAddress: Address.fromJson(json['deliveryAddress'] as Map<String, dynamic>),
        status: json['status'] as String,
        createdAt: json['createdAt'] as String,
      );
}
