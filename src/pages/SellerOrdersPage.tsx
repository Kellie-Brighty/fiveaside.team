// Phase 8: Seller Order Management Page
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import { getSellerOrders, getOrder, updateOrderStatus } from "../services/productService";
import { getAllProducts } from "../services/productService";
import { hasPermission } from "../utils/permissions";
import type { Order, Product } from "../types";

const SellerOrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentState } = useStateContext();
  const { orderId } = useParams<{ orderId?: string }>();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Order["status"]>("pending");
  const [filterStatus, setFilterStatus] = useState<Order["status"] | "all">("all");

  useEffect(() => {
    if (!currentUser) return;

    // Check permissions
    const canManageOrders =
      hasPermission(currentUser.role, "manage_orders") ||
      currentUser.role === "club_manager" ||
      currentUser.role === "admin" ||
      currentUser.role === "service_provider";

    if (!canManageOrders) {
      window.toast?.error("You don't have permission to manage orders");
      navigate("/");
      return;
    }

    if (!currentState) return;

    if (orderId) {
      loadSingleOrder(orderId);
    } else {
      loadData();
    }
  }, [currentUser, navigate, orderId, currentState?.id]);

  const loadSingleOrder = async (id: string) => {
    if (!currentState) {
      window.toast?.error("State not available");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [order, sellerProducts] = await Promise.all([
        getOrder(id, currentState.id),
        currentUser?.id ? getAllProducts(currentState.id, { sellerId: currentUser.id }) : Promise.resolve([]),
      ]);
      
      if (order) {
        // Verify this order contains seller's products
        const sellerProductIds = sellerProducts.map((p) => p.id);
        const hasSellerProduct = order.items.some((item) => sellerProductIds.includes(item.productId));
        
        if (hasSellerProduct) {
          setSelectedOrder(order);
          setProducts(sellerProducts);
        } else {
          window.toast?.error("Order not found or doesn't contain your products");
          navigate("/orders/seller");
        }
      } else {
        window.toast?.error("Order not found");
        navigate("/orders/seller");
      }
    } catch (error) {
      console.error("Error loading order:", error);
      window.toast?.error("Failed to load order");
      navigate("/orders/seller");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!currentState) {
      window.toast?.error("State not available");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      if (currentUser?.id) {
        const [sellerOrders, sellerProducts] = await Promise.all([
          getSellerOrders(currentUser.id, currentState.id),
          getAllProducts(currentState.id, { sellerId: currentUser.id }),
        ]);
        setOrders(sellerOrders);
        setProducts(sellerProducts);
      }
    } catch (error) {
      console.error("Error loading seller orders:", error);
      window.toast?.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !currentState) return;

    try {
      setUpdatingStatus(true);
      await updateOrderStatus(selectedOrder.id, selectedStatus, currentState.id);
      window.toast?.success("Order status updated successfully!");
      setShowStatusModal(false);
      await loadData();
      
      // Reload selected order if it's the same one
      if (selectedOrder && currentState) {
        const updatedOrder = await getOrder(selectedOrder.id, currentState.id);
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        }
      }
    } catch (error: any) {
      console.error("Error updating order status:", error);
      window.toast?.error(error.message || "Failed to update order status");
    } finally {
      setUpdatingStatus(false);
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

  // Filter orders by status
  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "all") return true;
    return order.status === filterStatus;
  });

  // Get order items that belong to this seller
  const getSellerOrderItems = (order: Order) => {
    const sellerProductIds = products.map((p) => p.id);
    return order.items.filter((item) => sellerProductIds.includes(item.productId));
  };

  // Calculate total for seller's items in an order
  const getSellerOrderTotal = (order: Order) => {
    const sellerItems = getSellerOrderItems(order);
    return sellerItems.reduce((total, item) => total + item.price * item.quantity, 0);
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
    const sellerItems = getSellerOrderItems(selectedOrder);
    const sellerTotal = getSellerOrderTotal(selectedOrder);

    return (
      <div className="min-h-screen bg-dark text-white">
        <div className="container mx-auto px-4 py-4 md:py-8">
          <div className="mb-4 md:mb-6">
            <button
              onClick={() => navigate("/orders/seller")}
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
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  Order #{selectedOrder.orderNumber}
                </h1>
                <p className="text-gray-400 text-sm md:text-base">
                  Placed on{" "}
                  {selectedOrder.createdAt && selectedOrder.createdAt instanceof Date && !isNaN(selectedOrder.createdAt.getTime())
                    ? selectedOrder.createdAt.toLocaleDateString()
                    : selectedOrder.createdAt
                    ? new Date(selectedOrder.createdAt).toLocaleDateString()
                    : "N/A"}
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

            {/* Order Items (Seller's Products Only) */}
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-bold mb-4">Your Products in This Order</h2>
              <div className="space-y-4">
                {sellerItems.map((item, index) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-700 rounded-lg gap-3"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-white text-sm md:text-base">
                          {item.productName}
                        </p>
                        <p className="text-xs md:text-sm text-gray-400">Quantity: {item.quantity}</p>
                        {item.variations && Object.keys(item.variations).length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {Object.entries(item.variations)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(", ")}
                          </p>
                        )}
                        {product && (
                          <p className="text-xs text-gray-500 mt-1">Your Product</p>
                        )}
                      </div>
                      <p className="text-white font-medium text-base md:text-lg">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer Information */}
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-bold mb-4">Customer Information</h2>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-white text-sm md:text-base">{selectedOrder.purchaserName}</p>
                <p className="text-gray-300 text-sm md:text-base">{selectedOrder.purchaserEmail}</p>
                {selectedOrder.purchaserPhone && (
                  <p className="text-gray-300 text-sm md:text-base">{selectedOrder.purchaserPhone}</p>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-bold mb-4">Shipping Address</h2>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-white text-sm md:text-base">{selectedOrder.shippingAddress.street}</p>
                <p className="text-gray-300 text-sm md:text-base">
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}
                </p>
                {selectedOrder.shippingAddress.postalCode && (
                  <p className="text-gray-300 text-sm md:text-base">
                    {selectedOrder.shippingAddress.postalCode}
                  </p>
                )}
                <p className="text-gray-300 text-sm md:text-base">
                  {selectedOrder.shippingAddress.country}
                </p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-bold mb-4">Your Revenue from This Order</h2>
              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-gray-300 text-sm md:text-base">
                  <span>Subtotal</span>
                  <span>₦{sellerTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg md:text-xl font-bold text-white pt-2 border-t border-gray-600">
                  <span>Your Total</span>
                  <span>₦{sellerTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Update Status */}
            <div>
              <h2 className="text-lg md:text-xl font-bold mb-4">Update Order Status</h2>
              <button
                onClick={() => {
                  setShowStatusModal(true);
                  setSelectedStatus(selectedOrder.status);
                }}
                className="w-full md:w-auto px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>

        {/* Status Update Modal */}
        {showStatusModal && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowStatusModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-dark rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Update Order Status</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) =>
                        setSelectedStatus(e.target.value as Order["status"])
                      }
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowStatusModal(false)}
                      className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                      disabled={updatingStatus}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateStatus}
                      disabled={updatingStatus || selectedStatus === selectedOrder.status}
                      className="flex-1 py-2 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingStatus ? "Updating..." : "Update Status"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Orders list view
  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <h1 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8">Seller Orders</h1>

        {/* Status Filter */}
        <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filterStatus === "all"
                ? "bg-primary text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            All Orders
          </button>
          {(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as Order["status"][]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filterStatus === status
                    ? "bg-primary text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )
          )}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400 mb-4 text-sm md:text-base">
              {filterStatus === "all"
                ? "No orders for your products yet"
                : `No ${filterStatus} orders for your products`}
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredOrders.map((order) => {
              const sellerItems = getSellerOrderItems(order);
              const sellerTotal = getSellerOrderTotal(order);

              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders/seller/${order.id}`)}
                  className="block bg-gray-800 rounded-lg p-4 md:p-6 hover:bg-gray-750 transition-colors cursor-pointer"
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
                        {sellerItems.length} of your product{sellerItems.length !== 1 ? "s" : ""} •{" "}
                        {order.purchaserName} • Placed on{" "}
                        {order.createdAt instanceof Date && !isNaN(order.createdAt.getTime())
                          ? order.createdAt.toLocaleDateString()
                          : "N/A"}
                      </p>
                      <p className="text-white font-bold text-base md:text-lg">
                        Your Revenue: ₦{sellerTotal.toLocaleString()}
                      </p>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerOrdersPage;

