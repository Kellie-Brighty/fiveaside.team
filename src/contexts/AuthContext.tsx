import React, { createContext, useState, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// Default user for referee
const defaultReferee: User = {
  id: "referee1",
  name: "Referee",
  email: "referee@Fiveaside.team",
  role: "referee",
  balance: 0,
  bets: [],
  createdAt: new Date(),
  memberOfPitches: ["pitch1", "pitch2"],
};

// Default user for players/spectators
const defaultUser: User = {
  id: "user1",
  name: "Player",
  email: "player@Fiveaside.team",
  role: "player",
  balance: 1000,
  bets: [],
  createdAt: new Date(),
  memberOfPitches: ["pitch1"],
};

// Default user for pitch owners
const defaultPitchOwner: User = {
  id: "owner1",
  name: "Pitch Owner",
  email: "owner@Fiveaside.team",
  role: "pitch_owner",
  balance: 0,
  bets: [],
  createdAt: new Date(),
  memberOfPitches: ["pitch1", "pitch2"],
  ownedPitches: ["pitch1"],
};

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isReferee: boolean;
  isPitchOwner: boolean;
  userPitches: string[];
  ownedPitches: string[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    role: "player" | "referee" | "pitch_owner"
  ) => Promise<void>;
  logout: () => Promise<void>;
  joinPitch: (pitchId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAuthenticated: false,
  isReferee: false,
  isPitchOwner: false,
  userPitches: [],
  ownedPitches: [],
  isLoading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  joinPitch: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
        ...(role === "pitch_owner" ? { ownedPitches: [] } : {}),
      };

      await setDoc(doc(db, "users", firebaseUser.uid), userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
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
    login,
    signup,
    logout,
    joinPitch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
