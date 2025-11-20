import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getStateConfig, getAllStates, getActiveStates, type StateConfig } from "../config/states";
import { useAuth } from "./AuthContext";
import { getStateData, type StateData } from "../services/stateService";
import { getAllClubs } from "../services/clubService";
import { searchPlayerProfiles } from "../services/playerProfileService";
import { detectUserState } from "../services/locationService";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

interface StateContextType {
  currentState: StateConfig | null; // Can be null if state unavailable
  stateData: StateData | null;
  isLoadingStateData: boolean;
  isDetectingLocation: boolean;
  detectedStateUnavailable: string | null; // State name that was detected but not available
  detectedLocationState: StateConfig | null; // For authenticated users: detected location state (if different from primary)
  setCurrentState: (stateId: string) => void;
  availableStates: StateConfig[];
}

const StateContext = createContext<StateContextType | undefined>(undefined);

export const StateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log("[StateContext] 🎬 StateProvider component mounting...");
  
  const [currentState, setCurrentStateState] = useState<StateConfig | null>(null);
  const [stateData, setStateData] = useState<StateData | null>(null);
  const [isLoadingStateData, setIsLoadingStateData] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedStateUnavailable, setDetectedStateUnavailable] = useState<string | null>(null);
  const [detectedLocationState, setDetectedLocationState] = useState<StateConfig | null>(null); // For authenticated users
  const [locationDetected, setLocationDetected] = useState(false); // Track if location detection has been attempted
  const availableStates = getAllStates();
  
  // Get auth context - Note: StateProvider wraps AuthProvider, so this will get default context initially
  // Default context has isLoading: true, so we need to check if we're actually inside AuthProvider
  const authContext = useAuth();
  const currentUser = authContext?.currentUser || null;
  // If isLoading is true but we don't have a real auth provider yet, treat it as false
  // We'll detect this by checking if we're in the default context state
  const isAuthLoading = authContext?.isLoading ?? false;
  
  console.log("[StateContext] Auth context - isLoading:", isAuthLoading, "currentUser:", currentUser?.email || "none", "authContext keys:", Object.keys(authContext || {}));
  
  // Debug: Log auth state changes
  useEffect(() => {
    console.log("[StateContext] Auth state changed - isLoading:", isAuthLoading, "currentUser:", currentUser?.email || "none");
  }, [isAuthLoading, currentUser]);

  // Debug: Log available states on mount
  useEffect(() => {
    console.log(`[StateContext] Available states:`, availableStates.map(s => `${s.id} (${s.name})`).join(', '));
  }, []);

  // Convert hex to RGB for rgba usage
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "139, 92, 246"; // Default purple fallback
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  };

  // Apply state colors to CSS variables
  const applyStateColors = (state: StateConfig) => {
    const root = document.documentElement;
    root.style.setProperty("--state-primary", state.colors.primary);
    root.style.setProperty("--state-primary-dark", state.colors.primaryDark);
    root.style.setProperty("--state-primary-light", state.colors.primaryLight);
    root.style.setProperty("--state-secondary", state.colors.secondary);
    root.style.setProperty("--state-secondary-dark", state.colors.secondaryDark);
    root.style.setProperty("--state-secondary-light", state.colors.secondaryLight);
    root.style.setProperty("--state-gradient-start", state.colors.primary);
    root.style.setProperty("--state-gradient-end", state.colors.secondary);
    // Add RGB values for rgba usage
    root.style.setProperty("--state-primary-rgb", hexToRgb(state.colors.primary));
    root.style.setProperty("--state-secondary-rgb", hexToRgb(state.colors.secondary));
  };

  // Load state: Always detect location first, then:
  // - Unauthenticated: Use detected state (if available) or show unavailable message
  // - Authenticated: Use primaryState, but detect location and show prompt if different
  useEffect(() => {
    console.log("[StateContext] useEffect triggered - isAuthLoading:", isAuthLoading, "locationDetected:", locationDetected, "currentUser:", currentUser?.email || "none");
    
    // Always detect location on mount/refresh (only once) - don't wait for auth
    // We'll handle auth state separately after location is detected
    if (!locationDetected) {
      console.log("[StateContext] 🚀 Starting location detection on app mount...");
      setIsDetectingLocation(true);
      setLocationDetected(true);
      
      detectUserState()
        .then((locationState) => {
          console.log("[StateContext] Location detection completed. Result:", locationState);
          if (locationState && locationState.stateId) {
            // Check if detected state is active
            const detectedState = getStateConfig(locationState.stateId);
            const activeStates = getActiveStates();
            console.log(`[StateContext] Detected state ID: ${locationState.stateId}, Active states:`, activeStates.map(s => s.id));
            
            if (detectedState && activeStates.some(s => s.id === detectedState.id)) {
              // State is available and active
              
              if (currentUser && currentUser.primaryState && currentUser.role !== "admin") {
                // Authenticated user: Use primaryState, but track detected location
                const userState = getStateConfig(currentUser.primaryState);
                if (userState) {
                  // User has primaryState - use it
                  setCurrentStateState(userState);
                  applyStateColors(userState);
                  localStorage.setItem("selectedStateId", userState.id);
                  
                  // If detected location is different from primaryState, show prompt
                  if (detectedState.id !== userState.id) {
                    setDetectedLocationState(detectedState);
                    console.log(`[StateContext] User in ${detectedState.name}, but primary state is ${userState.name}`);
                  } else {
                    setDetectedLocationState(null);
                  }
                  setDetectedStateUnavailable(null);
                } else {
                  // PrimaryState config not found - use detected state
                  setCurrentStateState(detectedState);
                  applyStateColors(detectedState);
                  localStorage.setItem("selectedStateId", detectedState.id);
                  setDetectedLocationState(null);
                  setDetectedStateUnavailable(null);
                }
              } else {
                // Unauthenticated user: Use detected state
                setCurrentStateState(detectedState);
                applyStateColors(detectedState);
                localStorage.setItem("selectedStateId", detectedState.id);
                setDetectedLocationState(null);
                setDetectedStateUnavailable(null);
                console.log(`[StateContext] Switched to detected state: ${detectedState.name}`);
              }
            } else {
              // State detected but not available
              setDetectedStateUnavailable(locationState.stateName);
              
              if (currentUser && currentUser.primaryState && currentUser.role !== "admin") {
                // Authenticated user: Use primaryState even if location unavailable
                const userState = getStateConfig(currentUser.primaryState);
                if (userState) {
                  setCurrentStateState(userState);
                  applyStateColors(userState);
                  localStorage.setItem("selectedStateId", userState.id);
                  setDetectedLocationState(null);
                } else {
                  // PrimaryState config not found - show unavailable
                  setCurrentStateState(null);
                  setDetectedLocationState(null);
                }
              } else {
                // Unauthenticated user: Show unavailable (no state)
                setCurrentStateState(null);
                setDetectedLocationState(null);
                console.log(`[StateContext] Detected state "${locationState.stateName}" is not available on MonkeyPost`);
              }
            }
          } else {
            // Could not detect state or state not found
            setDetectedStateUnavailable(locationState?.stateName || null);
            
            if (currentUser && currentUser.primaryState && currentUser.role !== "admin") {
              // Authenticated user: Use primaryState
              const userState = getStateConfig(currentUser.primaryState);
              if (userState) {
                setCurrentStateState(userState);
                applyStateColors(userState);
                localStorage.setItem("selectedStateId", userState.id);
                setDetectedLocationState(null);
              } else {
                // PrimaryState config not found - show unavailable
                setCurrentStateState(null);
                setDetectedLocationState(null);
              }
            } else {
              // Unauthenticated user: Show unavailable (no state)
              setCurrentStateState(null);
              setDetectedLocationState(null);
            }
          }
        })
        .catch((error) => {
          console.warn("[StateContext] Location detection failed:", error);
          
          // Try to extract state name from error if available
          const errorMessage = error instanceof Error ? error.message : String(error);
          let extractedStateName: string | null = null;
          
          // Check if error message contains state information
          if (errorMessage.includes("state") || errorMessage.includes("State")) {
            // Try to extract state name from error message
            const stateMatch = errorMessage.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+State/i);
            if (stateMatch) {
              extractedStateName = stateMatch[1] + " State";
            }
          }
          
          // If we couldn't extract state name, set a generic message
          if (!extractedStateName) {
            setDetectedStateUnavailable("Your location");
          } else {
            setDetectedStateUnavailable(extractedStateName);
          }
          
          if (currentUser && currentUser.primaryState && currentUser.role !== "admin") {
            // Authenticated user: Use primaryState
            const userState = getStateConfig(currentUser.primaryState);
            if (userState) {
              setCurrentStateState(userState);
              applyStateColors(userState);
              localStorage.setItem("selectedStateId", userState.id);
              setDetectedLocationState(null);
            } else {
              // PrimaryState config not found - show unavailable
              setCurrentStateState(null);
              setDetectedLocationState(null);
            }
          } else {
            // Unauthenticated user: Show unavailable (no state)
            setCurrentStateState(null);
            setDetectedLocationState(null);
          }
        })
        .finally(() => {
          setIsDetectingLocation(false);
          console.log("[StateContext] Location detection process finished");
        });
      
      return; // Wait for location detection to complete
    }
    
    // After location is detected, handle auth state changes
    // This runs when auth finishes loading or user changes
    if (locationDetected && !isAuthLoading) {
      console.log("[StateContext] Location already detected, checking auth state for state selection...");
      // The location detection promise handler above will have already set the state
      // This is just for logging/debugging
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAuthLoading, locationDetected]);

  // Fetch state data when currentState changes
  useEffect(() => {
    const loadStateData = async () => {
      if (!currentState || !currentState.id) return;

      try {
        setIsLoadingStateData(true);
        console.log(`[StateContext] Loading data for state: ${currentState.id}`);

        // Fetch state document from Firestore
        let data = await getStateData(currentState.id);

        // If state document doesn't exist or stats are missing, calculate them
        if (!data || !data.stats) {
          console.log(`[StateContext] Calculating stats for ${currentState.id}...`);
          
          // Calculate stats by fetching clubs and players
          const [allClubs, publicPlayers] = await Promise.all([
            getAllClubs(currentState.id),
            searchPlayerProfiles(currentState.id, { isPublic: true }),
          ]);

          const legitimateClubs = allClubs.filter((c) => c.isLegitimate).length;
          const verifiedClubs = allClubs.filter((c) => c.registrationNumber).length;

          const calculatedStats = {
            totalClubs: allClubs.length,
            totalPlayers: publicPlayers.length,
            legitimateClubs,
            verifiedClubs,
          };

          // Update state document with calculated stats (if document exists)
          try {
            const stateDocRef = doc(db, "states", currentState.id);
            // Try to update - if document doesn't exist, this will fail gracefully
            await updateDoc(stateDocRef, {
              stats: calculatedStats,
              metadata: {
                lastUpdated: serverTimestamp(),
              },
            });
            console.log(`[StateContext] Updated stats for ${currentState.id}`);
          } catch (updateError: any) {
            // If update fails because document doesn't exist, that's okay
            // The init-state script should create the document first
            if (updateError?.code === 'not-found' || updateError?.code === 5) {
              console.log(`[StateContext] State document doesn't exist for ${currentState.id}. Run: npm run init:state ${currentState.id}`);
            } else {
              console.warn(`[StateContext] Could not update state document:`, updateError);
            }
          }

          // Set state data with calculated stats
          setStateData({
            id: currentState.id,
            name: currentState.name,
            stats: calculatedStats,
          });
        } else {
          // Use existing state data
          setStateData(data);
        }
      } catch (error) {
        console.error(`[StateContext] Error loading state data for ${currentState.id}:`, error);
        setStateData(null);
      } finally {
        setIsLoadingStateData(false);
      }
    };

    loadStateData();
  }, [currentState?.id]);

  const setCurrentState = (stateId: string) => {
    const state = getStateConfig(stateId);
    if (state) {
      setCurrentStateState(state);
      localStorage.setItem("selectedStateId", stateId);
      applyStateColors(state);
      // Reset state data - will be loaded by useEffect
      setStateData(null);
      setIsLoadingStateData(true);
      console.log(`[StateContext] Switched to state: ${state.name} (${stateId})`);
    } else {
      console.warn(`[StateContext] State not found: ${stateId}`);
    }
  };

  // Apply colors when state changes
  useEffect(() => {
    if (currentState) {
      applyStateColors(currentState);
    }
  }, [currentState]);

  return (
    <StateContext.Provider value={{ 
      currentState, 
      stateData, 
      isLoadingStateData,
      isDetectingLocation,
      detectedStateUnavailable,
      detectedLocationState,
      setCurrentState, 
      availableStates 
    }}>
      {children}
    </StateContext.Provider>
  );
};

export const useStateContext = (): StateContextType => {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error("useStateContext must be used within StateProvider");
  }
  return context;
};

