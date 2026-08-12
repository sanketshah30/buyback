import { Navigate, Route, Routes } from 'react-router-dom';
import { OfflineGate } from './components/OfflineGate';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './lib/auth';
import { LoginPage } from './pages/LoginPage';
import { OtpVerifyPage } from './pages/OtpVerifyPage';
import { DashboardPage } from './pages/DashboardPage';
import { CategoryBrandPage } from './pages/buyback/CategoryBrandPage';
import { DeviceIdentifierPage } from './pages/buyback/DeviceIdentifierPage';
import { ProductInfoPage } from './pages/buyback/ProductInfoPage';
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

          <Route
            path="/buyback/new"
            element={
              <ProtectedRoute>
                <CategoryBrandPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyback/:id/device"
            element={
              <ProtectedRoute>
                <DeviceIdentifierPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyback/:id/product"
            element={
              <ProtectedRoute>
                <ProductInfoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyback/:id/assessment"
            element={
              <ProtectedRoute>
                <AssessmentMethodPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyback/:id/assessment/questionnaire"
            element={
              <ProtectedRoute>
                <QuestionnairePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyback/:id/assessment/image"
            element={
              <ProtectedRoute>
                <ImageAssessmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyback/:id/assessment/video"
            element={
              <ProtectedRoute>
                <VideoAssessmentPage />
              </ProtectedRoute>
            }
          />
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
    </AuthProvider>
  );
}

export default App;
