/**
 * State Unavailable Banner
 * Shows a message when user's detected state is not available on MonkeyPost
 */

import React from "react";
import { useStateContext } from "../contexts/StateContext";

const StateUnavailableBanner: React.FC = () => {
  const { detectedStateUnavailable, isDetectingLocation } = useStateContext();

  if (isDetectingLocation || !detectedStateUnavailable) {
    return null;
  }

  return (
    <div className="bg-yellow-500/20 border-l-4 border-yellow-500 text-yellow-200 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-300 mb-1">
            {detectedStateUnavailable} is not available on MonkeyPost yet
          </h3>
          <p className="text-sm text-yellow-200/80">
            We detected you're in <strong>{detectedStateUnavailable}</strong>, but this state hasn't been onboarded to MonkeyPost yet. 
            You're currently viewing data for another state. We're working on expanding to more states soon!
          </p>
        </div>
      </div>
    </div>
  );
};

export default StateUnavailableBanner;

