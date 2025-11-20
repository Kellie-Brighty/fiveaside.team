/**
 * State-based Firestore Collection Utilities
 * 
 * This module provides utilities for accessing Firestore collections
 * organized by state using subcollections pattern:
 * states/{stateId}/clubs/{clubId}
 * states/{stateId}/leagues/{leagueId}
 * etc.
 */

import { 
  collection, 
  doc, 
  type CollectionReference, 
  type DocumentReference,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Get a state-specific collection reference
 * @param collectionName - Name of the collection (e.g., "clubs", "leagues")
 * @param stateId - The state ID (e.g., "kaduna")
 * @returns CollectionReference for the state-specific collection
 */
export const getStateCollection = (
  collectionName: string,
  stateId: string
): CollectionReference => {
  return collection(db, "states", stateId, collectionName);
};

/**
 * Get a state-specific document reference
 * @param collectionName - Name of the collection
 * @param stateId - The state ID
 * @param docId - The document ID (optional, will be auto-generated if not provided)
 * @returns DocumentReference for the state-specific document
 */
export const getStateDocument = (
  collectionName: string,
  stateId: string,
  docId?: string
): DocumentReference => {
  const collectionRef = getStateCollection(collectionName, stateId);
  return docId ? doc(collectionRef, docId) : doc(collectionRef);
};

/**
 * Get current state ID from StateContext
 * This is a helper to get stateId in service functions
 * Note: Services should receive stateId as parameter, but this can be used as fallback
 */
export const getCurrentStateId = (): string => {
  // Try to get from localStorage first
  const savedStateId = localStorage.getItem("selectedStateId");
  if (savedStateId) {
    return savedStateId;
  }
  
  // Default to "kaduna" if nothing saved
  return "kaduna";
};

/**
 * Collection names used across the app
 * Centralized to avoid typos and ensure consistency
 */
export const COLLECTION_NAMES = {
  CLUBS: "clubs",
  LEAGUES: "leagues",
  PLAYERS: "players",
  PRODUCTS: "products",
  ORDERS: "orders",
  SERVICE_PROVIDERS: "serviceProviders",
  SERVICE_BOOKINGS: "serviceBookings",
  WATCHLISTS: "watchlists",
  SAVED_SEARCHES: "savedSearches",
  PLAYER_NOTES: "playerNotes",
  SCOUT_MESSAGES: "scoutMessages",
  RECRUITMENT_RECORDS: "recruitmentRecords",
  TRANSFER_REQUESTS: "transferRequests",
  MATCHES: "matches",
  TEAMS: "teams",
  PITCHES: "pitches",
} as const;

