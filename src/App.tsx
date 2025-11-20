import React, { useEffect } from "react";
import type { JSX } from "react";
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
import ProfilePage from "./pages/ProfilePage"; // Phase 2
import PlayerProfileViewPage from "./pages/PlayerProfileViewPage"; // Phase 3
import TalentPoolPage from "./pages/TalentPoolPage"; // Phase 3
import ClubRegistrationPage from "./pages/ClubRegistrationPage"; // Phase 4
import ClubManagementPage from "./pages/ClubManagementPage"; // Phase 4
import ClubProfilePage from "./pages/ClubProfilePage"; // Phase 4
import ClubVerificationPage from "./pages/ClubVerificationPage"; // Phase 4
import MyClubsPage from "./pages/MyClubsPage"; // Phase 4
import RevenueReportingPage from "./pages/RevenueReportingPage"; // Phase 4
import ClubsPage from "./pages/ClubsPage"; // Phase 4.3
import LeaguesPage from "./pages/LeaguesPage"; // Phase 5
import LeagueManagementPage from "./pages/LeagueManagementPage"; // Phase 5
import LeagueViewPage from "./pages/LeagueViewPage"; // Phase 5
import ProductsPage from "./pages/ProductsPage"; // Phase 8
import ProductDetailPage from "./pages/ProductDetailPage"; // Phase 8
import ProductManagementPage from "./pages/ProductManagementPage"; // Phase 8
import CheckoutPage from "./pages/CheckoutPage"; // Phase 8
import OrdersPage from "./pages/OrdersPage"; // Phase 8
import SellerOrdersPage from "./pages/SellerOrdersPage"; // Phase 8
import ServiceProvidersPage from "./pages/ServiceProvidersPage"; // Phase 9
import ServiceProviderProfilePage from "./pages/ServiceProviderProfilePage"; // Phase 9
import ServiceProviderRegistrationPage from "./pages/ServiceProviderRegistrationPage"; // Phase 9
import ServiceProviderDashboardPage from "./pages/ServiceProviderDashboardPage"; // Phase 9
import ServiceBookingPage from "./pages/ServiceBookingPage"; // Phase 9
import ServiceBookingsPage from "./pages/ServiceBookingsPage"; // Phase 9
import ProviderBookingsPage from "./pages/ProviderBookingsPage"; // Phase 9
import ProviderEarningsPage from "./pages/ProviderEarningsPage"; // Phase 9
import ScoutDashboardPage from "./pages/ScoutDashboardPage"; // Phase 11
import PlayerComparisonPage from "./pages/PlayerComparisonPage"; // Phase 11
import ComingSoonPage from "./pages/ComingSoonPage"; // Phase 11
import PlayerMessagesPage from "./pages/PlayerMessagesPage"; // Phase 11
import PlayerRecruitmentPage from "./pages/PlayerRecruitmentPage"; // Phase 11
import AuthProvider, { useAuth } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext"; // Phase 8
import { StateProvider } from "./contexts/StateContext"; // Multi-state support
import RequireAuth from "./components/RequireAuth";
import ScrollToTop from "./components/ScrollToTop";
import LoadingScreen from "./components/LoadingScreen";
import { ToastContainer } from "./components/CustomToast";
import { initToast } from "./utils/toast";
import AdminDashboard from "./pages/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import FundRequestsPage from "./pages/admin/FundRequestsPage";
import BoostedPitchesPage from "./pages/admin/BoostedPitchesPage";
import CreateAdminPage from "./pages/CreateAdminPage";

