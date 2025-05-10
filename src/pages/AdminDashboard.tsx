import React, { useState, useEffect } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LogoutConfirmModal from "../components/LogoutConfirmModal";

const AdminDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768); // Default closed on mobile
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [_loggingOut, setLoggingOut] = useState(false);
  const { currentUser, isAdmin, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle responsive sidebar based on window size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Set initial state based on window size
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Redirect non-admin users to login
    if (!isLoading && (!currentUser || !isAdmin)) {
      navigate("/login");
    }
  }, [currentUser, isAdmin, isLoading, navigate]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const confirmLogout = () => {
    setShowLogoutModal(true);
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      window.toast?.info("Logging out...");
      await logout();
      navigate("/login");
      window.toast?.success("Logged out successfully");
    } catch (error) {
      console.error("Failed to log out", error);
      window.toast?.error("Failed to log out. Please try again.");
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return null; // Will be redirected by the useEffect
  }

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-10"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`admin-sidebar ${
          sidebarOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full w-64 md:translate-x-0 md:w-20"
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {sidebarOpen || window.innerWidth >= 768 ? (
              <h1 className="text-xl font-bold">
                {sidebarOpen ? "Admin Panel" : "AP"}
              </h1>
            ) : null}
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-full hover:bg-dark-light ml-auto"
              aria-label="Toggle sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-6 w-6 transition-transform duration-300 ${
                  sidebarOpen ? "transform rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <nav className="mt-8">
            <ul className="space-y-2">
              <li>
                <Link
                  to="/admin/users"
                  className={`flex items-center p-3 rounded-lg transition-colors ${
                    location.pathname.includes("/admin/users")
                      ? "bg-primary text-white"
                      : "hover:bg-dark-light"
                  }`}
                  onClick={() =>
                    window.innerWidth < 768 && setSidebarOpen(false)
                  }
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
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  {sidebarOpen && <span className="ml-3">All Users</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/fund-requests"
                  className={`flex items-center p-3 rounded-lg transition-colors ${
                    location.pathname.includes("/admin/fund-requests")
                      ? "bg-primary text-white"
                      : "hover:bg-dark-light"
                  }`}
                  onClick={() =>
                    window.innerWidth < 768 && setSidebarOpen(false)
                  }
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {sidebarOpen && <span className="ml-3">Fund Requests</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/boosted-pitches"
                  className={`flex items-center p-3 rounded-lg transition-colors ${
                    location.pathname.includes("/admin/boosted-pitches")
                      ? "bg-primary text-white"
                      : "hover:bg-dark-light"
                  }`}
                  onClick={() =>
                    window.innerWidth < 768 && setSidebarOpen(false)
                  }
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
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  {sidebarOpen && <span className="ml-3">Boosted Pitches</span>}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={confirmLogout}
            className="flex items-center justify-center p-3 w-full rounded-lg hover:bg-dark-light transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-400"
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
            {sidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </div>

      {/* Mobile menu toggle button - visible on small screens */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed left-4 top-4 z-30 p-2 rounded-lg bg-primary text-white shadow-lg"
        aria-label="Toggle menu"
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
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Main content */}
      <div
        className={`admin-main flex-1 md:ml-20 ${
          sidebarOpen ? "md:ml-64" : ""
        }`}
      >
        {/* Header */}
        <header
          className={`admin-header right-0 left-0 md:left-20 ${
            sidebarOpen ? "md:left-64" : ""
          }`}
        >
          <h2 className="text-xl font-semibold hidden md:block">
            Admin Dashboard
          </h2>
          <div className="flex items-center">
            <div className="mr-4 text-right hidden sm:block">
              <p className="text-sm font-medium">{currentUser.name}</p>
              <p className="text-xs text-gray-400">{currentUser.email}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-medium">
                {currentUser.name?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="px-4 md:px-6 pb-8 pt-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <LogoutConfirmModal onConfirm={handleLogout} onCancel={cancelLogout} />
      )}
    </div>
  );
};

export default AdminDashboard;
