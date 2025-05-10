import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LogoutConfirmModal from "./LogoutConfirmModal";

// Icons for mobile navigation
const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const TeamsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const MatchesIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  </svg>
);

const BettingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const PitchesIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const RefereeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

// const UserIcon = () => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     className="h-6 w-6"
//     fill="none"
//     viewBox="0 0 24 24"
//     stroke="currentColor"
//   >
//     <path
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       strokeWidth={2}
//       d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
//     />
//   </svg>
// );

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, isReferee, isPitchOwner, logout } =
    useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Add meta viewport tag to handle safe areas
  useEffect(() => {
    // Check if viewport meta tag exists
    let viewportMeta = document.querySelector(
      'meta[name="viewport"]'
    ) as HTMLMetaElement;

    if (!viewportMeta) {
      viewportMeta = document.createElement("meta") as HTMLMetaElement;
      viewportMeta.name = "viewport";
      document.head.appendChild(viewportMeta);
    }

    // Update viewport meta to include viewport-fit=cover for notch support
    viewportMeta.content =
      "width=device-width, initial-scale=1, viewport-fit=cover";
  }, []);

  // Check if the current path matches the link path
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate("/login");
    window.toast?.success("You have been successfully logged out");
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Define navigation items with role-based visibility
  const navItems = [
    {
      path: "/",
      label: "Home",
      icon: HomeIcon,
      roles: ["all"],
    },
    {
      path: "/pitches",
      label: isPitchOwner ? "Manage Pitch" : "Find Pitches",
      icon: PitchesIcon,
      roles: ["all"],
    },
    {
      path: "/teams",
      label: "My Teams",
      icon: TeamsIcon,
      roles: ["player", "referee", "pitch_owner"],
    },
    {
      path: "/referee-overview",
      label: "My Pitches",
      icon: RefereeIcon,
      roles: ["referee"],
    },
    {
      path: "/matches",
      label: "Today's Matches",
      icon: MatchesIcon,
      roles: ["referee"],
    },
    {
      path: "/betting",
      label: "Betting",
      icon: BettingIcon,
      roles: ["all"],
    },
  ];

  // Filter navigation items based on user role
  const getVisibleNavItems = () => {
    if (!isAuthenticated) {
      return navItems.filter((item) => item.roles.includes("all"));
    }

    const role = isPitchOwner
      ? "pitch_owner"
      : isReferee
      ? "referee"
      : "player";
    return navItems.filter(
      (item) => item.roles.includes("all") || item.roles.includes(role)
    );
  };

  const visibleNavItems = getVisibleNavItems();

  return (
    <div className="min-h-screen bg-dark flex flex-col pb-16 md:pb-0">
      {/* Top Header - for all screens */}
      <header className="sport-gradient shadow-lg">
        {/* Desktop navigation - hidden on small screens */}
        <div className="container mx-auto justify-between items-center py-4 px-6 hidden md:flex">
          <Link to="/" className="text-2xl font-bold text-white">
            MonkeyPost
          </Link>
          <nav className="flex items-center">
            <ul className="flex space-x-6 mr-4">
              {visibleNavItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`px-3 py-2 rounded-md transition-colors ${
                      isActive(item.path)
                        ? "bg-white/20 text-white font-medium"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {isAuthenticated ? (
              <div className="flex items-center">
                <div className="mr-3 flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isReferee
                        ? "bg-secondary"
                        : isPitchOwner
                        ? "bg-green-400"
                        : "bg-primary"
                    } mr-2`}
                  ></div>
                  <span className="text-white text-sm mr-2">
                    {currentUser?.name}
                  </span>
                  <div
                    className={`rounded-full text-xs px-2 py-0.5 ${
                      isReferee
                        ? "bg-secondary/20 text-secondary"
                        : isPitchOwner
                        ? "bg-green-400/20 text-green-400"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    {isReferee
                      ? "Referee"
                      : isPitchOwner
                      ? "Pitch Manager"
                      : "Player"}
                  </div>
                </div>
                <button
                  onClick={handleLogoutClick}
                  className="text-white text-sm bg-dark/30 px-3 py-1.5 rounded-md hover:bg-dark/50 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link
                  to="/login"
                  className="text-white bg-dark/30 px-3 py-1.5 rounded-md hover:bg-dark/50 transition-colors text-sm"
                >
                  Login
                </Link>
                <Link
                  to="/login?signup=true"
                  className="text-white bg-primary px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors text-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* Mobile header - visible only on small screens */}
        <div
          className="flex justify-between items-center py-4 px-4 md:hidden"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 20px)",
            paddingBottom: "10px",
            backgroundColor: "rgba(36, 36, 45, 0.98)",
            backdropFilter: "blur(10px)",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          <Link to="/" className="text-xl font-bold text-white">
            MonkeyPost
          </Link>
          {isAuthenticated && (
            <div className="flex items-center">
              <div
                className={`rounded-full text-xs px-2 py-0.5 mr-2 ${
                  isReferee
                    ? "bg-secondary/20 text-secondary"
                    : isPitchOwner
                    ? "bg-green-400/20 text-green-400"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {isReferee
                  ? "Referee"
                  : isPitchOwner
                  ? "Pitch Manager"
                  : "Player"}
              </div>
              <button
                onClick={handleLogoutClick}
                className="text-white text-xs bg-dark/50 px-2 py-1 rounded-md hover:bg-dark/70 transition-colors"
                aria-label="Logout"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <main
        className="flex-grow px-4 py-6 md:px-8"
        style={{ paddingTop: "10px" }}
      >
        <Outlet />
      </main>

      {/* Mobile navigation bar */}
      <nav
        className="mobile-nav"
        style={{
          paddingBottom: "max(18px, env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 10px rgba(0, 0, 0, 0.1)",
        }}
      >
        {visibleNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? "active" : ""}`}
          >
            <item.icon />
            <span className="mt-1">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={handleConfirmLogout}
          onCancel={handleCancelLogout}
        />
      )}
    </div>
  );
};

export default Layout;
