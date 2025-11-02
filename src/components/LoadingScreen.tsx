import React, { useEffect, useState } from "react";
import shortLogo from "../assets/short-logo.png";

const LoadingScreen: React.FC = () => {
  const [dots, setDots] = useState(1);

  // Create dot animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev < 3 ? prev + 1 : 1));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Soccer ball positions
  const [ballPos, setBallPos] = useState({ x: 50, y: 60 });

  useEffect(() => {
    const interval = setInterval(() => {
      setBallPos({
        x: Math.random() * 80 + 10, // 10-90%
        y: Math.random() * 50 + 45, // 45-95%
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-dark flex flex-col items-center justify-center">
      <div className="relative w-full max-w-md h-64">
        {/* Soccer ball that moves around */}
        <div
          className="absolute w-8 h-8 transform transition-all duration-1500 ease-in-out"
          style={{
            left: `${ballPos.x}%`,
            top: `${ballPos.y}%`,
            animation: "spin 2s linear infinite",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              fill="white"
            />
            <path
              d="M12.5 6.5L16 10.5L15.5 15.5L11 18L7 16L6 12L8.5 7.5L12.5 6.5Z"
              fill="black"
              fillOpacity="0.1"
            />
            <path
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              stroke="black"
              strokeWidth="1.5"
            />
            <path
              d="M12 15L9 12.5L10 9M12 15L15 12.5L14 9M12 15V18.5M10 9L12 7.5L14 9M10 9L7.5 11M14 9L16.5 11"
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="text-center absolute left-1/2 transform -translate-x-1/2">
          <div className="flex items-center justify-center mb-4">
            <img
              src={shortLogo}
              alt="MonkeyPost"
              className="h-24 w-auto animate-pulse"
              style={{
                filter: "drop-shadow(0 0 20px rgba(181, 59, 255, 0.6))",
              }}
            />
          </div>

          <div className="relative mt-8 bg-dark-light/30 rounded-lg p-4 backdrop-blur-sm border border-dark-light">
            <div className="text-gray-300 text-sm">
              Loading{".".repeat(dots)}
            </div>
            <div className="mt-2 h-1 w-full bg-dark-light overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{
                  width: "100%",
                  animation: "loading 2s ease-in-out infinite",
                  backgroundSize: "200% 100%",
                  background:
                    "linear-gradient(to right, #b53bff, #ff3bda, #b53bff)",
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}
      </style>
    </div>
  );
};

export default LoadingScreen;
