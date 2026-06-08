import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { ProblemDetailPage } from './pages/ProblemDetailPage';
import { SubmitPage } from './pages/SubmitPage';
import { SubmissionsPage } from './pages/SubmissionsPage';
import { SubmissionDetailPage } from './pages/SubmissionDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ContestsPage } from './pages/ContestsPage';
import { ContestDetailPage } from './pages/ContestDetailPage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthGuard } from './components/AuthGuard';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/problems" element={<ProblemsPage />} />
              <Route path="/problems/:number" element={<ProblemDetailPage />} />
              <Route
                path="/problems/:number/submit"
                element={
                  <AuthGuard>
                    <SubmitPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/submissions"
                element={
                  <AuthGuard>
                    <SubmissionsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/submissions/:number"
                element={
                  <AuthGuard>
                    <SubmissionDetailPage />
                  </AuthGuard>
                }
              />
              <Route path="/contests" element={<ContestsPage />} />
              <Route path="/contests/:number" element={<ContestDetailPage />} />
              <Route
                path="/settings"
                element={
                  <AuthGuard>
                    <SettingsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/profile"
                element={
                  <AuthGuard>
                    <ProfilePage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin"
                element={
                  <AuthGuard adminOnly>
                    <AdminPage />
                  </AuthGuard>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProviders>
    </QueryClientProvider>
  );
}
