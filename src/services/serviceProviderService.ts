// Phase 9: Service Provider Service
import {
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { getStateCollection, getStateDocument, COLLECTION_NAMES } from "../utils/stateService";
import type { ServiceProvider, Service, ServiceBooking } from "../types";
import { Timestamp } from "firebase/firestore";

/**
 * Helper to remove undefined values from object (Firestore doesn't accept undefined)
 */
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date || obj instanceof Timestamp) {
    return obj;
  }

  if (obj instanceof Array) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => {
        if (item !== null && typeof item === "object" && !(item instanceof Date) && !(item instanceof Timestamp) && !(item instanceof Array)) {
          return removeUndefined(item);
        }
        return item;
      });
  }

  if (typeof obj !== "object") {
    return obj;
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value instanceof Array) {
        const cleanedArray = removeUndefined(value);
        if (cleanedArray.length > 0) {
          cleaned[key] = cleanedArray;
        }
      } else if (
        value !== null &&
        typeof value === "object" &&
        !(value instanceof Date) &&
        !(value instanceof Timestamp)
      ) {
        const cleanedNested = removeUndefined(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

/**
 * Helper to convert Firestore Timestamp to Date
 */
const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === "function") return value.toDate();
  try {
    return new Date(value);
  } catch {
    return new Date();
  }
};

// ==================== Service Provider Operations ====================

/**
 * Create a new service provider profile
 * @param providerData - Provider data (without id, timestamps)
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const createServiceProvider = async (
  providerData: Omit<ServiceProvider, "id" | "createdAt" | "updatedAt">,
  stateId: string
): Promise<string> => {
  try {
    const providerRef = getStateDocument(COLLECTION_NAMES.SERVICE_PROVIDERS, stateId);
    const cleanedData = removeUndefined({
      ...providerData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(providerRef, cleanedData);
    return providerRef.id;
  } catch (error) {
    console.error("Error creating service provider:", error);
    throw error;
  }
};

/**
 * Get service provider by ID
 * @param providerId - The provider ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getServiceProvider = async (
  providerId: string,
  stateId: string
): Promise<ServiceProvider | null> => {
  try {
    const providerDoc = await getDoc(getStateDocument(COLLECTION_NAMES.SERVICE_PROVIDERS, stateId, providerId));

    if (!providerDoc.exists()) {
      return null;
    }

    const data = providerDoc.data();

    return {
      id: providerDoc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      listingExpiry: data.listingExpiry ? toDate(data.listingExpiry) : undefined,
      availability: data.availability
        ? {
            ...data.availability,
          }
        : undefined,
    } as ServiceProvider;
  } catch (error) {
    console.error("Error getting service provider:", error);
    throw error;
  }
};

/**
 * Get service provider by user ID
 * @param userId - The user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getServiceProviderByUserId = async (
  userId: string,
  stateId: string
): Promise<ServiceProvider | null> => {
  try {
    const q = query(
      getStateCollection(COLLECTION_NAMES.SERVICE_PROVIDERS, stateId),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      listingExpiry: data.listingExpiry ? toDate(data.listingExpiry) : undefined,
      availability: data.availability
        ? {
            ...data.availability,
          }
        : undefined,
    } as ServiceProvider;
  } catch (error) {
    console.error("Error getting service provider by user ID:", error);
    throw error;
  }
};

/**
 * Get all listed service providers (for directory)
 * @param stateId - The state ID (e.g., "kaduna")
 * @param filters - Optional filters for providers
 */
export const getAllListedServiceProviders = async (
  stateId: string,
  filters?: {
    providerType?: ServiceProvider["providerType"];
    city?: string;
    minRating?: number;
  }
): Promise<ServiceProvider[]> => {
  try {
    let q = query(
      getStateCollection(COLLECTION_NAMES.SERVICE_PROVIDERS, stateId),
      where("isListed", "==", true),
      orderBy("createdAt", "desc")
    );

    if (filters?.providerType) {
      q = query(q, where("providerType", "==", filters.providerType));
    }

    const querySnapshot = await getDocs(q);
    const providers: ServiceProvider[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Apply client-side filters
      if (filters?.city) {
        const serviceArea = data.serviceArea;
        if (!serviceArea?.cities?.includes(filters.city)) {
          return;
        }
      }

      if (filters?.minRating && (!data.rating || data.rating < filters.minRating)) {
        return;
      }

      providers.push({
        id: doc.id,
        ...data,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        listingExpiry: data.listingExpiry ? toDate(data.listingExpiry) : undefined,
        availability: data.availability
          ? {
              ...data.availability,
            }
          : undefined,
      } as ServiceProvider);
    });

    return providers;
  } catch (error) {
    console.error("Error getting all listed service providers:", error);
    throw error;
  }
};