// RequireAdmin component for protecting admin routes
const RequireAdmin = ({ children }: { children: JSX.Element }) => {
  const { currentUser, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!currentUser || !isAdmin) {
    return <LoginPage />;
  }

  return children;
};

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
        <Route path="/create-admin" element={<CreateAdminPage />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        >
          <Route index element={<UsersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="fund-requests" element={<FundRequestsPage />} />
          <Route path="boosted-pitches" element={<BoostedPitchesPage />} />
        </Route>

        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="pitches" element={<PitchesPage />} />
          <Route path="player/:userId" element={<PlayerProfileViewPage />} /> {/* Phase 3 */}
          <Route path="clubs" element={<ClubsPage />} /> {/* Phase 4.3 */}
          <Route path="club/:clubId" element={<ClubProfilePage />} /> {/* Phase 4 */}
          <Route path="leagues" element={<LeaguesPage />} /> {/* Phase 5 */}
          <Route path="leagues/:leagueId" element={<LeagueViewPage />} /> {/* Phase 5 */}
          <Route path="products" element={<ProductsPage />} /> {/* Phase 8 */}
          <Route path="products/:productId" element={<ProductDetailPage />} /> {/* Phase 8 */}
          <Route path="service-providers" element={<ServiceProvidersPage />} /> {/* Phase 9 */}
          <Route path="service-providers/:providerId" element={<ServiceProviderProfilePage />} /> {/* Phase 9 */}
          <Route path="service-providers/:providerId/book" element={<ServiceBookingPage />} /> {/* Phase 9 */}
          <Route element={<RequireAuth />}>
            <Route path="teams" element={<TeamsPage />} />
            <Route path="betting" element={<BettingPage />} />
            <Route path="profile" element={<ProfilePage />} /> {/* Phase 2 */}
            <Route path="talent-pool" element={<TalentPoolPage />} /> {/* Phase 3 */}
            <Route path="club/register" element={<ClubRegistrationPage />} /> {/* Phase 4 */}
            <Route path="my-clubs" element={<MyClubsPage />} /> {/* Phase 4 */}
            <Route path="club/:clubId/manage" element={<ClubManagementPage />} /> {/* Phase 4 */}
            <Route path="clubs/verify" element={<ClubVerificationPage />} /> {/* Phase 4 */}
            <Route path="revenue" element={<RevenueReportingPage />} /> {/* Phase 4 */}
            <Route path="leagues/manage" element={<LeagueManagementPage />} /> {/* Phase 5 */}
            <Route path="leagues/:leagueId/manage" element={<LeagueManagementPage />} /> {/* Phase 5 */}
            <Route path="products/manage" element={<ProductManagementPage />} /> {/* Phase 8 */}
            <Route path="checkout" element={<CheckoutPage />} /> {/* Phase 8 */}
            <Route path="orders" element={<OrdersPage />} /> {/* Phase 8 */}
            <Route path="orders/:orderId" element={<OrdersPage />} /> {/* Phase 8 */}
            <Route path="orders/seller" element={<SellerOrdersPage />} /> {/* Phase 8 */}
            <Route path="orders/seller/:orderId" element={<SellerOrdersPage />} /> {/* Phase 8 */}
            <Route path="service-providers/register" element={<ServiceProviderRegistrationPage />} /> {/* Phase 9 */}
            <Route path="service-providers/manage" element={<ServiceProviderDashboardPage />} /> {/* Phase 9 */}
            <Route path="service-bookings" element={<ServiceBookingsPage />} /> {/* Phase 9 */}
            <Route path="service-bookings/:bookingId" element={<ServiceBookingsPage />} /> {/* Phase 9 */}
            <Route path="service-providers/bookings" element={<ProviderBookingsPage />} /> {/* Phase 9 */}
            <Route path="service-providers/bookings/:bookingId" element={<ProviderBookingsPage />} /> {/* Phase 9 */}
            <Route path="service-providers/earnings" element={<ProviderEarningsPage />} /> {/* Phase 9 */}
            <Route path="scout-dashboard" element={<ScoutDashboardPage />} /> {/* Phase 11 */}
            <Route path="player-comparison" element={<PlayerComparisonPage />} /> {/* Phase 11 */}
            <Route path="coming-soon/:feature" element={<ComingSoonPage />} /> {/* Phase 11 */}
            <Route path="player-messages" element={<PlayerMessagesPage />} /> {/* Phase 11 */}
            <Route path="player-recruitment" element={<PlayerRecruitmentPage />} /> {/* Phase 11 */}
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
      <StateProvider>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </StateProvider>
    </Router>
  );
};

export default App;
