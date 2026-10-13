import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './app/AuthContext';
import { ProtectedRoute } from './app/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AccountPage } from './pages/AccountPage';
import { ProviderSearchPage } from './pages/ProviderSearchPage';
import { ProviderDetailPage } from './pages/ProviderDetailPage';
import { BecomeProviderPage } from './pages/BecomeProviderPage';
import { ProviderDashboardPage } from './pages/ProviderDashboardPage';
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
import { ContactPage } from './pages/ContactPage';
import { HelpPage } from './pages/HelpPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            <Route path="emergency" element={<EmergencyPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="account" element={<AccountPage />} />
              <Route path="become-provider" element={<BecomeProviderPage />} />
              <Route path="dashboard/providers/:id" element={<ProviderDashboardPage />} />
              <Route path="appointments" element={<MyAppointmentsPage />} />
              <Route path="medicines/:id/order" element={<OrderMedicinePage />} />
              <Route path="orders" element={<MyOrdersPage />} />
              <Route path="diagnostic-tests/:id/order" element={<OrderTestPage />} />
              <Route path="diagnostic-orders" element={<MyDiagnosticOrdersPage />} />
              <Route path="my-camps" element={<MyCampRegistrationsPage />} />
              <Route path="admin/emergency-guides" element={<AdminEmergencyGuidesPage />} />
              <Route path="medical-records" element={<MedicalRecordPage />} />
              <Route path="medical-records/:patientId" element={<MedicalRecordPage />} />
              <Route path="caregiver-invites" element={<CaregiverInvitesPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
