import React, { useState } from "react";
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
      {/* Top Header - hidden on small screens */}
      <header className="sport-gradient py-4 px-6 shadow-lg hidden md:block">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-white">
            Fiveaside.team
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

                  {/* Creative role tag */}
                  <div
                    className={`
                    relative px-3 py-1 rounded-full text-xs font-medium
                    ${
                      isReferee
                        ? "bg-gradient-to-r from-secondary/20 to-secondary/10 text-pink-300 border border-secondary/30"
                        : isPitchOwner
                        ? "bg-gradient-to-r from-green-500/20 to-green-500/10 text-emerald-300 border border-green-500/30"
                        : "bg-gradient-to-r from-primary/20 to-primary/10 text-violet-300 border border-primary/30"
                    }
                    before:absolute before:inset-0 before:rounded-full before:bg-black/5 before:animate-pulse
                  `}
                  >
                    <div className="flex items-center">
                      {isReferee && (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M6 3a1 1 0 011-1h.01a1 1 0 010 2H7a1 1 0 01-1-1zm2 3a1 1 0 00-2 0v1a2 2 0 00-2 2v1a2 2 0 002 2h6a2 2 0 002-2v-1a2 2 0 00-2-2V6a1 1 0 10-2 0v1H8V6zm10 8a1 1 0 01-1 1H3a1 1 0 110-2h14a1 1 0 011 1zM5 18a1 1 0 01-1-1v-2a1 1 0 112 0v2a1 1 0 01-1 1zm8-6h2a1 1 0 010 2h-2a1 1 0 010-2z" />
                          </svg>
                          Referee
                        </>
                      )}
                      {isPitchOwner && (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                          </svg>
                          Pitch Owner
                        </>
                      )}
                      {!isReferee && !isPitchOwner && (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                          </svg>
                          Player
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogoutClick}
                  className="text-sm text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="relative text-white font-medium flex items-center gap-1.5 border-2 border-white/30 hover:border-white px-4 py-1.5 rounded-md transition-all duration-300 before:absolute before:inset-0 before:rounded-md before:bg-primary/10 before:backdrop-blur-sm"
              >
                <span className="relative z-10 flex items-center">
                  <span className="w-6 h-6 flex items-center justify-center bg-primary rounded-full mr-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </span>
                  Sign In
                </span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile header */}
      <header className="sport-gradient py-3 px-4 md:hidden sticky top-0 z-40">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex flex-col items-start">
            <span className="text-xl font-bold text-white leading-tight">
              Fiveaside.team
            </span>
            <span className="text-xs font-semibold text-gray-300 tracking-wide mt-[-2px] ml-0.5">
              by Trextechies
            </span>
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center">
              <div className="flex items-center bg-dark-lighter/60 backdrop-blur-sm pl-2 pr-3 py-1 rounded-full">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isReferee
                      ? "bg-secondary"
                      : isPitchOwner
                      ? "bg-green-400"
                      : "bg-primary"
                  } mr-2`}
                ></div>
                <span className="text-white text-xs">{currentUser?.name}</span>

                {/* Mobile role indicator */}
                <span
                  className={`
                  ml-1.5 px-1.5 py-0.5 rounded-sm text-[10px] uppercase tracking-wide font-medium
                  ${
                    isReferee
                      ? "bg-secondary/20 text-pink-300"
                      : isPitchOwner
                      ? "bg-green-500/20 text-emerald-300"
                      : "bg-primary/20 text-violet-300"
                  }
                `}
                >
                  {isReferee ? "REF" : isPitchOwner ? "OWNER" : "PLAYER"}
                </span>
              </div>
              <button
                onClick={handleLogoutClick}
                className="ml-2 p-1.5 bg-dark-lighter/60 backdrop-blur-sm rounded-full"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-300"
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
          ) : (
            <Link
              to="/login"
              className="text-white flex items-center border-l-4 border-primary bg-dark-lighter/50 backdrop-blur-sm px-3 py-1.5 rounded-r-md"
            >
              <span className="text-xs font-medium">Sign In</span>
              <span className="ml-1.5 bg-primary w-5 h-5 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 flex-grow">
        <Outlet />
      </main>

      {/* Mobile navigation bar */}
      <nav className="mobile-nav">
        {visibleNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? "active" : ""}`}
          >
            <item.icon />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <footer className="bg-dark-lighter py-4 px-4 text-center hidden md:block">
        <div className="container mx-auto text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Fiveaside.team by Trextechies</p>
        </div>
      </footer>

      {/* Logout confirmation modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={handleCancelLogout}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export default Layout;
