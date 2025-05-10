import React, { createContext, useState, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// Default user for referee
// const defaultReferee: User = {
//   id: "referee1",
//   name: "Referee",
//   email: "referee@MonkeyPost.com",
//   role: "referee",
//   balance: 0,
//   bets: [],
//   createdAt: new Date(),
//   memberOfPitches: ["pitch1", "pitch2"],
// };

// Default user for players/spectators
// const defaultUser: User = {
//   id: "user1",
//   name: "Player",
//   email: "player@MonkeyPost.com",
//   role: "player",
//   balance: 1000,
//   bets: [],
//   createdAt: new Date(),
//   memberOfPitches: ["pitch1"],
// };

// Default user for pitch owners
// const defaultPitchOwner: User = {
//   id: "owner1",
//   name: "Pitch Owner",
//   email: "owner@MonkeyPost.com",
//   role: "pitch_owner",
//   balance: 0,
//   bets: [],
//   createdAt: new Date(),
//   memberOfPitches: ["pitch1", "pitch2"],
//   ownedPitches: ["pitch1"],
// };

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isReferee: boolean;
  isPitchOwner: boolean;
  userPitches: string[];
  ownedPitches: string[];
  isLoading: boolean;
  selectedPitchId: string | null;
  setSelectedPitchId: (pitchId: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    role: "player" | "referee" | "pitch_owner"
  ) => Promise<void>;
  logout: () => Promise<void>;
  joinPitch: (pitchId: string) => Promise<void>;
  sessionId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAuthenticated: false,
  isReferee: false,
  isPitchOwner: false,
  userPitches: [],
  ownedPitches: [],
  isLoading: true,
  selectedPitchId: null,
  setSelectedPitchId: () => {},
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  joinPitch: async () => {},
  sessionId: null,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

// Generate a unique session ID for this browser session
const generateSessionId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Date.now().toString(36)
  );
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    // Try to get existing session ID from localStorage
    const savedSessionId = localStorage.getItem("sessionId");
    if (savedSessionId) return savedSessionId;

    // Otherwise create a new one
    const newSessionId = generateSessionId();
    localStorage.setItem("sessionId", newSessionId);
    return newSessionId;
  });
  const [selectedPitchId, setSelectedPitchId] = useState<string | null>(
    localStorage.getItem("selectedPitchId")
  );

  // Check and update the active session every minute
  useEffect(() => {
    if (!currentUser || !sessionId) return;

    // Update the user's active session in Firestore
    const updateActiveSession = async () => {
      try {
        const userRef = doc(db, "users", currentUser.id);
        await updateDoc(userRef, {
          activeSession: {
            id: sessionId,
            lastActive: serverTimestamp(),
            device: navigator.userAgent,
          },
        });
      } catch (error) {
        console.error("Error updating active session:", error);
      }
    };

    // Initial update
    updateActiveSession();

    // Set up interval to update
    const interval = setInterval(updateActiveSession, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentUser, sessionId]);

  // Listen for session changes
  useEffect(() => {
    if (!currentUser || !sessionId) return;

    const userRef = doc(db, "users", currentUser.id);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();

        // If another session became active and it's not this one, log out
        if (userData.activeSession && userData.activeSession.id !== sessionId) {
          console.log("Another session detected. You will be logged out.");
          if (window.toast) {
            window.toast.warning(
              "You've been logged in on another device or browser. This session will close."
            );
          }
          // We should log out after a brief delay to allow the user to see the message
          setTimeout(() => {
            logout();
          }, 3000);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser, sessionId]);

  // Update localStorage when selectedPitchId changes
  const handleSetSelectedPitchId = (pitchId: string | null) => {
    console.log("Setting selected pitch ID to:", pitchId);
    if (pitchId) {
      localStorage.setItem("selectedPitchId", pitchId);
    } else {
      localStorage.removeItem("selectedPitchId");
    }
    setSelectedPitchId(pitchId);
  };

  const isAuthenticated = Boolean(currentUser);
  const isReferee = Boolean(currentUser?.role === "referee");
  const isPitchOwner = Boolean(currentUser?.role === "pitch_owner");
  const userPitches = currentUser?.memberOfPitches || [];
  const ownedPitches = currentUser?.ownedPitches || [];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setCurrentUser({ id: firebaseUser.uid, ...userDoc.data() } as User);

          // Update session information in Firestore
          try {
            await updateDoc(doc(db, "users", firebaseUser.uid), {
              activeSession: {
                id: sessionId,
                lastActive: serverTimestamp(),
                device: navigator.userAgent,
              },
            });
          } catch (error) {
            console.error(
              "Error updating session after auth state change:",
              error
            );
          }
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [sessionId]);

  const login = async (email: string, password: string) => {
    try {
      // Sign in with Firebase
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Update the active session in Firestore
      if (result.user) {
        try {
          await updateDoc(doc(db, "users", result.user.uid), {
            activeSession: {
              id: sessionId,
              lastActive: serverTimestamp(),
              device: navigator.userAgent,
            },
          });
        } catch (error) {
          console.error("Error updating session after login:", error);
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const signup = async (
    email: string,
    password: string,
    role: "player" | "referee" | "pitch_owner"
  ) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create user document in Firestore
      const userData: Omit<User, "id"> = {
        email: firebaseUser.email!,
        name: firebaseUser.email!.split("@")[0],
        role,
        balance: 0,
        bets: [],
        createdAt: new Date(),
        memberOfPitches: [],
        activeSession: {
          id: sessionId!,
          lastActive: new Date(),
          device: navigator.userAgent,
        },
        ...(role === "pitch_owner" ? { ownedPitches: [] } : {}),
      };

      await setDoc(doc(db, "users", firebaseUser.uid), userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // If user is logged in, clear their active session first
      if (currentUser) {
        try {
          await updateDoc(doc(db, "users", currentUser.id), {
            activeSession: null,
          });
        } catch (error) {
          console.error("Error clearing active session:", error);
        }
      }

      // Then sign out of Firebase
      await firebaseSignOut(auth);

      // Generate a new session ID for future logins
      const newSessionId = generateSessionId();
      localStorage.setItem("sessionId", newSessionId);
      setSessionId(newSessionId);
    } catch (error) {
      throw error;
    }
  };

  const joinPitch = async (pitchId: string) => {
    if (!currentUser) return;

    try {
      const userRef = doc(db, "users", currentUser.id);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const memberOfPitches = userData.memberOfPitches || [];

        if (!memberOfPitches.includes(pitchId)) {
          await setDoc(
            userRef,
            {
              ...userData,
              memberOfPitches: [...memberOfPitches, pitchId],
            },
            { merge: true }
          );
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    isReferee,
    isPitchOwner,
    userPitches,
    ownedPitches,
    isLoading,
    selectedPitchId,
    setSelectedPitchId: handleSetSelectedPitchId,
    login,
    signup,
    logout,
    joinPitch,
    sessionId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
