import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import ProtectedRoute from "./routes/ProtectedRoute";
import RequireCouple from "./routes/RequireCouple";

import AppLayout from "./layouts/AppLayout";
import Loader from "./components/common/Loader/Loader";

// Eager: first-paint + auth surfaces.
import Login from "./pages/Auth/Login/Login";
import Register from "./pages/Auth/Register/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword/ResetPassword";
import VerifyEmail from "./pages/Auth/VerifyEmail/VerifyEmail";
import Dashboard from "./pages/Dashboard/Dashboard";

// Lazy: everything else is code-split so the initial bundle stays lean.
const Moods = lazy(() => import("./pages/Moods/Moods"));
const Memories = lazy(() => import("./pages/Memories/Memories"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const Chat = lazy(() => import("./pages/Chat/Chat"));
const AI = lazy(() => import("./pages/AI/AI"));
const NotificationsPage = lazy(() => import("./pages/Notifications/NotificationsPage/NotificationsPage"));
const EditProfile = lazy(() => import("./pages/Profile/EditProfile/EditProfile"));
const SettingsPage = lazy(() => import("./pages/Settings/SettingsPage/SettingsPage"));
const SecurityCenter = lazy(() => import("./pages/Security/SecurityCenter/SecurityCenter"));
const ExplorePage = lazy(() => import("./pages/Explore/ExplorePage/ExplorePage"));
const PublicProfile = lazy(() => import("./pages/Explore/PublicProfile/PublicProfile"));
const PersonalPublicProfile = lazy(() => import("./pages/Explore/PersonalPublicProfile/PersonalPublicProfile"));
const JourneyPage = lazy(() => import("./pages/Journey/JourneyPage/JourneyPage"));
const MoodAnalyticsPage = lazy(() => import("./pages/MoodAnalytics/MoodAnalyticsPage/MoodAnalyticsPage"));
const AICenterPage = lazy(() => import("./pages/AICenter/AICenterPage/AICenterPage"));
const CoupleLanding = lazy(() => import("./pages/Couple/CoupleLanding/CoupleLanding"));
const CreateCouple = lazy(() => import("./pages/Couple/CreateCouple/CreateCouple"));
const JoinCouple = lazy(() => import("./pages/Couple/JoinCouple/JoinCouple"));
const CoupleSuccess = lazy(() => import("./pages/Couple/CoupleSuccess/CoupleSuccess"));
const VoiceCallPage = lazy(() => import("./pages/Call/VoiceCallPage/VoiceCallPage"));
const VideoCallPage = lazy(() => import("./pages/Call/VideoCallPage/VideoCallPage"));
const PartnerProfile = lazy(() => import("./pages/Partner/PartnerProfile/PartnerProfile"));
const BucketListPage = lazy(() => import("./pages/BucketList/BucketListPage/BucketListPage"));
const Moments = lazy(() => import("./pages/Moments/Moments"));
const OurDayPage = lazy(() => import("./pages/OurDay/OurDayPage"));
const OurMomentsPage = lazy(() => import("./pages/OurMoments/OurMomentsPage"));
const SleepPage = lazy(() => import("./pages/Sleep/SleepPage/SleepPage"));
const Privacy = lazy(() => import("./pages/Privacy/Privacy"));
const TrustCenter = lazy(() => import("./pages/TrustCenter/TrustCenter"));
const RelationshipProfile = lazy(() => import("./pages/RelationshipProfile/RelationshipProfile"));
const RelationshipPassport = lazy(() => import("./pages/RelationshipPassport/RelationshipPassport"));

// Stage 1 (Preparing) + shared self-growth surfaces — solo, no couple needed.
const GrowthHub = lazy(() => import("./pages/Growth/GrowthHub/GrowthHub"));
const JournalPage = lazy(() => import("./pages/Journal/JournalPage/JournalPage"));
const PrepCoachPage = lazy(() => import("./pages/Growth/PrepCoachPage/PrepCoachPage"));

// Stage 3 (Healing) surfaces — solo, no couple needed.
const RelationshipSummaryPage = lazy(() => import("./pages/Summary/RelationshipSummaryPage/RelationshipSummaryPage"));
const GrowthReportPage = lazy(() => import("./pages/GrowthReport/GrowthReportPage/GrowthReportPage"));
const MaturityPage = lazy(() => import("./pages/Maturity/MaturityPage/MaturityPage"));

// AI Relationship Intelligence surfaces.
const ReflectionPage = lazy(() => import("./pages/Reflection/ReflectionPage/ReflectionPage"));
const PersonalityTimelinePage = lazy(() => import("./pages/PersonalityTimeline/PersonalityTimelinePage/PersonalityTimelinePage"));
const TimelinePage = lazy(() => import("./pages/Timeline/TimelinePage/TimelinePage"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader fullScreen />}>
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
            {/* Account management — reachable even without a partner so a solo
                user can manage/log out of their account. */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/security" element={<SecurityCenter />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* 🌍 Explore — universal Relationship Discovery. Browsable by every
                user (single / connected / unmatched). Relationship posts require
                a couple; personal posts are open to all (enforced server-side). */}
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/r/:username" element={<PublicProfile />} />
            <Route path="/u/:username" element={<PersonalPublicProfile />} />

            {/* Stage-adaptive home — reachable in every lifecycle stage
                (preparing / growing / healing). The component switches on stage. */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Self-growth surfaces — solo (Stage 1 Preparing & Stage 3 Healing).
                Personal, so reachable without a partner. */}
            <Route path="/growth" element={<GrowthHub />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/ai-coach" element={<PrepCoachPage />} />
            {/* Relationship Maturity — behaviour-based, works in every stage. */}
            <Route path="/maturity" element={<MaturityPage />} />
            {/* AI Daily Reflection + Personality Timeline — personal, so
                reachable in every lifecycle stage (no partner needed). */}
            <Route path="/reflection" element={<ReflectionPage />} />
            <Route path="/personality-timeline" element={<PersonalityTimelinePage />} />
            {/* Stage 3 (Healing) — solo, reachable without a partner. */}
            <Route path="/summary" element={<RelationshipSummaryPage />} />
            <Route path="/growth-report" element={<GrowthReportPage />} />

            {/* Couple-gated features — require a fully connected partner. */}
            <Route element={<RequireCouple />}>
              <Route path="/moods" element={<Moods />} />
              <Route path="/memories" element={<Memories />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/ai" element={<AI />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/journey" element={<JourneyPage />} />
              <Route path="/mood-analytics" element={<MoodAnalyticsPage />} />
              <Route path="/ai-center" element={<AICenterPage />} />
              <Route path="/call/voice" element={<VoiceCallPage />} />
              <Route path="/call/video" element={<VideoCallPage />} />
              <Route path="/partner" element={<PartnerProfile />} />
              <Route path="/bucket-list" element={<BucketListPage />} />
              <Route path="/moments" element={<Moments />} />
              <Route path="/our-day" element={<OurDayPage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/our-moments" element={<OurMomentsPage />} />
              <Route path="/sleep" element={<SleepPage />} />
              <Route path="/relationship" element={<RelationshipProfile />} />
              <Route path="/passport" element={<RelationshipPassport />} />
              <Route path="/trust-center" element={<TrustCenter />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
