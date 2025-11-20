// Phase 8: Products Page - Browse all products
import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStateContext } from "../contexts/StateContext";
import { getAllProducts } from "../services/productService";
import { incrementProductViews } from "../services/productService";
import { getAllClubs } from "../services/clubService";
import type { Product, Club } from "../types";

const ProductsPage: React.FC = () => {
  const { currentState } = useStateContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Product["category"] | "all">("all");
  const [selectedClubId, setSelectedClubId] = useState<string>(
    searchParams.get("club") || "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const categories: Array<Product["category"] | "all"> = [
    "all",
    "kit",
    "jersey",
    "boots",
    "equipment",
    "merchandise",
    "other",
  ];

  useEffect(() => {
    if (currentState) {
      loadProducts();
      loadClubs();
    }
  }, [selectedCategory, selectedClubId, currentState?.id]);

  useEffect(() => {
    // Sync URL param with state
    const clubParam = searchParams.get("club");
    if (clubParam && clubParam !== selectedClubId) {
      setSelectedClubId(clubParam);
    }
  }, [searchParams]);

  const loadProducts = async () => {
    if (!currentState) {
      setError("Current state not available. Cannot load products.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const filters: any = {};
      if (selectedCategory !== "all") {
        filters.category = selectedCategory;
      }
      if (selectedClubId !== "all") {
        filters.clubId = selectedClubId;
      }
      const allProducts = await getAllProducts(currentState.id, filters);
      setProducts(allProducts.filter((p) => p.inStock));
      setError(null);
    } catch (error) {
      console.error("Error loading products:", error);
      setError("Failed to load products. Please try again.");
      window.toast?.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadClubs = async () => {
    if (!currentState) return;
    try {
      setLoadingClubs(true);
      const allClubs = await getAllClubs(currentState.id);
      setClubs(allClubs);
    } catch (error) {
      console.error("Error loading clubs:", error);
    } finally {
      setLoadingClubs(false);
    }
  };

  const handleClubFilterChange = (clubId: string) => {
    setSelectedClubId(clubId);
    if (clubId === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ club: clubId });
    }
  };

  const filteredProducts = products.filter((product) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleProductClick = async (productId: string) => {
    if (!currentState) return;
    try {
      await incrementProductViews(productId, currentState.id);
    } catch (error) {
      // Don't show error - this is just analytics
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">i-Sale Marketplace</h1>
          <p className="text-gray-400">Shop authentic football kits, jerseys, boots, and equipment</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-primary focus:outline-none"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Category and Club Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 flex-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === category
                      ? "bg-primary text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {category === "all" ? "All Products" : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            {/* Club Filter */}
            <div className="flex-shrink-0">
              <select
                value={selectedClubId}
                onChange={(e) => handleClubFilterChange(e.target.value)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-primary focus:outline-none min-w-[200px]"
                disabled={loadingClubs}
              >
                <option value="all">All Clubs</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {error ? (
          <div className="text-center py-20">
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const displayPrice = product.isOnSale && product.discountPrice
                ? product.discountPrice
                : product.price;
              const originalPrice = product.isOnSale && product.discountPrice
                ? product.price
                : null;

              return (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  onClick={() => handleProductClick(product.id)}
                  className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gray-900 overflow-hidden">
                    {/* Official Club Merchandise Badge */}
                    {product.clubId && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded z-10">
                        Official
                      </div>
                    )}
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <svg
                          className="w-16 h-16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    {product.isOnSale && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                        SALE
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-white">
                          ₦{displayPrice.toLocaleString()}
                        </p>
                        {originalPrice && (
                          <p className="text-xs text-gray-500 line-through">
                            ₦{originalPrice.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                        {product.category}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;

