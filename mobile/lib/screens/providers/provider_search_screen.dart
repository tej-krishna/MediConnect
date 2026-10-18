import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/provider.dart';
import '../../services/api_client.dart';
import '../../services/provider_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/provider_list_card.dart';

class ProviderSearchScreen extends StatefulWidget {
  const ProviderSearchScreen({super.key, this.initialProviderType, this.initialQuery});

  final String? initialProviderType;
  final String? initialQuery;

  @override
  State<ProviderSearchScreen> createState() => _ProviderSearchScreenState();
}

class _ProviderSearchScreenState extends State<ProviderSearchScreen> {
  final _service = ProviderService(ApiClient.instance);
  final _cityController = TextEditingController();
  final _queryController = TextEditingController();
  String? _providerType;
  List<PublicProvider>? _results;
  bool _loading = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _providerType = widget.initialProviderType;
    _queryController.text = widget.initialQuery ?? '';
    _search();
  }

  @override
  void dispose() {
    _cityController.dispose();
    _queryController.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      var results = await _service.search(
        city: _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        providerType: _providerType,
      );
      final query = _queryController.text.trim().toLowerCase();
      if (query.isNotEmpty) {
        results = results
            .where((p) => p.organizationName.toLowerCase().contains(query) || (p.specialization ?? '').toLowerCase().contains(query))
            .toList();
      }
      if (!mounted) return;
      setState(() => _results = results);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Find Care')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _queryController,
                decoration: const InputDecoration(hintText: 'Name or specialization', prefixIcon: Icon(Icons.search)),
                onSubmitted: (_) => _search(),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _cityController,
                      decoration: const InputDecoration(hintText: 'City'),
                      onSubmitted: (_) => _search(),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _providerType,
                      decoration: const InputDecoration(hintText: 'Type'),
                      isExpanded: true,
                      items: [
                        const DropdownMenuItem(value: null, child: Text('Any type')),
                        ...providerTypeLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value, overflow: TextOverflow.ellipsis))),
                      ],
                      onChanged: (v) => setState(() => _providerType = v),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(onPressed: _loading ? null : _search, child: Text(_loading ? 'Searching…' : 'Search')),
              ),
              const SizedBox(height: 12),
              if (_error != null) ErrorBanner.fromException(_error!, onRetry: _search),
              Expanded(
                child: _loading
                    ? const LoadingView()
                    : _results == null
                        ? const SizedBox.shrink()
                        : _results!.isEmpty
                            ? const EmptyState(icon: Icons.search_off, message: 'No matching providers found.')
                            : ListView.separated(
                                itemCount: _results!.length,
                                separatorBuilder: (_, _) => const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  final p = _results![index];
                                  return ProviderListCard(provider: p, onTap: () => context.push('/providers/${p.id}'));
                                },
                              ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
