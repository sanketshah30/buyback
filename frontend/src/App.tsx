import { Navigate, Route, Routes } from 'react-router-dom';
import { OfflineGate } from './components/OfflineGate';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './lib/auth';
import { BuybackDraftProvider } from './lib/buybackDraft';
import { LoginPage } from './pages/LoginPage';
import { OtpVerifyPage } from './pages/OtpVerifyPage';
import { DashboardPage } from './pages/DashboardPage';
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

function App() {
  return (
    <AuthProvider>
      <BuybackDraftProvider>
        <OfflineGate>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/otp" element={<OtpVerifyPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </OfflineGate>
      </BuybackDraftProvider>
    </AuthProvider>
  );
}

export default App;
