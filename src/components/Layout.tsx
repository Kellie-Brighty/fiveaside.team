import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LogoutConfirmModal from "./LogoutConfirmModal";
import { getRoleDisplayName } from "../utils/permissions"; // Phase 4: Import role display name
import shortLogo from "../assets/short-logo.png";

// Phase 3: Navigation item type definition
// interface NavItem {
//   path: string;
//   label: string;
//   icon: React.ComponentType;
//   roles: string[];
//   primary: boolean; // Phase 3: Primary items show in bottom nav, secondary in More menu
// }

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

const AdminIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    ></path>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    ></path>
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
  const {
    currentUser,
    isAuthenticated,
    isReferee,
    isPitchOwner,
    isAdmin,
    logout,
  } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false); // Phase 3: More menu drawer state
  const [hasClubs, setHasClubs] = useState(false); // Phase 4: Track if club manager has clubs

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

  // Phase 3: Close More menu when route changes
  useEffect(() => {
    setShowMoreMenu(false);
  }, [location.pathname]);

  // Phase 4: Check if club manager has clubs
  useEffect(() => {
    const checkClubs = async () => {
      if (
        currentUser &&
        (currentUser.role === "club_manager" || currentUser.role === "admin") &&
        isAuthenticated
      ) {
        try {
          const { getClubsByManager } = await import("../services/clubService");
          const clubs = await getClubsByManager(currentUser.id);
          setHasClubs(clubs.length > 0);
        } catch (error) {
          console.error("Error checking clubs:", error);
          setHasClubs(false);
        }
      } else {
        setHasClubs(false);
      }
    };

    if (isAuthenticated && currentUser) {
      checkClubs();
    }
  }, [currentUser, isAuthenticated]);

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

  // Phase 4: Club icon component - dynamic based on hasClubs
  const ClubIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {hasClubs ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      )}
    </svg>
  );

  // Define navigation items with role-based visibility and primary/secondary categorization
  // Phase 4: Club nav item path/label are dynamic based on hasClubs state
  const getNavItems = () => [
    {
      path: "/",
      label: "Home",
      icon: HomeIcon,
      roles: ["all"],
      primary: true, // Phase 3: Primary item - always visible on mobile
    },
    {
      path: "/admin",
      label: "Admin Dashboard",
      icon: AdminIcon,
      roles: ["admin"],
      primary: false, // Phase 3: Secondary item - goes in More menu
    },
    {
      path: "/pitches",
      label: isPitchOwner ? "Manage Pitch" : "Find Pitches",
      icon: PitchesIcon,
      roles: ["all"],
      primary: true, // Phase 3: Primary item - core feature
    },
    {
      path: "/teams",
      label: "My Teams",
      icon: TeamsIcon,
      roles: ["player", "referee", "pitch_owner", "club_manager"],
      primary: false, // Phase 3: Secondary item
    },
    {
      path: "/referee-overview",
      label: "My Pitches",
      icon: RefereeIcon,
      roles: ["referee"],
      primary: false, // Phase 3: Secondary item
    },
    {
      path: "/matches",
      label: "Today's Matches",
      icon: MatchesIcon,
      roles: ["referee"],
      primary: false, // Phase 3: Secondary item
    },
    {
      path: "/betting",
      label: "Betting",
      icon: BettingIcon,
      roles: ["all"],
      primary: false, // Phase 4.3: Secondary item - moved to More menu for players
    },
    {
      path: "/profile",
      label: "Profile",
      icon: () => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      roles: ["authenticated"],
      primary: true, // Phase 3: Primary item - user account
    },
    {
      path: "/talent-pool",
      label: "Talent Pool",
      icon: () => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
      roles: [
        "scout",
        "club_manager",
        "ministry_official",
        "fa_official",
        "admin",
        "player",
      ],
      primary: false, // Phase 3: Secondary item - goes in More menu
    },
    {
      path: "/clubs",
      label: "Browse Clubs",
      icon: () => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
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
      ),
      roles: ["all"], // Phase 4.3: All authenticated users can browse clubs
      primary: true, // Phase 4.3: Primary item - core feature for players
    },
    {
      path: hasClubs ? "/my-clubs" : "/club/register",
      label: hasClubs ? "My Clubs" : "Register Club",
      icon: ClubIcon,
      roles: ["club_manager", "admin"], // Phase 4: Club registration/management for club managers
      primary: false, // Phase 4: Secondary item - goes in More menu
    },
    {
      path: "/clubs/verify",
      label: "Verify Clubs",
      icon: () => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      roles: ["fa_official", "admin"], // Phase 4: Club verification for FA officials
      primary: false, // Phase 4: Secondary item - goes in More menu
    },
    {
      path: "/revenue",
      label: "Revenue Reports",
      icon: () => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      roles: ["ministry_official", "fa_official", "admin"], // Phase 4: Revenue reporting for Ministry/FA officials
      primary: false, // Phase 4: Secondary item - goes in More menu
    },
  ];

  const navItems = getNavItems();

  // Filter navigation items based on user role
  const getVisibleNavItems = () => {
    if (!isAuthenticated) {
      return navItems.filter((item) => item.roles.includes("all"));
    }

    // Phase 2: Get current user role
    const role = isAdmin
      ? "admin"
      : isPitchOwner
      ? "pitch_owner"
      : isReferee
      ? "referee"
      : currentUser?.role || "player";

    return navItems.filter((item) => {
      // Show "all" items to everyone
      if (item.roles.includes("all")) return true;
      // Show "authenticated" items only to logged-in users
      if (item.roles.includes("authenticated")) return true;
      // Show role-specific items
      return item.roles.includes(role);
    });
  };

  const visibleNavItems = getVisibleNavItems();

  // Phase 3: Separate primary and secondary items for mobile navigation
  const primaryItems = visibleNavItems.filter((item) => item.primary);
  const secondaryItems = visibleNavItems.filter((item) => !item.primary);

  // Phase 3: More menu icon
  const MoreIcon = () => (
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
        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
      />
    </svg>
  );

  // Phase 3: Handle More menu item click
  const handleMoreMenuClick = () => {
    setShowMoreMenu(true);
  };

  // Phase 3: Handle navigation from More menu
  const handleMoreMenuItemClick = (path: string) => {
    setShowMoreMenu(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col pb-16 md:pb-0">
      {/* Top Header - for all screens */}
      <header
        className="sport-gradient shadow-lg"
        style={{ position: "sticky", top: 0, zIndex: 50 }}
      >
        {/* Desktop navigation - hidden on small screens */}
        <div className="container mx-auto justify-between items-center py-4 px-6 hidden md:flex">
          <Link to="/" className="flex items-center">
            <img src={shortLogo} alt="MonkeyPost" className="h-16 w-auto" />
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
                  {/* Phase 4: Show actual user role using getRoleDisplayName */}
                  <div
                    className={`rounded-full text-xs px-2 py-0.5 ${
                      isReferee
                        ? "bg-secondary/20 text-secondary"
                        : isPitchOwner
                        ? "bg-green-400/20 text-green-400"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    {currentUser?.role
                      ? getRoleDisplayName(currentUser.role)
                      : "User"}
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
            zIndex: 40,
          }}
        >
          <Link to="/" className="flex items-center">
            <img src={shortLogo} alt="MonkeyPost" className="h-12 w-auto" />
          </Link>
          {isAuthenticated && (
            <div className="flex items-center">
              {/* Phase 4: Show actual user role using getRoleDisplayName */}
              <div
                className={`rounded-full text-xs px-2 py-0.5 mr-2 ${
                  isReferee
                    ? "bg-secondary/20 text-secondary"
                    : isPitchOwner
                    ? "bg-green-400/20 text-green-400"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {currentUser?.role
                  ? getRoleDisplayName(currentUser.role)
                  : "User"}
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
        style={{ paddingTop: "20px" }}
      >
        <Outlet />
      </main>

      {/* Mobile navigation bar - Phase 3: Primary items only */}
      <nav
        className="mobile-nav"
        style={{
          paddingBottom: "max(18px, env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 10px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Primary navigation items */}
        {primaryItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? "active" : ""}`}
          >
            <item.icon />
            <span className="mt-1">{item.label}</span>
          </Link>
        ))}

        {/* More menu button - only show if there are secondary items */}
        {secondaryItems.length > 0 && (
          <button
            onClick={handleMoreMenuClick}
            className={`nav-item ${showMoreMenu ? "active" : ""}`}
          >
            <MoreIcon />
            <span className="mt-1">More</span>
          </button>
        )}
      </nav>

      {/* Phase 3: More Menu Drawer */}
      {showMoreMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMoreMenu(false)}
          />

          {/* Drawer */}
          <div
            className="fixed bottom-0 left-0 right-0 bg-dark-lighter rounded-t-2xl shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-out"
            style={{
              paddingBottom: "max(18px, env(safe-area-inset-bottom))",
              maxHeight: "70vh",
            }}
          >
            {/* Drawer Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
            </div>

            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">More</h2>
              <p className="text-sm text-gray-400 mt-1">
                Additional features and options
              </p>
            </div>

            {/* Drawer Content */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 100px)" }}>
              <div className="px-4 py-2">
                {secondaryItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleMoreMenuItemClick(item.path)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-lg mb-2 transition-colors ${
                      isActive(item.path)
                        ? "bg-primary/20 text-primary"
                        : "bg-dark hover:bg-dark-light text-gray-300"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <item.icon />
                    </div>
                    <span className="text-left font-medium">{item.label}</span>
                    {isActive(item.path) && (
                      <div className="ml-auto">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-primary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

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