/**
 * Update service provider profile
 * @param providerId - The provider ID
 * @param updates - Partial provider data to update
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const updateServiceProvider = async (
  providerId: string,
  updates: Partial<ServiceProvider>,
  stateId: string
): Promise<void> => {
  try {
    const providerRef = getStateDocument(COLLECTION_NAMES.SERVICE_PROVIDERS, stateId, providerId);
    const cleanedUpdates = removeUndefined({
      ...updates,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(providerRef, cleanedUpdates);
  } catch (error) {
    console.error("Error updating service provider:", error);
    throw error;
  }
};

/**
 * Increment service provider views
 * @param providerId - The provider ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const incrementProviderViews = async (
  providerId: string,
  stateId: string
): Promise<void> => {
  try {
    const providerRef = getStateDocument(COLLECTION_NAMES.SERVICE_PROVIDERS, stateId, providerId);
    await updateDoc(providerRef, {
      views: increment(1),
    });
  } catch (error) {
    console.error("Error incrementing provider views:", error);
    throw error;
  }
};

// ==================== Service Operations ====================

/**
 * Add a service to a service provider
 * @param providerId - The provider ID
 * @param service - Service data (without id)
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const addServiceToProvider = async (
  providerId: string,
  service: Omit<Service, "id">,
  stateId: string
): Promise<string> => {
  try {
    const provider = await getServiceProvider(providerId, stateId);
    if (!provider) {
      throw new Error("Service provider not found");
    }

    const serviceId = `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newService: Service = {
      id: serviceId,
      ...service,
    };

    const updatedServices = [...(provider.services || []), newService];

    await updateServiceProvider(providerId, {
      services: updatedServices,
    }, stateId);

    return serviceId;
  } catch (error) {
    console.error("Error adding service to provider:", error);
    throw error;
  }
};

/**
 * Update a service for a service provider
 * @param providerId - The provider ID
 * @param serviceId - The service ID
 * @param updates - Service updates
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const updateServiceForProvider = async (
  providerId: string,
  serviceId: string,
  updates: Partial<Service>,
  stateId: string
): Promise<void> => {
  try {
    const provider = await getServiceProvider(providerId, stateId);
    if (!provider) {
      throw new Error("Service provider not found");
    }

    const updatedServices = (provider.services || []).map((service) =>
      service.id === serviceId ? { ...service, ...updates } : service
    );

    await updateServiceProvider(providerId, {
      services: updatedServices,
    }, stateId);
  } catch (error) {
    console.error("Error updating service for provider:", error);
    throw error;
  }
};

/**
 * Remove a service from a service provider
 * @param providerId - The provider ID
 * @param serviceId - The service ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const removeServiceFromProvider = async (
  providerId: string,
  serviceId: string,
  stateId: string
): Promise<void> => {
  try {
    const provider = await getServiceProvider(providerId, stateId);
    if (!provider) {
      throw new Error("Service provider not found");
    }

    const updatedServices = (provider.services || []).filter(
      (service) => service.id !== serviceId
    );

    await updateServiceProvider(providerId, {
      services: updatedServices,
    }, stateId);
  } catch (error) {
    console.error("Error removing service from provider:", error);
    throw error;
  }
};

// ==================== Service Booking Operations ====================

/**
 * Create a new service booking
 * @param bookingData - Booking data (without id, timestamps)
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const createServiceBooking = async (
  bookingData: Omit<ServiceBooking, "id" | "createdAt" | "updatedAt">,
  stateId: string
): Promise<string> => {
  try {
    const bookingRef = getStateDocument(COLLECTION_NAMES.SERVICE_BOOKINGS, stateId);
    const cleanedData = removeUndefined({
      ...bookingData,
      scheduledDate: bookingData.scheduledDate instanceof Date
        ? Timestamp.fromDate(bookingData.scheduledDate)
        : bookingData.scheduledDate,
      reviewedAt: bookingData.reviewedAt
        ? bookingData.reviewedAt instanceof Date
          ? Timestamp.fromDate(bookingData.reviewedAt)
          : bookingData.reviewedAt
        : undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(bookingRef, cleanedData);

    // Increment provider bookings count
    const providerRef = getStateDocument(COLLECTION_NAMES.SERVICE_PROVIDERS, stateId, bookingData.serviceProviderId);
    await updateDoc(providerRef, {
      bookings: increment(1),
    });

    return bookingRef.id;
  } catch (error) {
    console.error("Error creating service booking:", error);
    throw error;
  }
};

/**
 * Get service booking by ID
 * @param bookingId - The booking ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getServiceBooking = async (
  bookingId: string,
  stateId: string
): Promise<ServiceBooking | null> => {
  try {
    const bookingDoc = await getDoc(getStateDocument(COLLECTION_NAMES.SERVICE_BOOKINGS, stateId, bookingId));

    if (!bookingDoc.exists()) {
      return null;
    }

    const data = bookingDoc.data();

    return {
      id: bookingDoc.id,
      ...data,
      scheduledDate: toDate(data.scheduledDate),
      reviewedAt: data.reviewedAt ? toDate(data.reviewedAt) : undefined,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as ServiceBooking;
  } catch (error) {
    console.error("Error getting service booking:", error);
    throw error;
  }
};

/**
 * Get all bookings for a client (user who booked services)
 * @param clientId - The client user ID
 * @param stateId - The state ID (e.g., "kaduna")
 * @param status - Optional status filter
 */
