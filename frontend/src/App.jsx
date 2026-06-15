import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import ProtectedRoute from "./routes/ProtectedRoute";

import AppLayout from "./layouts/AppLayout";
import Login from "./pages/Auth/Login/Login";
import Register from "./pages/Auth/Register/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword/ResetPassword";
import VerifyEmail from "./pages/Auth/VerifyEmail/VerifyEmail";
import Dashboard from "./pages/Dashboard/Dashboard";
import Moods from "./pages/Moods/Moods";
import Memories from "./pages/Memories/Memories";
import Profile from "./pages/Profile/Profile";
import Chat from "./pages/Chat/Chat";
import AI from "./pages/AI/AI";
import NotificationsPage from "./pages/Notifications/NotificationsPage/NotificationsPage";
import EditProfile from "./pages/Profile/EditProfile/EditProfile";
import SettingsPage from "./pages/Settings/SettingsPage/SettingsPage";
import JourneyPage from "./pages/Journey/JourneyPage/JourneyPage";
import MoodAnalyticsPage from "./pages/MoodAnalytics/MoodAnalyticsPage/MoodAnalyticsPage";
import AICenterPage from "./pages/AICenter/AICenterPage/AICenterPage";
import CoupleLanding from "./pages/Couple/CoupleLanding/CoupleLanding";
import CreateCouple from "./pages/Couple/CreateCouple/CreateCouple";
import JoinCouple from "./pages/Couple/JoinCouple/JoinCouple";
import CoupleSuccess from "./pages/Couple/CoupleSuccess/CoupleSuccess";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Couple onboarding — protected, no bottom nav */}
        <Route
          element={
            <ProtectedRoute>
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route path="/couple" element={<CoupleLanding />} />
          <Route path="/couple/create" element={<CreateCouple />} />
          <Route path="/couple/join" element={<JoinCouple />} />
          <Route path="/couple/success" element={<CoupleSuccess />} />
        </Route>

        {/* Main app — protected, with bottom nav */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/moods" element={<Moods />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/journey" element={<JourneyPage />} />
          <Route path="/mood-analytics" element={<MoodAnalyticsPage />} />
          <Route path="/ai-center" element={<AICenterPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
