import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { DepartmentProvider } from '@/lib/DepartmentContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Add page imports here
import Home from './pages/Home';
import IncidentForm from './pages/IncidentForm';
import AdminDepartments from './pages/AdminDepartments';
import AdminDepartmentConfig from './pages/AdminDepartmentConfig';
import Members from './pages/Members';
import Apparatus from './pages/Apparatus';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/incident/new" element={<IncidentForm />} />
      <Route path="/incident/:id" element={<IncidentForm />} />
      <Route path="/admin/departments" element={<AdminDepartments />} />
      <Route path="/admin/departments/:id/config" element={<AdminDepartmentConfig />} />
      <Route path="/members" element={<Members />} />
      <Route path="/apparatus" element={<Apparatus />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <DepartmentProvider>
            <AuthenticatedApp />
          </DepartmentProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App