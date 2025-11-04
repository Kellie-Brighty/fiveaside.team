import React, { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext"; // Phase 8
import LogoutConfirmModal from "./LogoutConfirmModal";
import { getRoleDisplayName } from "../utils/permissions"; // Phase 4: Import role display name
import shortLogo from "../assets/short-logo.png";

// Phase 3: Navigation item type definition
interface NavItem {
  path?: string;
  label: string;
  icon: React.ComponentType;
  roles: string[];
  primary: boolean; // Phase 3: Primary items show in bottom nav, secondary in More menu
  children?: NavItem[]; // Phase 5: Nested menu items for desktop
  comingSoon?: boolean; // Phase 11: Coming Soon indicator
}

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
  const { getCartItemCount } = useCart(); // Phase 8
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
      primary: false, // Will be set dynamically based on role
    },
    {
      path: "/pitches",
      label: isPitchOwner ? "Manage Pitch" : "Find Pitches",
      icon: PitchesIcon,
      roles: ["all"],
      primary: false, // Phase 5: Secondary item - goes in More menu
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
      label: "Referee Dashboard",
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
      primary: false, // Will be set dynamically based on role
    },
    {
      path: "/player-messages",
      label: "Scout Messages",
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
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      roles: ["player"],
      primary: false, // Will be set dynamically based on role
    },
    {
      path: "/player-recruitment",
      label: "Recruitment Status",
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
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
      roles: ["player"],
      primary: false, // Will be set dynamically based on role
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
      primary: false, // Will be set dynamically based on role
    },
    {
      path: "/scout-dashboard",
      label: "Scout Dashboard",
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
      roles: ["scout"],
      primary: false, // Will be set dynamically based on role
    },
    {
      path: "/coming-soon/ticketing",
      label: "Electronic Ticketing",
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
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
          />
        </svg>
      ),
      roles: ["all"],
      primary: false, // Coming Soon - goes in More menu
      comingSoon: true,
    },
    {
      path: "/coming-soon/betting",
      label: "Betting System",
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
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      roles: ["all"],
      primary: false, // Coming Soon - goes in More menu
      comingSoon: true,
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
      primary: false, // Will be set dynamically based on role
    },
    {
      path: "/leagues",
      label: "Browse Leagues",
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
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
      roles: ["all"], // Phase 5: All authenticated users can browse leagues
      primary: false, // Will be set dynamically based on role
    },
    {
      path: "/products",
      label: "i-Sale",
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
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
      roles: ["all"], // Phase 8: All users can browse products
      primary: false, // Will be set dynamically based on role
    },
    {
      path: hasClubs ? "/my-clubs" : "/club/register",
      label: hasClubs ? "My Clubs" : "Register Club",
      icon: ClubIcon,
      roles: ["club_manager", "admin"], // Phase 4: Club registration/management for club managers
      primary: false, // Will be set dynamically based on role
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
      {
        path: "/leagues/manage",
        label: "Manage Leagues",
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
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
        ),
        roles: ["ministry_official", "fa_official", "admin"], // Phase 5: League management for Ministry/FA officials
        primary: false, // Phase 5: Secondary item - goes in More menu
      },
      {
        path: "/products/manage",
        label: "Manage Products",
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
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        ),
        roles: ["club_manager", "admin", "service_provider"], // Phase 8: Product management for sellers
        primary: false, // Phase 8: Secondary item - goes in More menu
      },
      {
        path: "/orders",
        label: "My Orders",
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        ),
        roles: ["all"], // Phase 8: All authenticated users can view orders
        primary: false, // Phase 8: Secondary item - goes in More menu
      },
      {
        path: "/orders/seller",
        label: "Seller Orders",
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
        roles: ["club_manager", "admin", "service_provider"], // Phase 8: Sellers can manage orders
        primary: false, // Phase 8: Secondary item - goes in More menu
      },
    {
      path: "/service-providers/manage",
      label: "Provider Dashboard",
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
      roles: ["service_provider"], // Phase 9: Service providers dashboard
      primary: false, // Will be set dynamically based on role
    },
    {
      path: "/service-providers",
      label: "Service Providers",
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
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      roles: ["all"], // Phase 9: All users can browse service providers
      primary: false, // Phase 9: Secondary item - goes in More menu
    },
    {
      path: "/service-providers/register",
      label: "Register as Provider",
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
      roles: ["service_provider"], // Phase 9: Service providers can register
      primary: false, // Phase 9: Secondary item - goes in More menu
    },
    {
      path: "/service-bookings",
      label: "My Bookings",
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      roles: ["all"], // Phase 9: All authenticated users can view their bookings
      primary: false, // Phase 9: Secondary item - goes in More menu
    },
    {
      path: "/service-providers/bookings",
      label: "Provider Bookings",
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      roles: ["service_provider"], // Phase 9: Service providers can manage bookings
      primary: false, // Phase 9: Secondary item - goes in More menu
    },
    {
      path: "/service-providers/earnings",
      label: "My Earnings",
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
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      roles: ["service_provider"], // Phase 9: Service providers can view earnings
      primary: false, // Phase 9: Secondary item - goes in More menu
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

  // Phase 12: Reorganize items by role priority - limit to top 5 items per role (including Home and More)
  const getRolePriorityItems = () => {
    if (!isAuthenticated) {
      return visibleNavItems;
    }

    const role = isAdmin
      ? "admin"
      : isPitchOwner
      ? "pitch_owner"
      : isReferee
      ? "referee"
      : currentUser?.role || "player";

    // Define top priority items for each role (max 3-4 items + Home + More = 5-6 total)
    const rolePrimaryPaths: { [key: string]: string[] } = {
      player: ["/profile", "/player-messages", "/player-recruitment"], // 3 items
      scout: ["/scout-dashboard", "/talent-pool"], // 2 items
      club_manager: [hasClubs ? "/my-clubs" : "/club/register", "/clubs"], // 2 items
      service_provider: ["/service-providers/manage", "/service-providers/bookings"], // 2 items
      admin: ["/admin"], // 1 item
      referee: ["/referee-overview", "/matches"], // 2 items
    };

    // Reorganize items based on role - set primary flags dynamically
    const updatedItems = visibleNavItems.map((item) => {
      // Keep Home as primary for all
      if (item.path === "/") {
        return { ...item, primary: true };
      }

      // Check if this item is in the role's primary list
      const primaryPaths = rolePrimaryPaths[role] || [];
      const isPrimary = primaryPaths.some((path) => {
        if (item.path?.includes(path) || item.path === path) {
          return true;
        }
        // Handle dynamic paths like /my-clubs
        if (path.includes("/my-clubs") && item.path?.includes("/my-clubs")) {
          return true;
        }
        if (path.includes("/club/register") && item.path?.includes("/club/register")) {
          return true;
        }
        return false;
      });

      if (isPrimary) {
        return { ...item, primary: true };
      }

      // All other items are secondary
      return { ...item, primary: false };
    });

    return updatedItems;
  };

  const prioritizedItems = getRolePriorityItems();

  // Phase 3: Separate primary and secondary items for mobile navigation
  const primaryItems = prioritizedItems.filter((item) => item.primary);
  const secondaryItems = prioritizedItems.filter((item) => !item.primary);

  // Phase 5: Desktop nested menu state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Phase 5: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        openDropdown &&
        dropdownRefs.current[openDropdown] &&
        !dropdownRefs.current[openDropdown]!.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  // Phase 5: Organize navigation items into nested groups for desktop
  const getNestedNavItems = (): Array<NavItem & { children: NavItem[] }> => {
    const clubsGroup: NavItem[] = [];
    const leaguesGroup: NavItem[] = [];
    const adminGroup: NavItem[] = [];
    const featuresGroup: NavItem[] = [];
    const ecommerceGroup: NavItem[] = []; // Phase 8: E-commerce group
    const serviceProvidersGroup: NavItem[] = []; // Phase 9: Service Providers group
    const otherItems: NavItem[] = [];

    prioritizedItems.forEach((item) => {
      // Clubs group
      if (
        item.path?.includes("/clubs") ||
        item.path?.includes("/club") ||
        item.label.toLowerCase().includes("club")
      ) {
        clubsGroup.push(item);
      }
      // Leagues group
      else if (item.path?.includes("/leagues") || item.label.toLowerCase().includes("league")) {
        leaguesGroup.push(item);
      }
      // E-commerce group (Phase 8)
      else if (
        item.path?.includes("/products") ||
        item.path?.includes("/orders") ||
        item.path?.includes("/checkout") ||
        item.label.toLowerCase().includes("product") ||
        item.label.toLowerCase().includes("order") ||
        item.label.toLowerCase().includes("i-sale") ||
        item.label.toLowerCase().includes("sale")
      ) {
        ecommerceGroup.push(item);
      }
      // Service Providers group (Phase 9)
      else if (
        (item.path?.includes("/service-providers") && !item.primary) ||
        item.path?.includes("/service-bookings") ||
        item.label.toLowerCase().includes("service provider") ||
        (item.label.toLowerCase().includes("provider") && !item.primary) ||
        item.label.toLowerCase().includes("booking")
      ) {
        // Don't add primary service provider items to nested groups
        serviceProvidersGroup.push(item);
      }
      // Admin group
      else if (
        item.path?.includes("/admin") ||
        item.path?.includes("/revenue") ||
        item.label.toLowerCase().includes("admin") ||
        item.label.toLowerCase().includes("revenue")
      ) {
        adminGroup.push(item);
      }
      // Features group
      else if (
        item.path?.includes("/pitches") ||
        item.path?.includes("/teams") ||
        item.path?.includes("/matches") ||
        item.path?.includes("/referee-overview") ||
        (item.path?.includes("/talent-pool") && !item.primary) ||
        item.path?.includes("/coming-soon/ticketing") ||
        item.path?.includes("/coming-soon/betting") ||
        (item.path?.includes("/scout-dashboard") && !item.primary)
      ) {
        featuresGroup.push(item);
      }
      // Other items (Home, Profile)
      else {
        otherItems.push(item);
      }
    });

    const nested: Array<NavItem & { children: NavItem[] }> = [];

    // Desktop: Only show top 3 items (Home + 2 most important role-specific items)
    // All other items go into nested menus
    const topLevelItems: NavItem[] = [];
    const roleSpecificPrimary = prioritizedItems.filter(
      (item) => item.primary && item.path !== "/" && (!('children' in item) || !item.children || (Array.isArray(item.children) && item.children.length === 0))
    );
    
    // Always add Home first
    const homeItem = prioritizedItems.find((item) => item.path === "/");
    if (homeItem && homeItem.primary) {
      topLevelItems.push({ ...homeItem, children: [] });
    }
    
    // Add only 2 most important role-specific primary items for desktop navbar
    roleSpecificPrimary.slice(0, 2).forEach((item) => {
      const inGroup = clubsGroup.includes(item) ||
        leaguesGroup.includes(item) ||
        ecommerceGroup.includes(item) ||
        serviceProvidersGroup.includes(item) ||
        featuresGroup.includes(item) ||
        adminGroup.includes(item);
      if (!inGroup) {
        topLevelItems.push({ ...item, children: [] });
      }
    });
    
    // Add remaining primary items to appropriate groups instead of top-level
    // These will be added to their respective groups if they match (handled below)
    // Otherwise, they'll be in "More" nested menu
    
    topLevelItems.forEach((item) => nested.push({ ...item, children: [] }));

    // Create "More" menu with all grouped items and remaining items
    const moreMenuChildren: NavItem[] = [];
    
    // Add all groups to More menu
    if (clubsGroup.length > 0) {
      moreMenuChildren.push(...clubsGroup);
    }
    if (leaguesGroup.length > 0) {
      moreMenuChildren.push(...leaguesGroup);
    }
    if (ecommerceGroup.length > 0) {
      moreMenuChildren.push(...ecommerceGroup);
    }
    if (serviceProvidersGroup.length > 0) {
      moreMenuChildren.push(...serviceProvidersGroup);
    }
    if (featuresGroup.length > 0) {
      moreMenuChildren.push(...featuresGroup);
    }
    if (adminGroup.length > 0) {
      moreMenuChildren.push(...adminGroup);
    }
    
    // Add remaining primary items that aren't in top 3
    roleSpecificPrimary.slice(2).forEach((item) => {
      const inGroup = clubsGroup.includes(item) ||
        leaguesGroup.includes(item) ||
        ecommerceGroup.includes(item) ||
        serviceProvidersGroup.includes(item) ||
        featuresGroup.includes(item) ||
        adminGroup.includes(item);
      const isTopLevel = topLevelItems.some((top) => top.path === item.path);
      if (!inGroup && !isTopLevel) {
        moreMenuChildren.push(item);
      }
    });
    
    // Add all secondary items
    prioritizedItems
      .filter((item) => !item.primary && (!('children' in item) || !item.children || (Array.isArray(item.children) && item.children.length === 0)))
      .forEach((item) => {
        const inGroup = clubsGroup.includes(item) ||
          leaguesGroup.includes(item) ||
          ecommerceGroup.includes(item) ||
          serviceProvidersGroup.includes(item) ||
          featuresGroup.includes(item) ||
          adminGroup.includes(item);
        const isTopLevel = topLevelItems.some((top) => top.path === item.path);
        if (!inGroup && !isTopLevel) {
          moreMenuChildren.push(item);
        }
      });
    
    // Add "More" menu if there are items to nest
    if (moreMenuChildren.length > 0) {
      nested.push({
        path: undefined,
        label: "More",
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
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        ),
        roles: ["all"],
        primary: false,
        children: moreMenuChildren,
      });
    }

    return nested;
  };

  const nestedNavItems = getNestedNavItems();

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
            <ul className="flex space-x-4 mr-4">
              {nestedNavItems.map((item, index) => {
                const hasChildren = item.children && item.children.length > 0;
                const dropdownId = `dropdown-${item.label}-${index}`;
                const isDropdownOpen = openDropdown === dropdownId;

                return (
                  <li key={item.path || item.label} className="relative">
                    {hasChildren ? (
                      <>
                        <button
                          onClick={() =>
                            setOpenDropdown(isDropdownOpen ? null : dropdownId)
                          }
                          className={`px-3 py-2 rounded-md transition-colors flex items-center justify-center gap-1 min-h-[36px] ${
                            isDropdownOpen || item.children?.some((child) => isActive(child.path || ""))
                              ? "bg-white/20 text-white font-medium"
                              : "text-white hover:bg-white/10"
                          }`}
                        >
                          <span>{item.label}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 transition-transform flex-shrink-0 ${
                              isDropdownOpen ? "rotate-180" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {isDropdownOpen && (
                          <div
                            ref={(el) => {
                              dropdownRefs.current[dropdownId] = el;
                            }}
                            className="absolute top-full left-0 mt-1 min-w-56 bg-dark-lighter rounded-lg shadow-xl border border-gray-700 z-50 py-2"
                          >
                            {item.children?.map((child) => (
                  <Link
                                key={child.path}
                                to={child.path || "#"}
                                onClick={() => setOpenDropdown(null)}
                                className={`block px-4 py-2 text-sm transition-colors whitespace-nowrap ${
                                  isActive(child.path || "")
                                    ? "bg-primary/20 text-primary"
                                    : "text-gray-300 hover:bg-dark hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <child.icon />
                                  </div>
                                  <span className="flex-1">{child.label}</span>
                                  {child.comingSoon && (
                                    <span className="ml-auto flex-shrink-0 text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">
                                      Coming Soon
                                    </span>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        to={item.path || "#"}
                        className={`px-3 py-2 rounded-md transition-colors flex items-center justify-center gap-2 min-h-[36px] ${
                          isActive(item.path || "")
                        ? "bg-white/20 text-white font-medium"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                        <span>{item.label}</span>
                        {item.comingSoon && (
                          <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">
                            Coming Soon
                          </span>
                        )}
                  </Link>
                    )}
                </li>
                );
              })}
            </ul>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* Phase 8: Cart Icon */}
                <Link
                  to="/checkout"
                  className="relative text-white hover:text-gray-200 transition-colors"
                >
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
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {getCartItemCount() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {getCartItemCount() > 9 ? "9+" : getCartItemCount()}
                    </span>
                  )}
                </Link>
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
                    className={`rounded-full text-xs px-2 py-0.5 text-white ${
                      isReferee
                        ? "bg-secondary/20"
                        : isPitchOwner
                        ? "bg-green-400/20"
                        : "bg-primary/20"
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
            <div className="flex items-center gap-2">
              {/* Phase 8: Cart Icon - Mobile */}
              <Link
                to="/checkout"
                className="relative text-white hover:text-gray-200 transition-colors"
              >
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
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {getCartItemCount() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {getCartItemCount() > 9 ? "9+" : getCartItemCount()}
                  </span>
                )}
              </Link>
              {/* Phase 4: Show actual user role using getRoleDisplayName */}
              <div
                className={`rounded-full text-xs px-2 py-0.5 mr-2 text-white ${
                  isReferee
                    ? "bg-secondary/20"
                    : isPitchOwner
                    ? "bg-green-400/20"
                    : "bg-primary/20"
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
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
            showMoreMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setShowMoreMenu(false)}
        />

        {/* Drawer */}
        <div
          className={`fixed bottom-0 left-0 right-0 bg-dark-lighter rounded-t-2xl shadow-2xl z-50 md:hidden transform transition-transform duration-300 ${
            showMoreMenu ? "translate-y-0 ease-out" : "translate-y-full ease-in"
          }`}
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
                    onClick={() => handleMoreMenuItemClick(item.path || "")}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-lg mb-2 transition-colors ${
                      isActive(item.path || "")
                        ? "bg-primary/20 text-primary"
                        : "bg-dark hover:bg-dark-light text-gray-300"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <item.icon />
                    </div>
                    <span className="text-left font-medium flex-1">{item.label}</span>
                    {item.comingSoon && (
                      <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded mr-2">
                        Coming Soon
                      </span>
                    )}
                    {isActive(item.path || "") && (
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
