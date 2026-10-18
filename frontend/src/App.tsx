import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider } from './app/AuthContext';
import { UserLocationProvider } from './app/UserLocationContext';
import { ProtectedRoute } from './app/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { ProviderLayout } from './layouts/ProviderLayout';
import { ProviderDashboardProvider } from './pages/provider/ProviderDashboardContext';
import { ProviderOverviewPage } from './pages/provider/ProviderOverviewPage';
import { ProviderInventoryPage } from './pages/provider/ProviderInventoryPage';
import { ProviderOrdersPage } from './pages/provider/ProviderOrdersPage';
import { ProviderReportsPage } from './pages/provider/ProviderReportsPage';
import { ProviderListingPage } from './pages/provider/ProviderListingPage';
import { ProviderConsultationsPage } from './pages/provider/ProviderConsultationsPage';
import { MyConsultationsPage } from './pages/MyConsultationsPage';
import { ConsultationCheckInPage } from './pages/ConsultationCheckInPage';
import { VideoCallPage } from './pages/VideoCallPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AccountPage } from './pages/AccountPage';
import { ProviderSearchPage } from './pages/ProviderSearchPage';
import { ProviderDetailPage } from './pages/ProviderDetailPage';
import { BecomeProviderPage } from './pages/BecomeProviderPage';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage';
import { MedicineSearchPage } from './pages/MedicineSearchPage';
import { MedicineAlternativesPage } from './pages/MedicineAlternativesPage';
import { OrderMedicinePage } from './pages/OrderMedicinePage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { DiagnosticTestSearchPage } from './pages/DiagnosticTestSearchPage';
import { OrderTestPage } from './pages/OrderTestPage';
import { MyDiagnosticOrdersPage } from './pages/MyDiagnosticOrdersPage';
import { HealthCampSearchPage } from './pages/HealthCampSearchPage';
import { MyCampRegistrationsPage } from './pages/MyCampRegistrationsPage';
import { EmergencyPage } from './pages/EmergencyPage';
import { AdminEmergencyGuidesPage } from './pages/AdminEmergencyGuidesPage';
import { MedicalRecordPage } from './pages/MedicalRecordPage';
import { CaregiverInvitesPage } from './pages/CaregiverInvitesPage';
import { HomeCareSearchPage } from './pages/HomeCareSearchPage';
import { BookCareOfferingPage } from './pages/BookCareOfferingPage';
import { MyCareRequestsPage } from './pages/MyCareRequestsPage';
import { BecomeDeliveryPartnerPage } from './pages/BecomeDeliveryPartnerPage';
import { MyDeliveriesPage } from './pages/MyDeliveriesPage';
import { AdminDeliveryPartnersPage } from './pages/AdminDeliveryPartnersPage';
import { SupportPage } from './pages/SupportPage';
import { SupportTicketDetailPage } from './pages/SupportTicketDetailPage';
import { AdminSupportTicketsPage } from './pages/AdminSupportTicketsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminProviderApplicationsPage } from './pages/AdminProviderApplicationsPage';
import { AdminProviderApplicationDetailPage } from './pages/AdminProviderApplicationDetailPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';
import { AdminAuditLogPage } from './pages/AdminAuditLogPage';
import { AdminTransactionsPage } from './pages/AdminTransactionsPage';
import { ContactPage } from './pages/ContactPage';
import { HelpPage } from './pages/HelpPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';

function LegacyProviderDashboardRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/provider/${id}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserLocationProvider>
          <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="providers" element={<ProviderSearchPage />} />
            <Route path="providers/:id" element={<ProviderDetailPage />} />
            <Route path="medicines" element={<MedicineSearchPage />} />
            <Route path="medicines/:id/alternatives" element={<MedicineAlternativesPage />} />
            <Route path="diagnostic-tests" element={<DiagnosticTestSearchPage />} />
            <Route path="health-camps" element={<HealthCampSearchPage />} />
            <Route path="home-care" element={<HomeCareSearchPage />} />
            <Route path="emergency" element={<EmergencyPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="account" element={<AccountPage />} />
              <Route path="become-provider" element={<BecomeProviderPage />} />
              <Route path="dashboard/providers/:id" element={<LegacyProviderDashboardRedirect />} />
              <Route path="appointments" element={<MyAppointmentsPage />} />
              <Route path="consultations" element={<MyConsultationsPage />} />
              <Route path="consultations/:id/check-in" element={<ConsultationCheckInPage />} />
              <Route path="medicines/:id/order" element={<OrderMedicinePage />} />
              <Route path="orders" element={<MyOrdersPage />} />
              <Route path="diagnostic-tests/:id/order" element={<OrderTestPage />} />
              <Route path="diagnostic-orders" element={<MyDiagnosticOrdersPage />} />
              <Route path="my-camps" element={<MyCampRegistrationsPage />} />
              <Route path="admin/emergency-guides" element={<AdminEmergencyGuidesPage />} />
              <Route path="medical-records" element={<MedicalRecordPage />} />
              <Route path="medical-records/:patientId" element={<MedicalRecordPage />} />
              <Route path="caregiver-invites" element={<CaregiverInvitesPage />} />
              <Route path="home-care/:id/book" element={<BookCareOfferingPage />} />
              <Route path="my-care-requests" element={<MyCareRequestsPage />} />
              <Route path="become-delivery-partner" element={<BecomeDeliveryPartnerPage />} />
              <Route path="my-deliveries" element={<MyDeliveriesPage />} />
              <Route path="admin/delivery-partners" element={<AdminDeliveryPartnersPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="support/:id" element={<SupportTicketDetailPage />} />
              <Route path="admin/support-tickets" element={<AdminSupportTicketsPage />} />
              <Route path="admin" element={<AdminDashboardPage />} />
              <Route path="admin/provider-applications" element={<AdminProviderApplicationsPage />} />
              <Route path="providers/applications/:id/review" element={<AdminProviderApplicationDetailPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="admin/audit-log" element={<AdminAuditLogPage />} />
              <Route path="admin/transactions" element={<AdminTransactionsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route
              path="provider/:id"
              element={
                <ProviderDashboardProvider>
                  <ProviderLayout />
                </ProviderDashboardProvider>
              }
            >
              <Route index element={<ProviderOverviewPage />} />
              <Route path="inventory" element={<ProviderInventoryPage />} />
              <Route path="orders" element={<ProviderOrdersPage />} />
              <Route path="reports" element={<ProviderReportsPage />} />
              <Route path="listing" element={<ProviderListingPage />} />
              <Route path="consultations" element={<ProviderConsultationsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="consultations/:id/call" element={<VideoCallPage />} />
          </Route>
        </Routes>
        </UserLocationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
