import React, { useState, useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 5000,
  onClose,
}) => {
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);
  const [shake, setShake] = useState(false);

  // Handle progress bar animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prevProgress - 100 / (duration / 100);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [duration]);

  // Handle auto-close
  useEffect(() => {
    if (progress <= 0) {
      setIsExiting(true);
      const timeout = setTimeout(() => {
        onClose();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, onClose]);

  // Add shake effect for error toasts
  useEffect(() => {
    if (type === "error") {
      setShake(true);
      const timeout = setTimeout(() => {
        setShake(false);
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [type]);

  const icons = {
    success: (
      <svg
        className="w-7 h-7 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    error: (
      <svg
        className="w-7 h-7 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    warning: (
      <svg
        className="w-7 h-7 text-yellow-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
      <svg
        className="w-7 h-7 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  const bgColors = {
    success: "bg-green-100 dark:bg-green-900/30",
    error: "bg-red-100 dark:bg-red-900/30",
    warning: "bg-yellow-100 dark:bg-yellow-900/30",
    info: "bg-blue-100 dark:bg-blue-900/30",
  };

  const borderColors = {
    success: "border-green-500",
    error: "border-red-500",
    warning: "border-yellow-500",
    info: "border-blue-500",
  };

  // Achievement badge for success messages
  const renderAchievementBadge = () => {
    if (type === "success") {
      return (
        <div className="absolute -top-3 -right-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-1 animate-spin-slow">
          <svg
            className="w-5 h-5 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`
        fixed top-5 right-5 w-auto min-w-[300px] max-w-[90vw] md:max-w-[500px] transform transition-all duration-500 z-50
        ${
          isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
        }
        ${shake ? "animate-shake" : ""}
      `}
    >
      <div
        className={`
        relative overflow-hidden p-4 mb-4 rounded-lg shadow-lg border-l-4 
        backdrop-blur-md dark:bg-dark-lighter/80 w-full
        ${bgColors[type]} ${borderColors[type]}
      `}
      >
        {renderAchievementBadge()}

        <div className="flex items-start">
          <div className="flex-shrink-0">{icons[type]}</div>
          <div className="ml-3 flex-1 pt-0.5 break-words">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={() => setIsExiting(true)}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Custom progress bar */}
        <div className="h-1 w-full bg-gray-200 absolute bottom-0 left-0">
          <div
            className={`h-full ${
              type === "success"
                ? "bg-green-500"
                : type === "error"
                ? "bg-red-500"
                : type === "warning"
                ? "bg-yellow-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

// Toast container and controller
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Function to add a new toast
  const showToast = (
    message: string,
    type: ToastType = "info",
    duration = 5000
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    // Add sound effect based on type
    const audio = new Audio(
      type === "success"
        ? "/sounds/success.mp3"
        : type === "error"
        ? "/sounds/error.mp3"
        : type === "warning"
        ? "/sounds/warning.mp3"
        : "/sounds/info.mp3"
    );

    // If audio file doesn't exist, this will fail silently
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Fail silently if audio cannot be played
    });
  };

  // Function to remove a toast
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Make the functions available globally
  useEffect(() => {
    (window as any).toast = {
      success: (message: string, duration?: number) =>
        showToast(message, "success", duration),
      error: (message: string, duration?: number) =>
        showToast(message, "error", duration),
      warning: (message: string, duration?: number) =>
        showToast(message, "warning", duration),
      info: (message: string, duration?: number) =>
        showToast(message, "info", duration),
    };
  }, []);

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
};

export { ToastContainer };

// Add type definitions to window
declare global {
  interface Window {
    toast: {
      success: (message: string, duration?: number) => void;
      error: (message: string, duration?: number) => void;
      warning: (message: string, duration?: number) => void;
      info: (message: string, duration?: number) => void;
    };
  }
}
