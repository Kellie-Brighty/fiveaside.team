import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

const CreateAdminPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const [checkingAdminStatus, setCheckingAdminStatus] = useState(true);

  const { adminSignup } = useAuth();
  const navigate = useNavigate();

  // Check if admin already exists
  useEffect(() => {
    const checkIfAdminExists = async () => {
      try {
        setCheckingAdminStatus(true);
        const usersRef = collection(db, "users");
        const adminQuery = query(usersRef, where("role", "==", "admin"));
        const querySnapshot = await getDocs(adminQuery);

        setAdminExists(!querySnapshot.empty);
      } catch (error) {
        console.error("Error checking admin existence:", error);
      } finally {
        setCheckingAdminStatus(false);
      }
    };

    checkIfAdminExists();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFormError("");

    // Validate form
    if (!email || !password || !confirmPassword) {
      setFormError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await adminSignup(email, password);

      // Show success message
      window.toast?.success("Admin account created successfully");

      // Redirect to login page
      navigate("/login");
    } catch (error: any) {
      console.error("Error creating admin account:", error);
      setFormError(error.message || "Failed to create admin account");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAdminStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark p-4">
        <div className="w-full max-w-md bg-dark-lighter p-8 rounded-xl shadow-xl">
          <div className="text-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-400">Checking admin status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark p-4">
        <div className="w-full max-w-md bg-dark-lighter p-8 rounded-xl shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Admin Already Exists
            </h2>
            <p className="text-gray-400 mb-4">
              An administrator account has already been created for this
              platform.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-lg transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark p-4">
      <div className="w-full max-w-md bg-dark-lighter p-8 rounded-xl shadow-xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            Create Admin Account
          </h2>
          <p className="text-gray-400 mt-1">
            One-time administrator account setup
          </p>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-gray-400 text-sm font-medium mb-1"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="w-full bg-dark border border-gray-700 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-gray-400 text-sm font-medium mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full bg-dark border border-gray-700 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-gray-400 text-sm font-medium mb-1"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              className="w-full bg-dark border border-gray-700 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg transition-colors disabled:bg-primary/50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating Account...
              </span>
            ) : (
              "Create Admin Account"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-primary hover:text-primary/80 text-sm"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAdminPage;
