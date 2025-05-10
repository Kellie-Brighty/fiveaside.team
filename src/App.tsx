import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import TeamsPage from "./pages/TeamsPage";
import MatchesPage from "./pages/MatchesPage";
import BettingPage from "./pages/BettingPage";
import PitchesPage from "./pages/PitchesPage";
import LoginPage from "./pages/LoginPage";
import RefereeOverviewPage from "./pages/RefereeOverviewPage";
import AuthProvider, { useAuth } from "./contexts/AuthContext";
import RequireAuth from "./components/RequireAuth";
import ScrollToTop from "./components/ScrollToTop";
import LoadingScreen from "./components/LoadingScreen";
import { ToastContainer } from "./components/CustomToast";
import { initToast } from "./utils/toast";

const AppContent: React.FC = () => {
  const { isLoading } = useAuth();

  // Initialize toast utility
  useEffect(() => {
    initToast();
  }, []);

  // Load Paystack script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="pitches" element={<PitchesPage />} />
          <Route element={<RequireAuth />}>
            <Route path="teams" element={<TeamsPage />} />
            <Route path="betting" element={<BettingPage />} />
          </Route>
          <Route element={<RequireAuth requireReferee />}>
            <Route path="matches" element={<MatchesPage />} />
            <Route path="referee-overview" element={<RefereeOverviewPage />} />
          </Route>
        </Route>
      </Routes>

      {/* Toast Container for notifications */}
      <ToastContainer />
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
