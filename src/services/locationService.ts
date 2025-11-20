/**
 * Location Service
 * Detects user's location and maps it to a Nigerian state
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationState {
  stateName: string;
  stateId: string | null; // Maps to our state config ID, or null if not found
}

/**
 * Get user's current location using browser Geolocation API
 */
export const getCurrentLocation = (): Promise<LocationCoordinates> => {
  return new Promise((resolve, reject) => {
    console.log("[LocationService] Requesting geolocation permission...");
    if (!navigator.geolocation) {
      console.error("[LocationService] Geolocation is not supported by this browser");
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("[LocationService] Geolocation permission granted, coordinates received");
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error(`[LocationService] Geolocation error: ${error.message} (code: ${error.code})`);
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Don't use cached position
      }
    );
  });
};

/**
 * Map Nigerian state names to our state IDs
 * Handles variations in naming (e.g., "Kaduna State" vs "Kaduna")
 */
const mapStateNameToId = (stateName: string): string | null => {
  if (!stateName) return null;
  
  // Normalize state name: lowercase, remove "state", remove hyphens, trim
  const normalized = stateName
    .toLowerCase()
    .replace(/\s*state\s*/gi, "")
    .replace(/-/g, "")
    .replace(/\s+/g, "")
    .trim();

  // Map of normalized state names to our state IDs
  const stateMap: Record<string, string> = {
    kaduna: "kaduna",
    ondo: "ondo",
    // Add more states as they're added to the app
    abia: "abia",
    adamawa: "adamawa",
    akwaibom: "akwa-ibom",
    "akwa ibom": "akwa-ibom",
    anambra: "anambra",
    bauchi: "bauchi",
    bayelsa: "bayelsa",
    benue: "benue",
    borno: "borno",
    crossriver: "cross-river",
    "cross river": "cross-river",
    delta: "delta",
    ebonyi: "ebonyi",
    edo: "edo",
    ekiti: "ekiti",
    enugu: "enugu",
    gombe: "gombe",
    imo: "imo",
    jigawa: "jigawa",
    kano: "kano",
    katsina: "katsina",
    kebbi: "kebbi",
    kogi: "kogi",
    kwara: "kwara",
    lagos: "lagos",
    nassarawa: "nassarawa",
    niger: "niger",
    ogun: "ogun",
    osun: "osun",
    oyo: "oyo",
    plateau: "plateau",
    rivers: "rivers",
    sokoto: "sokoto",
    taraba: "taraba",
    yobe: "yobe",
    zamfara: "zamfara",
    fct: "fct", // Federal Capital Territory
    abuja: "fct",
    "federal capital territory": "fct",
  };

  return stateMap[normalized] || null;
};

/**
 * Reverse geocode coordinates to get Nigerian state
 * Uses OpenStreetMap Nominatim (free, no API key required)
 */
export const getStateFromCoordinates = async (
  coordinates: LocationCoordinates
): Promise<LocationState> => {
  try {
    console.log(`[LocationService] Calling Nominatim API for lat: ${coordinates.latitude}, lon: ${coordinates.longitude}`);
    // Use Nominatim reverse geocoding API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.latitude}&lon=${coordinates.longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          "User-Agent": "MonkeyPost Football Platform", // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract state from address components
    const address = data.address || {};
    
    // Try different possible fields for state
    const stateName = 
      address.state || 
      address.region || 
      address.province ||
      address.state_district ||
      null;

    if (!stateName) {
      // Try to get country/region info as fallback
      const country = address.country || "";
      if (country.toLowerCase().includes("nigeria")) {
        // We're in Nigeria but couldn't determine state - return partial info
        throw new Error(`Could not determine state from location in ${country}`);
      }
      throw new Error("Could not determine state from location");
    }

    // Map state name to our state ID
    const stateId = mapStateNameToId(stateName);

    // Always return stateName even if stateId is null (state not in our system)
    return {
      stateName,
      stateId,
    };
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    throw error;
  }
};

/**
 * Detect user's state from their current location
 * Returns the state ID if found, or null if not available
 */
export const detectUserState = async (): Promise<LocationState | null> => {
  console.log("[LocationService] Starting location detection...");
  try {
    // Get current location
    const coordinates = await getCurrentLocation();
    console.log(`[LocationService] Detected coordinates:`, coordinates);

    // Reverse geocode to get state
    console.log("[LocationService] Reverse geocoding coordinates to state...");
    const locationState = await getStateFromCoordinates(coordinates);
    console.log(`[LocationService] ✅ Successfully detected state: ${locationState.stateName} (ID: ${locationState.stateId || 'null - not in system'})`);

    return locationState;
  } catch (error) {
    console.error("[LocationService] Error detecting user state:", error);
    
    // If we got coordinates but reverse geocoding failed, try to return partial info
    if (error instanceof Error && error.message.includes("Could not determine state")) {
      // We might have gotten coordinates but couldn't determine state
      // Return null to indicate failure, but the error message might have state info
      return null;
    }
    
    // For other errors (permission denied, network error, etc.), return null
    return null;
  }
};

