import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/medical_records.dart';
import '../../services/api_client.dart';
import '../../services/medical_records_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';

const _allScopes = ['view_profile', 'view_documents', 'view_visits', 'manage_profile'];

class CaregiverInvitesScreen extends StatefulWidget {
  const CaregiverInvitesScreen({super.key});

  @override
  State<CaregiverInvitesScreen> createState() => _CaregiverInvitesScreenState();
}

class _CaregiverInvitesScreenState extends State<CaregiverInvitesScreen> {
  final _service = MedicalRecordsService(ApiClient.instance);
  final _emailController = TextEditingController();
  final Set<String> _selectedScopes = {'view_profile'};

  List<CaregiverGrant>? _invitesToMe;
  List<CaregiverGrant>? _myGrants;
  Object? _error;
  bool _inviting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final results = await Future.wait([_service.listInvitesToMe(), _service.listMyGrants()]);
      if (!mounted) return;
      setState(() {
        _invitesToMe = results[0];
        _myGrants = results[1];
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _invite() async {
    if (_emailController.text.trim().isEmpty || _selectedScopes.isEmpty) return;
    setState(() => _inviting = true);
    try {
      await _service.inviteCaregiver(caregiverEmail: _emailController.text.trim(), scopes: _selectedScopes.toList());
      _emailController.clear();
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _inviting = false);
    }
  }

  Future<void> _accept(String grantId) async {
    try {
      await _service.acceptInvite(grantId);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _decline(String grantId) async {
    try {
      await _service.declineInvite(grantId);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _revoke(String grantId) async {
    try {
      await _service.revokeGrant(grantId);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Caregiver Invites')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_error != null) ErrorBanner.fromException(_error!, onRetry: _load),
            Text('Invite a caregiver', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            TextField(controller: _emailController, decoration: const InputDecoration(labelText: 'Caregiver email')),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _allScopes
                  .map((scope) => FilterChip(
                        label: Text(scope.replaceAll('_', ' ')),
                        selected: _selectedScopes.contains(scope),
                        onSelected: (selected) {
                          setState(() {
                            if (selected) {
                              _selectedScopes.add(scope);
                            } else {
                              _selectedScopes.remove(scope);
                            }
                          });
                        },
                      ))
                  .toList(),
            ),
            const SizedBox(height: 8),
            ElevatedButton(onPressed: _inviting ? null : _invite, child: Text(_inviting ? 'Inviting…' : 'Send invite')),
            const SizedBox(height: 24),
            Text('Patient records shared with me', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (_invitesToMe == null)
              const LoadingView()
            else if (_invitesToMe!.isEmpty)
              const Text('No invites or active access yet.')
            else
              ..._invitesToMe!.map((g) => Card(
                    child: ListTile(
                      title: Text('Patient ${g.patientId}'),
                      subtitle: Text('${g.status} · Scopes: ${g.scopes.join(', ')}'),
                      onTap: g.status == 'active' ? () => context.push('/medical-records/${g.patientId}') : null,
                      trailing: g.status == 'pending'
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                TextButton(onPressed: () => _accept(g.id), child: const Text('Accept')),
                                TextButton(onPressed: () => _decline(g.id), child: const Text('Decline')),
                              ],
                            )
                          : null,
                    ),
                  )),
            const SizedBox(height: 24),
            Text('Caregivers I granted access to', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (_myGrants == null)
              const LoadingView()
            else if (_myGrants!.isEmpty)
              const Text('No caregiver grants yet.')
            else
              ..._myGrants!.map((g) => Card(
                    child: ListTile(
                      title: Text('Caregiver ${g.caregiverId}'),
                      subtitle: Text('${g.status} · ${g.scopes.join(', ')}'),
                      trailing: (g.status == 'active' || g.status == 'pending')
                          ? TextButton(onPressed: () => _revoke(g.id), child: const Text('Revoke'))
                          : null,
                    ),
                  )),
          ],
        ),
      ),
    );
  }
}
