import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/diagnostics.dart';
import '../../services/api_client.dart';
import '../../services/diagnostics_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';

class OrderTestScreen extends StatefulWidget {
  const OrderTestScreen({super.key, required this.testId});
  final String testId;

  @override
  State<OrderTestScreen> createState() => _OrderTestScreenState();
}

class _OrderTestScreenState extends State<OrderTestScreen> {
  final _service = DiagnosticsService(ApiClient.instance);
  final _formKey = GlobalKey<FormState>();
  final _line1Controller = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _postalCodeController = TextEditingController();

  DiagnosticTest? _test;
  Object? _loadError;
  String _collectionMethod = 'at_lab';
  DateTime? _preferredDateTime;
  bool _submitting = false;
  Object? _submitError;
  String? _validationMessage;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final test = await _service.getTestById(widget.testId);
      if (!mounted) return;
      setState(() => _test = test);
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadError = e);
    }
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      initialDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
    if (time == null) return;
    setState(() => _preferredDateTime = DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  Future<void> _submit() async {
    if (_collectionMethod == 'home_collection' && !_formKey.currentState!.validate()) return;
    if (_preferredDateTime == null) {
      setState(() => _validationMessage = 'Pick a preferred date and time.');
      return;
    }
    setState(() {
      _submitting = true;
      _submitError = null;
      _validationMessage = null;
    });
    try {
      await _service.createOrder(
        labId: _test!.labId,
        testIds: [_test!.id],
        collectionMethod: _collectionMethod,
        homeAddress: _collectionMethod == 'home_collection'
            ? {
                'line1': _line1Controller.text.trim(),
                'city': _cityController.text.trim(),
                'state': _stateController.text.trim(),
                'postalCode': _postalCodeController.text.trim(),
              }
            : null,
        preferredDateTime: _preferredDateTime!,
      );
      if (!mounted) return;
      context.go('/diagnostic-orders');
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitError = e);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loadError != null && _test == null) {
      return Scaffold(body: Padding(padding: const EdgeInsets.all(16), child: ErrorBanner.fromException(_loadError!, onRetry: _load)));
    }
    if (_test == null) {
      return const Scaffold(body: LoadingView());
    }

    return Scaffold(
      appBar: AppBar(title: Text('Book ${_test!.name}')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('₹${_test!.price.toStringAsFixed(0)} · turnaround ${_test!.turnaroundHours}h'),
                const SizedBox(height: 16),
                if (_validationMessage != null) ErrorBanner(message: _validationMessage!),
                if (_submitError != null) ErrorBanner.fromException(_submitError!),
                DropdownButtonFormField<String>(
                  initialValue: _collectionMethod,
                  decoration: const InputDecoration(labelText: 'Collection method'),
                  items: [
                    const DropdownMenuItem(value: 'at_lab', child: Text('At lab')),
                    if (_test!.homeCollectionAvailable)
                      const DropdownMenuItem(value: 'home_collection', child: Text('Home collection')),
                  ],
                  onChanged: (v) => setState(() => _collectionMethod = v ?? 'at_lab'),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: _pickDateTime,
                  child: Text(_preferredDateTime == null ? 'Pick preferred date & time' : _preferredDateTime.toString()),
                ),
                if (_collectionMethod == 'home_collection') ...[
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _line1Controller,
                    decoration: const InputDecoration(labelText: 'Address'),
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
                ],
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: Text(_submitting ? 'Booking…' : 'Book test'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
