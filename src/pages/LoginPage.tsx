import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingButton from "../components/LoadingButton";
import type { UserRole } from "../types";
import { getRoleDisplayName, getRoleDescription } from "../utils/permissions";
import shortLogo from "../assets/short-logo.png";

type AuthMode = "login" | "signup";

// Phase 2: Available roles for signup (excluding admin which has separate flow)
const SIGNUP_ROLES: UserRole[] = [
  "player",
  "referee",
  "pitch_owner",
  "spectator",
  "club_manager",
  "scout",
  "service_provider",
  "ministry_official",
  "fa_official",
  "facility_manager",
];

// Role icons mapping - SVG icons
const getRoleIcon = (role: UserRole): React.ReactElement => {
  const iconClass = "h-6 w-6";
  const icons: Record<UserRole, React.ReactElement> = {
    player: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
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
    referee: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
        />
      </svg>
    ),
    pitch_owner: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
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
    spectator: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
    club_manager: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
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
    scout: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
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
    service_provider: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    ministry_official: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
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
    fa_official: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    facility_manager: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
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
    ),
    admin: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={iconClass}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        />
      </svg>
    ),
  };
  return icons[role] || icons.player;
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [role, setRole] = useState<UserRole>("player");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Phase 2: Additional signup fields
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [bio, setBio] = useState("");
  const [scoutOrganization, setScoutOrganization] = useState("");
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        // Phase 2: Build profile data based on role
        const profileData: {
          name?: string;
          location?: {
            city: string;
            state: string;
          };
          bio?: string;
          scoutOrganization?: string;
        } = {};

        if (name.trim()) {
          profileData.name = name.trim();
        }

        if (city.trim() || state.trim()) {
          profileData.location = {
            city: city.trim() || "",
            state: state.trim() || "",
          };
        }

        if (bio.trim()) {
          profileData.bio = bio.trim();
        }

        if (role === "scout" && scoutOrganization.trim()) {
          profileData.scoutOrganization = scoutOrganization.trim();
        }

        await signup(email, password, role, profileData);
        window.toast?.success("Account created successfully!");
      } else {
        await login(email, password);
        window.toast?.success("Welcome back!");
      }
      navigate("/");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      window.toast?.error(
        error instanceof Error ? error.message : "Authentication failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img src={shortLogo} alt="MonkeyPost" className="h-20 w-auto mx-auto" />
          </div>
          <p className="text-gray-400">
            {mode === "login"
              ? "Sign in to your account"
              : "Create a new account"}
          </p>
        </div>

        <div className="bg-dark-lighter rounded-xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
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
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <>
                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
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
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Phase 2: Extended role selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      I am a:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {SIGNUP_ROLES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`p-2 rounded-lg text-sm transition-all ${
                            role === r
                              ? "bg-primary/20 border-primary text-primary border-2"
                              : "bg-dark-light border border-gray-700 hover:bg-dark-light/80 text-gray-300"
                          }`}
                          title={getRoleDescription(r)}
                        >
                          <div className="flex flex-col items-center">
                            <div className="mb-1 text-gray-300">
                              {getRoleIcon(r)}
                            </div>
                            <span className="text-xs text-center">
                              {getRoleDisplayName(r)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Role description */}
                    {role && (
                      <p className="mt-2 text-xs text-gray-400">
                        {getRoleDescription(role)}
                      </p>
                    )}
                  </div>

                  {/* Phase 2: Additional signup fields */}
                  {mode === "signup" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Full Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                          placeholder="Your full name"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                        className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                      >
                        {showAdvancedFields ? "Hide" : "Show"} Additional
                        Fields
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-4 w-4 transition-transform ${
                            showAdvancedFields ? "rotate-180" : ""
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

                      {showAdvancedFields && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                City (Optional)
                              </label>
                              <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                                placeholder="City"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                State (Optional)
                              </label>
                              <input
                                type="text"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                                placeholder="State"
                              />
                            </div>
                          </div>

                          {role === "scout" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Organization (Optional)
                              </label>
                              <input
                                type="text"
                                value={scoutOrganization}
                                onChange={(e) =>
                                  setScoutOrganization(e.target.value)
                                }
                                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                                placeholder="Scouting organization"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Bio (Optional)
                            </label>
                            <textarea
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              rows={3}
                              className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary resize-none"
                              placeholder="Tell us about yourself..."
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              <div className="pt-2">
                <LoadingButton
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  className="w-full py-3"
                >
                  {mode === "login" ? "Sign In" : "Create Account"}
                </LoadingButton>
              </div>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-primary hover:text-primary/80 text-sm"
              >
                {mode === "login"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