export const getClientBookings = async (
  clientId: string,
  stateId: string,
  status?: ServiceBooking["status"]
): Promise<ServiceBooking[]> => {
  try {
    let q = query(
      getStateCollection(COLLECTION_NAMES.SERVICE_BOOKINGS, stateId),
      where("clientId", "==", clientId),
      orderBy("createdAt", "desc")
    );

    if (status) {
      q = query(q, where("status", "==", status));
    }

    const querySnapshot = await getDocs(q);
    const bookings: ServiceBooking[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      bookings.push({
        id: doc.id,
        ...data,
        scheduledDate: toDate(data.scheduledDate),
        reviewedAt: data.reviewedAt ? toDate(data.reviewedAt) : undefined,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as ServiceBooking);
    });

    return bookings;
  } catch (error) {
    console.error("Error getting client bookings:", error);
    throw error;
  }
};

/**
 * Get all bookings for a service provider
 * @param providerId - The provider ID
 * @param stateId - The state ID (e.g., "kaduna")
 * @param status - Optional status filter
 */
export const getProviderBookings = async (
  providerId: string,
  stateId: string,
  status?: ServiceBooking["status"]
): Promise<ServiceBooking[]> => {
  try {
    let q = query(
      getStateCollection(COLLECTION_NAMES.SERVICE_BOOKINGS, stateId),
      where("serviceProviderId", "==", providerId),
      orderBy("createdAt", "desc")
    );

    if (status) {
      q = query(q, where("status", "==", status));
    }

    const querySnapshot = await getDocs(q);
    const bookings: ServiceBooking[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      bookings.push({
        id: doc.id,
        ...data,
        scheduledDate: toDate(data.scheduledDate),
        reviewedAt: data.reviewedAt ? toDate(data.reviewedAt) : undefined,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as ServiceBooking);
    });

    return bookings;
  } catch (error) {
    console.error("Error getting provider bookings:", error);
    throw error;
  }
};

/**
 * Update service booking status
 * @param bookingId - The booking ID
 * @param status - New booking status
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const updateServiceBookingStatus = async (
  bookingId: string,
  status: ServiceBooking["status"],
  stateId: string
): Promise<void> => {
  try {
    const bookingRef = getStateDocument(COLLECTION_NAMES.SERVICE_BOOKINGS, stateId, bookingId);
    await updateDoc(bookingRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating service booking status:", error);
    throw error;
  }
};

/**
 * Add review to a completed service booking
 * @param bookingId - The booking ID
 * @param rating - Rating (1-5)
 * @param review - Review text
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const addBookingReview = async (
  bookingId: string,
  rating: number,
  review: string,
  stateId: string
): Promise<void> => {
  try {
    const booking = await getServiceBooking(bookingId, stateId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const bookingRef = getStateDocument(COLLECTION_NAMES.SERVICE_BOOKINGS, stateId, bookingId);
    await updateDoc(bookingRef, {
      rating,
      review,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update provider rating
    const provider = await getServiceProvider(booking.serviceProviderId, stateId);
    if (provider) {
      const currentRating = provider.rating || 0;
      const currentReviewCount = provider.reviewCount || 0;
      const newReviewCount = currentReviewCount + 1;
      const newRating = (currentRating * currentReviewCount + rating) / newReviewCount;

      await updateServiceProvider(booking.serviceProviderId, {
        rating: newRating,
        reviewCount: newReviewCount,
      }, stateId);
    }
  } catch (error) {
    console.error("Error adding booking review:", error);
    throw error;
  }
};

