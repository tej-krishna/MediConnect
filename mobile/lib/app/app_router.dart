import 'package:go_router/go_router.dart';
import '../screens/account/account_screen.dart';
import '../screens/appointments/my_appointments_screen.dart';
import '../screens/auth/forgot_password_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/reset_password_screen.dart';
import '../screens/auth/splash_screen.dart';
import '../screens/diagnostics/diagnostic_test_search_screen.dart';
import '../screens/diagnostics/health_camp_search_screen.dart';
import '../screens/diagnostics/my_camp_registrations_screen.dart';
import '../screens/diagnostics/my_diagnostic_orders_screen.dart';
import '../screens/diagnostics/order_test_screen.dart';
import '../screens/emergency/emergency_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/medical_records/caregiver_invites_screen.dart';
import '../screens/medical_records/medical_record_screen.dart';
import '../screens/pharmacy/medicine_search_screen.dart';
import '../screens/pharmacy/my_orders_screen.dart';
import '../screens/pharmacy/order_medicine_screen.dart';
import '../screens/providers/provider_detail_screen.dart';
import '../screens/providers/provider_search_screen.dart';
import 'auth_provider.dart';

/// Only accessible while signed out — a logged-in user hitting /login shouldn't see the login
/// form again, they should land on the home screen instead (mirrors the website's ProtectedRoute
/// doing the reverse for authenticated-only routes).
const _authOnlyPaths = {'/login', '/register', '/forgot-password', '/reset-password'};

/// Reachable regardless of auth status, never redirected away in either direction — matches
/// exactly the routes the website registers outside its `ProtectedRoute` wrapper (public
/// discovery/browsing pages, plus /emergency, which the website also never gates behind login on
/// principle: an emergency shouldn't have a login wall).
bool _isAlwaysPublic(String path) {
  const exact = {'/emergency', '/providers', '/medicines', '/diagnostic-tests', '/health-camps', '/home-care'};
  if (exact.contains(path)) return true;
  // Only the provider detail view is public at a sub-path; booking/ordering sub-paths
  // (/medicines/:id/order, /diagnostic-tests/:id/order) are deliberately NOT included here even
  // though they share a prefix with a public list screen — a naive prefix-only check would wrongly
  // make those protected screens public too.
  return path.startsWith('/providers/');
}

/// Mirrors the website's ProtectedRoute: every route that isn't always-public requires
/// AuthStatus.authenticated, and an unauthenticated visitor hitting one is redirected to /login
/// rather than shown a broken/empty authenticated screen. `refreshListenable: authProvider` means
/// go_router re-evaluates this redirect the moment AuthProvider.init() resolves or logout() fires,
/// not just on navigation — the same "becomes true/false and the UI reacts immediately" behavior
/// the website gets from AuthContext driving React state.
GoRouter buildRouter(AuthProvider authProvider) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: authProvider,
    redirect: (context, state) {
      final path = state.matchedLocation;
      if (authProvider.status == AuthStatus.unknown) {
        return path == '/splash' ? null : '/splash';
      }
      if (path == '/splash') return '/';
      if (_isAlwaysPublic(path)) return null;
      if (!authProvider.isAuthenticated && !_authOnlyPaths.contains(path)) {
        return '/login';
      }
      if (authProvider.isAuthenticated && _authOnlyPaths.contains(path)) {
        return '/';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (context, state) => const ForgotPasswordScreen()),
      GoRoute(path: '/reset-password', builder: (context, state) => const ResetPasswordScreen()),
      GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
      GoRoute(path: '/account', builder: (context, state) => const AccountScreen()),
      GoRoute(path: '/emergency', builder: (context, state) => const EmergencyScreen()),
      GoRoute(path: '/providers', builder: (context, state) => const ProviderSearchScreen()),
      GoRoute(
        path: '/providers/:id',
        builder: (context, state) => ProviderDetailScreen(providerId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/appointments', builder: (context, state) => const MyAppointmentsScreen()),
      GoRoute(path: '/medicines', builder: (context, state) => const MedicineSearchScreen()),
      GoRoute(
        path: '/medicines/:id/order',
        builder: (context, state) => OrderMedicineScreen(medicineId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/orders', builder: (context, state) => const MyOrdersScreen()),
      GoRoute(path: '/diagnostic-tests', builder: (context, state) => const DiagnosticTestSearchScreen()),
      GoRoute(
        path: '/diagnostic-tests/:id/order',
        builder: (context, state) => OrderTestScreen(testId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/diagnostic-orders', builder: (context, state) => const MyDiagnosticOrdersScreen()),
      GoRoute(path: '/health-camps', builder: (context, state) => const HealthCampSearchScreen()),
      GoRoute(path: '/my-camps', builder: (context, state) => const MyCampRegistrationsScreen()),
      GoRoute(path: '/medical-records', builder: (context, state) => const MedicalRecordScreen()),
      GoRoute(
        path: '/medical-records/:patientId',
        builder: (context, state) => MedicalRecordScreen(patientId: state.pathParameters['patientId']!),
      ),
      GoRoute(path: '/caregiver-invites', builder: (context, state) => const CaregiverInvitesScreen()),
    ],
  );
}
