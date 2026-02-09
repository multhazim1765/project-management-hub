import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import MainLayout from './components/Common/MainLayout';
import AuthLayout from './components/Common/AuthLayout';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import AcceptInvitation from './pages/AcceptInvitation';

// Main Pages
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import MyTasks from './pages/MyTasks';
import Milestones from './pages/Milestones';
import Issues from './pages/Issues';
import IssueDetail from './pages/IssueDetail';
import Timesheets from './pages/Timesheets';
import TimesheetApproval from './pages/TimesheetApproval';
import Discussions from './pages/Discussions';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import OrganizationSettings from './pages/OrganizationSettings';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// Loading component
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public route wrapper (redirect if authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
      </Route>

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/projects/:projectId/tasks" element={<Tasks />} />
        <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetail />} />
        <Route path="/projects/:projectId/milestones" element={<Milestones />} />
        <Route path="/projects/:projectId/issues" element={<Issues />} />
        <Route path="/projects/:projectId/issues/:issueId" element={<IssueDetail />} />
        <Route path="/projects/:projectId/discussions" element={<Discussions />} />
        <Route path="/projects/:projectId/documents" element={<Documents />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/timesheets/approvals" element={<TimesheetApproval />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/:projectId" element={<Reports />} />
        <Route path="/organization/settings" element={<OrganizationSettings />} />
        <Route path="/organization/users" element={<UserManagement />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
