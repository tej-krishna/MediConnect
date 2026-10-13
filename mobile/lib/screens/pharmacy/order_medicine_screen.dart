import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/pharmacy.dart';
import '../../services/api_client.dart';
import '../../services/pharmacy_service.dart';
import '../../widgets/error_banner.dart';

class OrderMedicineScreen extends StatefulWidget {
  const OrderMedicineScreen({super.key, required this.medicineId});
  final String medicineId;

  @override
  State<OrderMedicineScreen> createState() => _OrderMedicineScreenState();
}

class _OrderMedicineScreenState extends State<OrderMedicineScreen> {
  final _service = PharmacyService(ApiClient.instance);
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController(text: '1');
  final _line1Controller = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _postalCodeController = TextEditingController();

  Medicine? _medicine;
  Object? _loadError;
  bool _submitting = false;
  Object? _submitError;
  MedicineOrder? _placedOrder;
  bool _uploadingPrescription = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final medicine = await _service.getById(widget.medicineId);
      if (!mounted) return;
      setState(() => _medicine = medicine);
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadError = e);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _submitError = null;
    });
    try {
      final order = await _service.createOrder(
        pharmacyId: _medicine!.pharmacyId,
        medicineItemId: _medicine!.id,
        quantity: int.tryParse(_quantityController.text) ?? 1,
        deliveryAddress: {
          'line1': _line1Controller.text.trim(),
          'city': _cityController.text.trim(),
          'state': _stateController.text.trim(),
          'postalCode': _postalCodeController.text.trim(),
        },
      );
      if (!mounted) return;
      if (order.status == 'pending_prescription') {
        setState(() => _placedOrder = order);
      } else {
        context.go('/orders');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitError = e);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _uploadPrescription() async {
    final picked = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png']);
    if (picked.isEmpty) return;
    final file = picked.first;
    setState(() {
      _uploadingPrescription = true;
      _submitError = null;
    });
    try {
      final bytes = await file.xFile.readAsBytes();
      await _service.uploadPrescription(_placedOrder!.id, bytes, file.name);
      if (!mounted) return;
      context.go('/orders');
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitError = e);
    } finally {
      if (mounted) setState(() => _uploadingPrescription = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loadError != null && _medicine == null) {
      return Scaffold(body: Padding(padding: const EdgeInsets.all(16), child: ErrorBanner.fromException(_loadError!, onRetry: _load)));
    }
    if (_medicine == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_placedOrder != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Prescription required')),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('${_medicine!.name} requires a prescription. Upload it to complete your order.'),
                const SizedBox(height: 16),
                if (_submitError != null) ErrorBanner.fromException(_submitError!),
                ElevatedButton.icon(
                  onPressed: _uploadingPrescription ? null : _uploadPrescription,
                  icon: const Icon(Icons.upload_file),
                  label: Text(_uploadingPrescription ? 'Uploading…' : 'Choose and upload prescription'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text('Order ${_medicine!.name}')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('₹${_medicine!.unitPrice.toStringAsFixed(0)} each${_medicine!.requiresPrescription ? ' · prescription required' : ''}'),
                const SizedBox(height: 16),
                if (_submitError != null) ErrorBanner.fromException(_submitError!),
                TextFormField(
                  controller: _quantityController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Quantity'),
                  validator: (v) => (v == null || int.tryParse(v) == null || int.parse(v) < 1) ? 'Enter a valid quantity' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _line1Controller,
                  decoration: const InputDecoration(labelText: 'Delivery address'),
                  validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _cityController,
                  decoration: const InputDecoration(labelText: 'City'),
                  validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _stateController,
                  decoration: const InputDecoration(labelText: 'State'),
                  validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _postalCodeController,
                  decoration: const InputDecoration(labelText: 'Postal code'),
                  validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: Text(_submitting ? 'Placing order…' : 'Place order'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
