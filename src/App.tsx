import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import BoardInstitutionTypePage from "./pages/superadmin/BoardInstitutionTypePage";
import StateCityPage from "./pages/superadmin/StateCityPage";
import ClassSectionPage from "./pages/superadmin/ClassSectionPage";
import ManageUserPage from "./pages/superadmin/ManageUserPage";
import InstitutionProfilePage from "./pages/superadmin/InstitutionProfilePage";
import ClassSectionSetupPage from "./pages/schoolsetting/ClassSectionSetupPage";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated shell: sidebar + topbar wrap every page below */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/superadmin/board-institution-type"
              element={<BoardInstitutionTypePage />}
            />
            <Route path="/superadmin/state-city" element={<StateCityPage />} />
            <Route path="/superadmin/class-section" element={<ClassSectionPage />} />
            <Route path="/superadmin/manage-user" element={<ManageUserPage />} />
            <Route path="/superadmin/institution-profile" element={<InstitutionProfilePage />} />
            <Route
              path="/school-setting/essential-setting/class-section-setup"
              element={<ClassSectionSetupPage />}
            />
            {/* Sidebar links whose pages aren't built yet land here */}
            <Route path="*" element={<ComingSoonPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
