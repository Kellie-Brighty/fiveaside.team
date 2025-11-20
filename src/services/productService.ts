// Phase 8: Product Service for E-commerce (i-Sale)
import {
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  increment,
} from "firebase/firestore";
import { getStateCollection, getStateDocument, COLLECTION_NAMES } from "../utils/stateService";
import type { Product, Order } from "../types";
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
    // Clean array: remove undefined values and recursively clean nested objects
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
        // Clean arrays recursively
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
        // Only include nested object if it has properties
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
 * Get product by ID
 * @param productId - The product ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getProduct = async (productId: string, stateId: string): Promise<Product | null> => {
  try {
    const productDoc = await getDoc(getStateDocument(COLLECTION_NAMES.PRODUCTS, stateId, productId));
    
    if (!productDoc.exists()) {
      return null;
    }

    const data = productDoc.data();
    
    // Helper to convert Firestore Timestamp to Date
    const toDate = (value: any): Date => {
      if (!value) return new Date();
      if (value instanceof Date) return value;
      if (value && typeof value.toDate === "function") return value.toDate();
      return new Date(value);
    };
    
    return {
      id: productDoc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as Product;
  } catch (error) {
    console.error("Error getting product:", error);
    throw error;
  }
};

/**
 * Get all products
 * @param stateId - The state ID (e.g., "kaduna")
 * @param filters - Optional filters for products
 */
export const getAllProducts = async (
  stateId: string,
  filters?: {
    category?: Product["category"];
    clubId?: string;
    sellerId?: string;
    inStock?: boolean;
  }
): Promise<Product[]> => {
  try {
    let productsQuery = query(getStateCollection(COLLECTION_NAMES.PRODUCTS, stateId), orderBy("createdAt", "desc"));

    if (filters?.category) {
      productsQuery = query(productsQuery, where("category", "==", filters.category));
    }
    if (filters?.clubId) {
      productsQuery = query(productsQuery, where("clubId", "==", filters.clubId));
    }
    if (filters?.sellerId) {
      productsQuery = query(productsQuery, where("sellerId", "==", filters.sellerId));
    }
    if (filters?.inStock !== undefined) {
      productsQuery = query(productsQuery, where("inStock", "==", filters.inStock));
    }

    const querySnapshot = await getDocs(productsQuery);
    const products: Product[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Helper to convert Firestore Timestamp to Date
      const toDate = (value: any): Date => {
        if (!value) return new Date();
        if (value instanceof Date) return value;
        if (value && typeof value.toDate === "function") return value.toDate();
        return new Date(value);
      };
      
      products.push({
        id: doc.id,
        ...data,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as Product);
    });

    return products;
  } catch (error) {
    console.error("Error getting all products:", error);
    throw error;
  }
};

/**
 * Create a new product
 * @param productData - Product data (without id, timestamps, etc.)
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const createProduct = async (
  productData: Omit<Product, "id" | "createdAt" | "updatedAt" | "views" | "sales">,
  stateId: string
): Promise<Product> => {
  try {
    const newProductRef = getStateDocument(COLLECTION_NAMES.PRODUCTS, stateId);

    // Remove undefined values from productData first
    const cleanedProductDataInput = removeUndefined(productData);

    const productToCreate = {
      ...cleanedProductDataInput,
      id: newProductRef.id,
      views: 0,
      sales: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Remove undefined values again after combining with metadata
    const cleanedProductData = removeUndefined(productToCreate);

    await setDoc(newProductRef, cleanedProductData);

    return {
      ...productToCreate,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Product;
  } catch (error) {
    console.error("Error creating product:", error);
    throw error;
  }
};

/**
 * Update product
 * @param productId - The product ID
 * @param updates - Partial product data to update
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const updateProduct = async (
  productId: string,
  updates: Partial<Product>,
  stateId: string
): Promise<void> => {
  try {
    const productRef = getStateDocument(COLLECTION_NAMES.PRODUCTS, stateId, productId);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Remove undefined values before saving to Firestore
    const cleanedUpdateData = removeUndefined(updateData);

    await updateDoc(productRef, cleanedUpdateData);
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

/**
 * Delete product
 * @param productId - The product ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const deleteProduct = async (productId: string, stateId: string): Promise<void> => {
  try {
    await deleteDoc(getStateDocument(COLLECTION_NAMES.PRODUCTS, stateId, productId));
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

/**
 * Increment product views
 * @param productId - The product ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const incrementProductViews = async (productId: string, stateId: string): Promise<void> => {
  try {
    const productRef = getStateDocument(COLLECTION_NAMES.PRODUCTS, stateId, productId);
    await updateDoc(productRef, {
      views: increment(1),
    });
  } catch (error) {
    console.error("Error incrementing product views:", error);
    // Don't throw - this is just analytics
  }
};

/**
 * Update product stock
 * @param productId - The product ID
 * @param quantityChange - Change in quantity (negative for decrease)
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const updateProductStock = async (
  productId: string,
  quantityChange: number,
  stateId: string
): Promise<void> => {
  try {
    const product = await getProduct(productId, stateId);
    if (!product) {
      throw new Error("Product not found");
    }

    const newQuantity = (product.stockQuantity || 0) + quantityChange;
    
    await updateProduct(productId, {
      stockQuantity: newQuantity,
      inStock: newQuantity > 0,
    }, stateId);
  } catch (error) {
    console.error("Error updating product stock:", error);
    throw error;
  }
};

/**
 * Create an order
 * @param orderData - Order data (without id, orderNumber, createdAt)
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const createOrder = async (
  orderData: Omit<Order, "id" | "orderNumber" | "createdAt">,
  stateId: string
): Promise<Order> => {
  try {
    const newOrderRef = getStateDocument(COLLECTION_NAMES.ORDERS, stateId);
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const orderToCreate = {
      ...orderData,
      id: newOrderRef.id,
      orderNumber,
      createdAt: serverTimestamp(),
    };

    // Remove undefined values before saving to Firestore
    const cleanedOrderData = removeUndefined(orderToCreate);

    await setDoc(newOrderRef, cleanedOrderData);

    // Update product stock for each item
    for (const item of orderData.items) {
      try {
        await updateProductStock(item.productId, -item.quantity, stateId);
      } catch (error) {
        console.error(`Error updating stock for product ${item.productId}:`, error);
        // Continue with other items even if one fails
      }
    }

    // Update product sales count
    for (const item of orderData.items) {
      try {
        const productRef = getStateDocument(COLLECTION_NAMES.PRODUCTS, stateId, item.productId);
        await updateDoc(productRef, {
          sales: increment(item.quantity),
        });
      } catch (error) {
        console.error(`Error updating sales for product ${item.productId}:`, error);
      }
    }

    return {
      ...orderToCreate,
      createdAt: new Date(),
    } as Order;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};

/**
 * Get order by ID
 * @param orderId - The order ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getOrder = async (orderId: string, stateId: string): Promise<Order | null> => {
  try {
    const orderDoc = await getDoc(getStateDocument(COLLECTION_NAMES.ORDERS, stateId, orderId));
    
    if (!orderDoc.exists()) {
      return null;
    }

    const data = orderDoc.data();
    
    // Helper to convert Firestore Timestamp to Date
    const toDate = (value: any): Date | undefined => {
      if (!value) return undefined;
      if (value instanceof Date) return value;
      if (value && typeof value.toDate === "function") return value.toDate();
      try {
        return new Date(value);
      } catch {
        return undefined;
      }
    };
    
    const createdAtDate = toDate(data.createdAt);
    const confirmedAtDate = toDate(data.confirmedAt);
    const shippedAtDate = toDate(data.shippedAt);
    const deliveredAtDate = toDate(data.deliveredAt);
    
    return {
      id: orderDoc.id,
      ...data,
      createdAt: createdAtDate && !isNaN(createdAtDate.getTime()) ? createdAtDate : new Date(),
      confirmedAt: confirmedAtDate && !isNaN(confirmedAtDate.getTime()) ? confirmedAtDate : undefined,
      shippedAt: shippedAtDate && !isNaN(shippedAtDate.getTime()) ? shippedAtDate : undefined,
      deliveredAt: deliveredAtDate && !isNaN(deliveredAtDate.getTime()) ? deliveredAtDate : undefined,
    } as Order;
  } catch (error) {
    console.error("Error getting order:", error);
    throw error;
  }
};

/**
 * Get orders for a user
 * @param userId - The user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getUserOrders = async (userId: string, stateId: string): Promise<Order[]> => {
  try {
    const ordersQuery = query(
      getStateCollection(COLLECTION_NAMES.ORDERS, stateId),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(ordersQuery);
    const orders: Order[] = [];

    // Helper to convert Firestore Timestamp to Date
    const toDate = (value: any): Date | undefined => {
      if (!value) return undefined;
      if (value instanceof Date) return value;
      if (value && typeof value.toDate === "function") return value.toDate();
      try {
        return new Date(value);
      } catch {
        return undefined;
      }
    };

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAtDate = toDate(data.createdAt);
      const confirmedAtDate = toDate(data.confirmedAt);
      const shippedAtDate = toDate(data.shippedAt);
      const deliveredAtDate = toDate(data.deliveredAt);
      
      orders.push({
        id: doc.id,
        ...data,
        createdAt: createdAtDate && !isNaN(createdAtDate.getTime()) ? createdAtDate : new Date(),
        confirmedAt: confirmedAtDate && !isNaN(confirmedAtDate.getTime()) ? confirmedAtDate : undefined,
        shippedAt: shippedAtDate && !isNaN(shippedAtDate.getTime()) ? shippedAtDate : undefined,
        deliveredAt: deliveredAtDate && !isNaN(deliveredAtDate.getTime()) ? deliveredAtDate : undefined,
      } as Order);
    });

    return orders;
  } catch (error) {
    console.error("Error getting user orders:", error);
    throw error;
  }
};

/**
 * Get orders for a seller (orders containing their products)
 * @param sellerId - The seller ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getSellerOrders = async (sellerId: string, stateId: string): Promise<Order[]> => {
  try {
    // Get all products by this seller
    const sellerProducts = await getAllProducts(stateId, { sellerId });
    const productIds = sellerProducts.map((p) => p.id);

    if (productIds.length === 0) {
      return [];
    }

    // Get all orders and filter by products
    const ordersQuery = query(
      getStateCollection(COLLECTION_NAMES.ORDERS, stateId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(ordersQuery);
    const orders: Order[] = [];

    // Helper to convert Firestore Timestamp to Date
    const toDate = (value: any): Date | undefined => {
      if (!value) return undefined;
      if (value instanceof Date) return value;
      if (value && typeof value.toDate === "function") return value.toDate();
      try {
        return new Date(value);
      } catch {
        return undefined;
      }
    };

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Check if this order contains any of the seller's products
      const orderItems = data.items || [];
      const hasSellerProduct = orderItems.some((item: any) =>
        productIds.includes(item.productId)
      );

      if (hasSellerProduct) {
        const createdAtDate = toDate(data.createdAt);
        const confirmedAtDate = toDate(data.confirmedAt);
        const shippedAtDate = toDate(data.shippedAt);
        const deliveredAtDate = toDate(data.deliveredAt);
        
        orders.push({
          id: doc.id,
          ...data,
          createdAt: createdAtDate && !isNaN(createdAtDate.getTime()) ? createdAtDate : new Date(),
          confirmedAt: confirmedAtDate && !isNaN(confirmedAtDate.getTime()) ? confirmedAtDate : undefined,
          shippedAt: shippedAtDate && !isNaN(shippedAtDate.getTime()) ? shippedAtDate : undefined,
          deliveredAt: deliveredAtDate && !isNaN(deliveredAtDate.getTime()) ? deliveredAtDate : undefined,
        } as Order);
      }
    });

    return orders;
  } catch (error) {
    console.error("Error getting seller orders:", error);
    throw error;
  }
};

/**
 * Update order status
 * @param orderId - The order ID
 * @param status - New order status
 * @param paymentStatus - Optional payment status
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const updateOrderStatus = async (
  orderId: string,
  status: Order["status"],
  stateId: string,
  paymentStatus?: Order["paymentStatus"]
): Promise<void> => {
  try {
    const orderRef = getStateDocument(COLLECTION_NAMES.ORDERS, stateId, orderId);
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    if (status === "confirmed") {
      updateData.confirmedAt = serverTimestamp();
    } else if (status === "shipped") {
      updateData.shippedAt = serverTimestamp();
    } else if (status === "delivered") {
      updateData.deliveredAt = serverTimestamp();
    }

    // Remove undefined values before saving to Firestore
    const cleanedUpdateData = removeUndefined(updateData);

    await updateDoc(orderRef, cleanedUpdateData);
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

