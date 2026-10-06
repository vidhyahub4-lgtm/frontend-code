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
import FeePlanSetupPage from "./pages/schoolsetting/FeePlanSetupPage";
import LateFinePage from "./pages/schoolsetting/LateFinePage";
import SubjectSetupPage from "./pages/schoolsetting/SubjectSetupPage";
import AddTeacherPage from "./pages/teachers/AddTeacherPage";
import AssignClassPage from "./pages/teachers/AssignClassPage";
import ClassTeacherPage from "./pages/teachers/ClassTeacherPage";
import ClassPayModeSetupPage from "./pages/superadmin/ClassPayModeSetupPage";
import FeeHeadSetupPage from "./pages/superadmin/FeeHeadSetupPage";
import FeePlanTypePage from "./pages/superadmin/FeePlanTypePage";
import LateFineSetupPage from "./pages/superadmin/LateFineSetupPage";
import NewRegistrationPage from "./pages/studentmanagement/NewRegistrationPage";
import ViewRegisteredStudentPage from "./pages/studentmanagement/ViewRegisteredStudentPage";
import NewAdmissionPage from "./pages/studentmanagement/NewAdmissionPage";
import AdmittedStudentsPage from "./pages/studentmanagement/AdmittedStudentsPage";
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
            <Route
              path="/school-setting/essential-setting/subject-setup"
              element={<SubjectSetupPage />}
            />
            <Route
              path="/school-setting/teachers-setting/add-teacher"
              element={<AddTeacherPage />}
            />
            <Route
              path="/school-setting/teachers-setting/assign-class"
              element={<AssignClassPage />}
            />
            <Route
              path="/school-setting/teachers-setting/class-teacher"
              element={<ClassTeacherPage />}
            />
            <Route
              path="/school-setting/fee-setting/fee-plan-setup"
              element={<FeePlanSetupPage />}
            />
            <Route
              path="/school-setting/fee-setting/late-fine"
              element={<LateFinePage />}
            />
            {/* "/superadmin/fee-setting" kept for backward compatibility —
                the sidebar's Class PayMode Setup child now points at the
                more specific path below to avoid prefix-matching the other
                Fee Setting children as active. */}
            <Route path="/superadmin/fee-setting" element={<ClassPayModeSetupPage />} />
            <Route
              path="/superadmin/fee-setting/class-paymode-setup"
              element={<ClassPayModeSetupPage />}
            />
            <Route
              path="/superadmin/fee-setting/fee-head-setup"
              element={<FeeHeadSetupPage />}
            />
            <Route
              path="/superadmin/fee-setting/fee-plan-type"
              element={<FeePlanTypePage />}
            />
            <Route
              path="/superadmin/fee-setting/late-fine-setup"
              element={<LateFineSetupPage />}
            />
            <Route
              path="/student-management/registration/new-registration"
              element={<NewRegistrationPage />}
            />
            <Route
              path="/student-management/registration/view-registered-student"
              element={<ViewRegisteredStudentPage />}
            />
            <Route
              path="/student-management/admission/new-admission"
              element={<NewAdmissionPage />}
            />
            <Route
              path="/student-management/admission/admitted-students"
              element={<AdmittedStudentsPage />}
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
