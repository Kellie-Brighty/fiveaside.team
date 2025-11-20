/**
 * State Configuration System
 * Each state has its own branding, colors, and configuration
 */

import kadunaLogo from "../assets/logos/kaduna-logo.jpeg";
import ondoLogo from "../assets/logos/ondo-logo.png";
// TODO: Add Osun logo file to assets/logos/ directory
import osunLogo from "../assets/logos/ondo-logo.png"; // Temporary placeholder - replace with osun-logo.png when available

export interface StateConfig {
  id: string;
  name: string;
  shortName: string;
  logo: string; // Path to state-specific logo (imported asset)
  title: string; // State title (will automatically append "powered by MonkeyPost")
  colors: {
    primary: string;
    secondary: string;
    primaryDark: string;
    secondaryDark: string;
    primaryLight: string;
    secondaryLight: string;
  };
  isActive: boolean; // Whether this state is currently active/onboarded
}

/**
 * All Nigerian States Configuration
 * Initially only Kaduna is active
 */
export const NIGERIAN_STATES: StateConfig[] = [
  {
    id: "kaduna",
    name: "Kaduna State",
    shortName: "Kaduna",
    logo: kadunaLogo, // State-specific logo from assets
    title: "Grassroots sports management system", // Will display as "Kaduna State Football Platform powered by MonkeyPost"
    colors: {
      primary: "#1E3A8A", // Royal blue (from Kaduna coat of arms shield - more accurate)
      secondary: "#D97706", // Rich amber/gold (from Kaduna coat of arms shield and scroll - more accurate)
      primaryDark: "#1E40AF", // Darker royal blue
      secondaryDark: "#B45309", // Darker amber
      primaryLight: "#3B82F6", // Lighter royal blue
      secondaryLight: "#F59E0B", // Lighter amber/gold
    },
    isActive: true, // Kaduna is the initial active state
  },
  {
    id: "ondo",
    name: "Ondo State",
    shortName: "Ondo",
    logo: ondoLogo, // State-specific logo from assets
    title: "Ondo State Football Platform", // Will display as "Ondo State Football Platform powered by MonkeyPost"
    colors: {
      primary: "#FF6B35", // Vibrant orange (from Ondo logo - prominent color for "Ondo" text, stars, and sun rays)
      secondary: "#10B981", // Green (from Ondo logo - used for "STATE" and "ISÉ LOÒGÙN ISÉ" text)
      primaryDark: "#E55A2B", // Darker orange
      secondaryDark: "#059669", // Darker green
      primaryLight: "#FF8C5A", // Lighter orange
      secondaryLight: "#34D399", // Lighter green
    },
    isActive: true, // Ondo is now active
  },
  {
    id: "osun",
    name: "Osun State",
    shortName: "Osun",
    logo: osunLogo, // TODO: Replace with actual Osun logo when available
    title: "Osun State Football Platform", // Will display as "Osun State Football Platform powered by MonkeyPost"
    colors: {
      primary: "#059669", // Green (representing agriculture and natural resources - Osun's primary economic activity)
      secondary: "#F59E0B", // Gold/amber (representing prosperity and the state's rich cultural heritage)
      primaryDark: "#047857", // Darker green
      secondaryDark: "#D97706", // Darker gold
      primaryLight: "#10B981", // Lighter green
      secondaryLight: "#FBBF24", // Lighter gold
    },
    isActive: false, // Osun is currently inactive
  },
  // Add other states as they come on board
];

/**
 * Get state configuration by ID
 */
export const getStateConfig = (stateId: string): StateConfig | undefined => {
  return NIGERIAN_STATES.find((state) => state.id === stateId);
};

/**
 * Get default/active state (first active state)
 */
export const getDefaultState = (): StateConfig => {
  const activeState = NIGERIAN_STATES.find((state) => state.isActive);
  return activeState || NIGERIAN_STATES[0]; // Fallback to first state
};

/**
 * Get all active states
 */
export const getActiveStates = (): StateConfig[] => {
  return NIGERIAN_STATES.filter((state) => state.isActive);
};

/**
 * Get all states (for dropdown selection)
 */
export const getAllStates = (): StateConfig[] => {
  return NIGERIAN_STATES;
};

