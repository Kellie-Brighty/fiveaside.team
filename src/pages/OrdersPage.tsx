// Phase 8: Orders Page - View user orders
import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserOrders, getOrder } from "../services/productService";
import type { Order } from "../types";

const OrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { orderId } = useParams<{ orderId?: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      if (orderId) {
        loadSingleOrder(orderId);
      } else {
        loadOrders();
      }
    }
  }, [currentUser, orderId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      if (currentUser?.id) {
        const userOrders = await getUserOrders(currentUser.id);
        setOrders(userOrders);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      window.toast?.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const loadSingleOrder = async (id: string) => {
    try {
      setLoading(true);
      const order = await getOrder(id);
      if (order) {
        setSelectedOrder(order);
      } else {
        window.toast?.error("Order not found");
      }
    } catch (error) {
      console.error("Error loading order:", error);
      window.toast?.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-600";
      case "confirmed":
        return "bg-blue-600";
      case "processing":
        return "bg-purple-600";
      case "shipped":
        return "bg-indigo-600";
      case "delivered":
        return "bg-green-600";
      case "cancelled":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

  const getPaymentStatusColor = (status: Order["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return "bg-green-600";
      case "pending":
        return "bg-yellow-600";
      case "refunded":
        return "bg-blue-600";
      default:
        return "bg-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Single order view
  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-dark text-white">
        <div className="container mx-auto px-4 py-4 md:py-8">
          <div className="mb-4 md:mb-6">
            <Link
              to="/orders"
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Orders
            </Link>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Order #{selectedOrder.orderNumber}</h1>
                <p className="text-gray-400 text-sm md:text-base">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-white text-xs md:text-sm font-medium ${getStatusColor(
                    selectedOrder.status
                  )}`}
                >
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                </span>
                <span
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-white text-xs md:text-sm font-medium ${getPaymentStatusColor(
                    selectedOrder.paymentStatus
                  )}`}
                >
                  Payment: {selectedOrder.paymentStatus}
                </span>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-bold mb-4">Order Items</h2>
              <div className="space-y-4">
                {selectedOrder.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-700 rounded-lg gap-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm md:text-base">{item.productName}</p>
                      <p className="text-xs md:text-sm text-gray-400">Quantity: {item.quantity}</p>
                      {item.variations && Object.keys(item.variations).length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {Object.entries(item.variations)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <p className="text-white font-medium text-base md:text-lg">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-bold mb-4">Shipping Address</h2>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-white text-sm md:text-base">{selectedOrder.purchaserName}</p>
                <p className="text-gray-300 text-sm md:text-base">{selectedOrder.shippingAddress.street}</p>
                <p className="text-gray-300 text-sm md:text-base">
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}
                </p>
                {selectedOrder.shippingAddress.postalCode && (
                  <p className="text-gray-300 text-sm md:text-base">
                    {selectedOrder.shippingAddress.postalCode}
                  </p>
                )}
                <p className="text-gray-300 text-sm md:text-base">{selectedOrder.shippingAddress.country}</p>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <h2 className="text-lg md:text-xl font-bold mb-4">Order Summary</h2>
              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-gray-300 text-sm md:text-base">
                  <span>Subtotal</span>
                  <span>₦{selectedOrder.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-300 text-sm md:text-base">
                  <span>Shipping</span>
                  <span>₦{selectedOrder.shipping.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg md:text-xl font-bold text-white pt-2 border-t border-gray-600">
                  <span>Total</span>
                  <span>₦{selectedOrder.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Orders list view
  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <h1 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400 mb-4 text-sm md:text-base">You haven't placed any orders yet</p>
            <Link
              to="/products"
              className="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block bg-gray-800 rounded-lg p-4 md:p-6 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-2 gap-2">
                      <h3 className="text-lg md:text-xl font-bold text-white truncate">
                        Order #{order.orderNumber}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-white text-xs font-medium whitespace-nowrap ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                        <span
                          className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-white text-xs font-medium whitespace-nowrap ${getPaymentStatusColor(
                            order.paymentStatus
                          )}`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-400 mb-2 text-xs md:text-sm">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""} • Placed on{" "}
                      {order.createdAt instanceof Date && !isNaN(order.createdAt.getTime())
                        ? order.createdAt.toLocaleDateString()
                        : "N/A"}
                    </p>
                    <p className="text-white font-bold text-base md:text-lg">₦{order.total.toLocaleString()}</p>
                  </div>
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-gray-400 flex-shrink-0 mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;

