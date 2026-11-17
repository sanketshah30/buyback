import { Navigate, Route, Routes } from 'react-router-dom';
import { OfflineGate } from './components/OfflineGate';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './lib/auth';
import { BuybackDraftProvider } from './lib/buybackDraft';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { HistoryDetailPage } from './pages/HistoryDetailPage';
import { NewBuybackPage } from './pages/buyback/NewBuybackPage';
import { AssessmentMethodPage } from './pages/buyback/AssessmentMethodPage';
import { QuestionnairePage } from './pages/buyback/QuestionnairePage';
import { ImageAssessmentPage } from './pages/buyback/ImageAssessmentPage';
import { VideoAssessmentPage } from './pages/buyback/VideoAssessmentPage';
import { ValuationPage } from './pages/buyback/ValuationPage';
import { DiagnosisPage } from './pages/buyback/DiagnosisPage';
import { CustomerInfoPage } from './pages/buyback/CustomerInfoPage';
import { DocumentProofPage } from './pages/buyback/DocumentProofPage';
import { ReviewPage } from './pages/buyback/ReviewPage';
import { SuccessPage } from './pages/buyback/SuccessPage';
import { ReceiptPage } from './pages/buyback/ReceiptPage';
import { AdminRoute } from './components/admin/AdminRoute';
import { AdminShell } from './components/admin/AdminShell';
import { AdminHubPage } from './pages/admin/AdminHubPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { BrandsPage } from './pages/admin/BrandsPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { SkusPage } from './pages/admin/SkusPage';
import { PartnersPage } from './pages/admin/PartnersPage';
import { PartnerLocationsPage } from './pages/admin/PartnerLocationsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { SkuPricingPage } from './pages/admin/SkuPricingPage';
import { DepreciationMatrixPage } from './pages/admin/DepreciationMatrixPage';
import { QuestionsPage } from './pages/admin/QuestionsPage';
import { AnswersPage } from './pages/admin/AnswersPage';
import { QuestionAnswersPage } from './pages/admin/QuestionAnswersPage';
import { QuestionnaireConfigPage } from './pages/admin/QuestionnaireConfigPage';

function App() {
  return (
    <AuthProvider>
      <BuybackDraftProvider>
        <OfflineGate>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/otp" element={<Navigate to="/login" replace />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history/:id"
              element={
                <ProtectedRoute>
                  <HistoryDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Nothing is persisted to the server for these "new buyback" steps until
                the valuation step - see src/lib/buybackDraft.tsx. */}
            <Route
              path="/buyback/new"
              element={
                <ProtectedRoute>
                  <NewBuybackPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyback/new/assessment"
              element={
                <ProtectedRoute>
                  <AssessmentMethodPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyback/new/assessment/questionnaire"
              element={
                <ProtectedRoute>
                  <QuestionnairePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyback/new/assessment/image"
              element={
                <ProtectedRoute>
                  <ImageAssessmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyback/new/assessment/video"
              element={
                <ProtectedRoute>
                  <VideoAssessmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyback/new/valuation"
              element={
                <ProtectedRoute>
                  <ValuationPage />
                </ProtectedRoute>
              }
            />

            {/* From here on a real buyback record exists (created at the valuation step). */}
            <Route
              path="/buyback/:id/valuation"
              element={
                <ProtectedRoute>
                  <ValuationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyback/:id/diagnosis"
              element={
                <ProtectedRoute>
                  <DiagnosisPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyback/:id/customer"
              element={
                <ProtectedRoute>
                  <CustomerInfoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyback/:id/document"
              element={
                <ProtectedRoute>
                  <DocumentProofPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyback/:id/review"
              element={
                <ProtectedRoute>
                  <ReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyback/:id/success"
              element={
                <ProtectedRoute>
                  <SuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyback/:id/receipt"
              element={
                <ProtectedRoute>
                  <ReceiptPage />
                </ProtectedRoute>
              }
            />

            {/* Admin onboarding portal. No resource ids in URLs - records are edited in a drawer. */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminShell />
                </AdminRoute>
              }
            >
              <Route index element={<AdminHubPage />} />
              <Route path="catalog/categories" element={<AdminRoute rights={['manage_catalog']}><CategoriesPage /></AdminRoute>} />
              <Route path="catalog/brands" element={<AdminRoute rights={['manage_catalog']}><BrandsPage /></AdminRoute>} />
              <Route path="catalog/products" element={<AdminRoute rights={['manage_catalog']}><ProductsPage /></AdminRoute>} />
              <Route path="catalog/skus" element={<AdminRoute rights={['manage_catalog']}><SkusPage /></AdminRoute>} />
              <Route path="partners" element={<AdminRoute rights={['manage_partners']}><PartnersPage /></AdminRoute>} />
              <Route path="locations" element={<AdminRoute rights={['manage_locations']}><PartnerLocationsPage /></AdminRoute>} />
              <Route path="users" element={<AdminRoute rights={['manage_users']}><UsersPage /></AdminRoute>} />
              <Route path="pricing/sku" element={<AdminRoute rights={['manage_pricing']}><SkuPricingPage /></AdminRoute>} />
              <Route
                path="pricing/depreciation-matrix"
                element={<AdminRoute rights={['manage_pricing']}><DepreciationMatrixPage /></AdminRoute>}
              />
              <Route
                path="pricing/depreciation-configs"
                element={<Navigate to="/admin/pricing/depreciation-matrix" replace />}
              />
              <Route path="pricing/questions" element={<AdminRoute rights={['manage_pricing']}><QuestionsPage /></AdminRoute>} />
              <Route path="pricing/answers" element={<AdminRoute rights={['manage_pricing']}><AnswersPage /></AdminRoute>} />
              <Route
                path="pricing/question-answers"
                element={<AdminRoute rights={['manage_pricing']}><QuestionAnswersPage /></AdminRoute>}
              />
              <Route
                path="pricing/questionnaire-config"
                element={<AdminRoute rights={['manage_pricing']}><QuestionnaireConfigPage /></AdminRoute>}
              />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </OfflineGate>
      </BuybackDraftProvider>
    </AuthProvider>
  );
}

export default App;
