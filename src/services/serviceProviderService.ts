// Phase 9: Service Provider Service
import {
  collection,
  doc,
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
import { db } from "../firebase";
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
 */
export const createServiceProvider = async (
  providerData: Omit<ServiceProvider, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  try {
    const providerRef = doc(collection(db, "serviceProviders"));
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
 */
export const getServiceProvider = async (
  providerId: string
): Promise<ServiceProvider | null> => {
  try {
    const providerDoc = await getDoc(doc(db, "serviceProviders", providerId));

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
 */
export const getServiceProviderByUserId = async (
  userId: string
): Promise<ServiceProvider | null> => {
  try {
    const q = query(
      collection(db, "serviceProviders"),
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
 */
export const getAllListedServiceProviders = async (
  filters?: {
    providerType?: ServiceProvider["providerType"];
    city?: string;
    state?: string;
    minRating?: number;
  }
): Promise<ServiceProvider[]> => {
  try {
    let q = query(
      collection(db, "serviceProviders"),
      where("isListed", "==", true),
      orderBy("createdAt", "desc")
    );

    if (filters?.providerType) {
      q = query(q, where("providerType", "==", filters.providerType));
    }

    if (filters?.state) {
      q = query(q, where("serviceArea.state", "==", filters.state));
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
 */
export const updateServiceProvider = async (
  providerId: string,
  updates: Partial<ServiceProvider>
): Promise<void> => {
  try {
    const providerRef = doc(db, "serviceProviders", providerId);
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
 */
export const incrementProviderViews = async (
  providerId: string
): Promise<void> => {
  try {
    const providerRef = doc(db, "serviceProviders", providerId);
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
 */
export const addServiceToProvider = async (
  providerId: string,
  service: Omit<Service, "id">
): Promise<string> => {
  try {
    const provider = await getServiceProvider(providerId);
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
    });

    return serviceId;
  } catch (error) {
    console.error("Error adding service to provider:", error);
    throw error;
  }
};

/**
 * Update a service for a service provider
 */
export const updateServiceForProvider = async (
  providerId: string,
  serviceId: string,
  updates: Partial<Service>
): Promise<void> => {
  try {
    const provider = await getServiceProvider(providerId);
    if (!provider) {
      throw new Error("Service provider not found");
    }

    const updatedServices = (provider.services || []).map((service) =>
      service.id === serviceId ? { ...service, ...updates } : service
    );

    await updateServiceProvider(providerId, {
      services: updatedServices,
    });
  } catch (error) {
    console.error("Error updating service for provider:", error);
    throw error;
  }
};

/**
 * Remove a service from a service provider
 */
export const removeServiceFromProvider = async (
  providerId: string,
  serviceId: string
): Promise<void> => {
  try {
    const provider = await getServiceProvider(providerId);
    if (!provider) {
      throw new Error("Service provider not found");
    }

    const updatedServices = (provider.services || []).filter(
      (service) => service.id !== serviceId
    );

    await updateServiceProvider(providerId, {
      services: updatedServices,
    });
  } catch (error) {
    console.error("Error removing service from provider:", error);
    throw error;
  }
};

// ==================== Service Booking Operations ====================

/**
 * Create a new service booking
 */
export const createServiceBooking = async (
  bookingData: Omit<ServiceBooking, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  try {
    const bookingRef = doc(collection(db, "serviceBookings"));
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
    const providerRef = doc(db, "serviceProviders", bookingData.serviceProviderId);
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
 */
export const getServiceBooking = async (
  bookingId: string
): Promise<ServiceBooking | null> => {
  try {
    const bookingDoc = await getDoc(doc(db, "serviceBookings", bookingId));

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
 */
export const getClientBookings = async (
  clientId: string,
  status?: ServiceBooking["status"]
): Promise<ServiceBooking[]> => {
  try {
    let q = query(
      collection(db, "serviceBookings"),
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
 */
export const getProviderBookings = async (
  providerId: string,
  status?: ServiceBooking["status"]
): Promise<ServiceBooking[]> => {
  try {
    let q = query(
      collection(db, "serviceBookings"),
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
 */
export const updateServiceBookingStatus = async (
  bookingId: string,
  status: ServiceBooking["status"]
): Promise<void> => {
  try {
    const bookingRef = doc(db, "serviceBookings", bookingId);
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
 */
export const addBookingReview = async (
  bookingId: string,
  rating: number,
  review: string
): Promise<void> => {
  try {
    const booking = await getServiceBooking(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const bookingRef = doc(db, "serviceBookings", bookingId);
    await updateDoc(bookingRef, {
      rating,
      review,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update provider rating
    const provider = await getServiceProvider(booking.serviceProviderId);
    if (provider) {
      const currentRating = provider.rating || 0;
      const currentReviewCount = provider.reviewCount || 0;
      const newReviewCount = currentReviewCount + 1;
      const newRating = (currentRating * currentReviewCount + rating) / newReviewCount;

      await updateServiceProvider(booking.serviceProviderId, {
        rating: newRating,
        reviewCount: newReviewCount,
      });
    }
  } catch (error) {
    console.error("Error adding booking review:", error);
    throw error;
  }
};

