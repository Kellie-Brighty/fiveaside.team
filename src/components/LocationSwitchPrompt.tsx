/**
 * Location Switch Prompt
 * Shows a prominent prompt in the header when authenticated user is in a different location than their primary state
 */

import React from "react";
import { useStateContext } from "../contexts/StateContext";
import { useAuth } from "../contexts/AuthContext";

const LocationSwitchPrompt: React.FC = () => {
  const { currentState, detectedLocationState, setCurrentState } = useStateContext();
  const { currentUser, isAuthenticated } = useAuth();

  // Only show for authenticated users (non-admin) when they're in a different location
  if (
    !isAuthenticated ||
    !currentUser ||
    currentUser.role === "admin" ||
    !detectedLocationState ||
    !currentState ||
    detectedLocationState.id === currentState.id
  ) {
    return null;
  }

  const handleSwitchToLocation = () => {
    setCurrentState(detectedLocationState.id);
  };

  const handleStayInPrimary = () => {
    // User chooses to stay in primary state - clear the detected location state
    // This will be handled by the context when they manually switch back
    // For now, we'll just hide the prompt by not showing it again
    // The prompt will reappear on next page refresh if they're still in different location
  };

  return (
    <div className="bg-primary/20 border-l-4 border-primary text-white px-4 py-3 mb-4 rounded-r-lg">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-primary flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              You're in <strong>{detectedLocationState.name}</strong>, but viewing <strong>{currentState.name}</strong>
            </p>
            <p className="text-xs text-gray-300 mt-0.5">
              Switch to see content for your current location?
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSwitchToLocation}
            className="px-4 py-1.5 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-md transition-colors"
          >
            Switch to {detectedLocationState.shortName}
          </button>
          <button
            onClick={handleStayInPrimary}
            className="px-4 py-1.5 bg-dark-lighter hover:bg-dark-lighter/80 text-gray-300 text-sm font-medium rounded-md transition-colors"
          >
            Stay in {currentState.shortName}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationSwitchPrompt;

