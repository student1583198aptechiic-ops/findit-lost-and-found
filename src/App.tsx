import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import { HomePage } from "@/pages/HomePage";
import { BrowseItemsPage } from "@/pages/BrowseItemsPage";
import { ItemDetailsPage } from "@/pages/ItemDetailsPage";
import { AboutPage } from "@/pages/AboutPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ReportLostPage } from "@/pages/ReportLostPage";
import { ReportFoundPage } from "@/pages/ReportFoundPage";

import { DashboardOverview } from "@/pages/dashboard/DashboardOverview";
import { DashboardItems } from "@/pages/dashboard/DashboardItems";
import { DashboardClaims } from "@/pages/dashboard/DashboardClaims";
import { DashboardMessages } from "@/pages/dashboard/DashboardMessages";
import { DashboardNotifications } from "@/pages/dashboard/DashboardNotifications";
import { DashboardProfile } from "@/pages/dashboard/DashboardProfile";
import { ConversationView } from "@/pages/dashboard/ConversationView";

import { AdminDashboard } from "@/pages/admin/AdminDashboard";

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#101f3d",
            color: "#fff",
            borderRadius: "10px",
            fontSize: "14px",
            padding: "10px 14px",
          },
          success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#f43f5e", secondary: "#fff" } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/items" element={<BrowseItemsPage />} />
          <Route path="/items/:id" element={<ItemDetailsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected report routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/report-lost" element={<ReportLostPage />} />
          <Route path="/report-found" element={<ReportFoundPage />} />
        </Route>

        {/* User dashboard */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardOverview />} />
            <Route path="/dashboard/lost-items" element={<DashboardItems type="LOST" />} />
            <Route path="/dashboard/found-items" element={<DashboardItems type="FOUND" />} />
            <Route path="/dashboard/claims" element={<DashboardClaims />} />
            <Route path="/dashboard/messages" element={<DashboardMessages />} />
            <Route path="/dashboard/messages/:id" element={<ConversationView />} />
            <Route path="/dashboard/notifications" element={<DashboardNotifications />} />
            <Route path="/dashboard/profile" element={<DashboardProfile />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute requireAdmin />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
