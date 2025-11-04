// Phase 8: Shopping Cart Context
import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { Product } from "../types";

interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  variations?: {
    [key: string]: string; // e.g., { "Size": "Large", "Color": "Red" }
  };
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, variations?: { [key: string]: string }) => void;
  removeFromCart: (productId: string, variations?: { [key: string]: string }) => void;
  updateQuantity: (productId: string, quantity: number, variations?: { [key: string]: string }) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        // Note: We'll need to reload products from Firestore when restoring from localStorage
        // For now, we'll just restore the structure
        setItems(parsedCart);
      }
    } catch (error) {
      console.error("Error loading cart from localStorage:", error);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(items));
    } catch (error) {
      console.error("Error saving cart to localStorage:", error);
    }
  }, [items]);

  const addToCart = (
    product: Product,
    quantity: number,
    variations?: { [key: string]: string }
  ) => {
    setItems((prevItems) => {
      // Create a unique key for this cart item (productId + variations)
      const variationKey = variations
        ? JSON.stringify(Object.keys(variations).sort().map((k) => ({ [k]: variations[k] })))
        : "";

      // Check if item already exists
      const existingIndex = prevItems.findIndex((item) => {
        if (item.productId !== product.id) return false;
        const itemVariationKey = item.variations
          ? JSON.stringify(Object.keys(item.variations).sort().map((k) => ({ [k]: item.variations![k] })))
          : "";
        return itemVariationKey === variationKey;
      });

      if (existingIndex >= 0) {
        // Update quantity of existing item
        const updatedItems = [...prevItems];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + quantity,
        };
        return updatedItems;
      } else {
        // Add new item
        return [
          ...prevItems,
          {
            productId: product.id,
            product,
            quantity,
            variations,
          },
        ];
      }
    });
  };

  const removeFromCart = (productId: string, variations?: { [key: string]: string }) => {
    setItems((prevItems) => {
      const variationKey = variations
        ? JSON.stringify(Object.keys(variations).sort().map((k) => ({ [k]: variations[k] })))
        : "";

      return prevItems.filter((item) => {
        if (item.productId !== productId) return true;
        const itemVariationKey = item.variations
          ? JSON.stringify(Object.keys(item.variations).sort().map((k) => ({ [k]: item.variations![k] })))
          : "";
        return itemVariationKey !== variationKey;
      });
    });
  };

  const updateQuantity = (productId: string, quantity: number, variations?: { [key: string]: string }) => {
    if (quantity <= 0) {
      removeFromCart(productId, variations);
      return;
    }

    setItems((prevItems) => {
      const variationKey = variations
        ? JSON.stringify(Object.keys(variations).sort().map((k) => ({ [k]: variations[k] })))
        : "";

      return prevItems.map((item) => {
        const itemVariationKey = item.variations
          ? JSON.stringify(Object.keys(item.variations).sort().map((k) => ({ [k]: item.variations![k] })))
          : "";
        
        if (item.productId === productId && itemVariationKey === variationKey) {
          return { ...item, quantity };
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => {
      const price = item.product.isOnSale && item.product.discountPrice
        ? item.product.discountPrice
        : item.product.price;
      return total + price * item.quantity;
    }, 0);
  };

  const getCartItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

