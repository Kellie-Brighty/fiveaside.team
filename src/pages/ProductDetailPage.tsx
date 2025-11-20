// Phase 8: Product Detail Page
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useStateContext } from "../contexts/StateContext";
import { getProduct, incrementProductViews } from "../services/productService";
import { getClub } from "../services/clubService";
import { useCart } from "../contexts/CartContext";
import type { Product, Club } from "../types";

const ProductDetailPage: React.FC = () => {
  const { currentState } = useStateContext();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<{ [key: string]: string }>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (productId && currentState) {
      loadProduct();
    }
  }, [productId, currentState?.id]);

  const loadProduct = async () => {
    if (!currentState) {
      window.toast?.error("State not available");
      setLoading(false);
      navigate("/products");
      return;
    }

    try {
      setLoading(true);
      const productData = await getProduct(productId!, currentState.id);
      if (!productData) {
        window.toast?.error("Product not found");
        navigate("/products");
        return;
      }
      setProduct(productData);
      
      // Load club if product is club-specific
      if (productData.clubId) {
        try {
          const clubData = await getClub(productData.clubId, currentState.id);
          setClub(clubData);
        } catch (error) {
          console.error("Error loading club:", error);
        }
      }
      
      // Increment views
      try {
        await incrementProductViews(productId!, currentState.id);
      } catch (error) {
        // Don't show error - this is just analytics
      }
    } catch (error) {
      console.error("Error loading product:", error);
      window.toast?.error("Failed to load product");
      navigate("/products");
    } finally {
      setLoading(false);
    }
  };

  const handleVariationChange = (variationName: string, value: string) => {
    setSelectedVariations((prev) => ({
      ...prev,
      [variationName]: value,
    }));
  };

  const getCurrentPrice = () => {
    if (!product) return 0;
    
    let basePrice = product.isOnSale && product.discountPrice
      ? product.discountPrice
      : product.price;

    // Apply price modifiers from variations
    if (product.variations && Object.keys(selectedVariations).length > 0) {
      for (const variation of product.variations) {
        const selectedValue = selectedVariations[variation.name];
        if (selectedValue) {
          const option = variation.options.find((opt) => opt.value === selectedValue);
          if (option && option.priceModifier) {
            basePrice += option.priceModifier;
          }
        }
      }
    }

    return basePrice;
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Validate stock
    if (!product.inStock) {
      window.toast?.error("Product is out of stock");
      return;
    }

    if (product.stockQuantity && quantity > product.stockQuantity) {
      window.toast?.error(`Only ${product.stockQuantity} items available`);
      return;
    }

    // Validate variations
    if (product.variations && product.variations.length > 0) {
      for (const variation of product.variations) {
        if (!selectedVariations[variation.name]) {
          window.toast?.error(`Please select ${variation.name}`);
          return;
        }
      }
    }

    try {
      setAddingToCart(true);
      addToCart(product, quantity, Object.keys(selectedVariations).length > 0 ? selectedVariations : undefined);
      window.toast?.success("Added to cart!");
    } catch (error) {
      console.error("Error adding to cart:", error);
      window.toast?.error("Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const currentPrice = getCurrentPrice();
  const originalPrice = product.isOnSale && product.discountPrice
    ? product.price
    : null;

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/products")}
          className="mb-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
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
          Back to Products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            {/* Main Image */}
            <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden mb-4">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <svg
                    className="w-24 h-24"
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
            </div>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index
                        ? "border-primary"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h1 className="text-4xl font-bold">{product.name}</h1>
              {product.clubId && club && (
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Official Club Merchandise
                  </span>
                  <Link
                    to={`/club/${club.id}`}
                    className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
                  >
                    {club.name}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
            
            {/* Category */}
            <span className="inline-block text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full mb-4">
              {product.category}
            </span>

            {/* Price */}
            <div className="mb-6">
              <p className="text-3xl font-bold text-white mb-1">
                ₦{currentPrice.toLocaleString()}
              </p>
              {originalPrice && (
                <p className="text-lg text-gray-500 line-through">
                  ₦{originalPrice.toLocaleString()}
                </p>
              )}
              {product.isOnSale && (
                <span className="inline-block mt-2 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded">
                  ON SALE
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Description</h2>
                <p className="text-gray-300 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Variations */}
            {product.variations && product.variations.length > 0 && (
              <div className="mb-6 space-y-4">
                {product.variations.map((variation) => (
                  <div key={variation.id}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {variation.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {variation.options.map((option) => {
                        const isSelected = selectedVariations[variation.name] === option.value;
                        const isOutOfStock = option.inStock === false;
                        
                        return (
                          <button
                            key={option.value}
                            onClick={() => !isOutOfStock && handleVariationChange(variation.name, option.value)}
                            disabled={isOutOfStock}
                            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/20 text-white"
                                : isOutOfStock
                                ? "border-gray-700 text-gray-500 cursor-not-allowed line-through"
                                : "border-gray-700 text-gray-300 hover:border-gray-600"
                            }`}
                          >
                            {option.value}
                            {option.priceModifier && option.priceModifier !== 0 && (
                              <span className="ml-1 text-xs">
                                ({option.priceModifier > 0 ? "+" : ""}₦{option.priceModifier.toLocaleString()})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stock Status */}
            <div className="mb-6">
              {product.inStock ? (
                <p className="text-green-400 font-medium">
                  ✓ In Stock
                  {product.stockQuantity && ` (${product.stockQuantity} available)`}
                </p>
              ) : (
                <p className="text-red-400 font-medium">✗ Out of Stock</p>
              )}
            </div>

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-300">Quantity:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
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
                        d="M20 12H4"
                      />
                    </svg>
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={product.stockQuantity || undefined}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-2 bg-gray-800 text-white rounded-lg text-center border border-gray-700 focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={product.stockQuantity ? quantity >= product.stockQuantity : false}
                    className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!product.inStock || addingToCart}
                className="w-full py-3 px-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {addingToCart ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
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
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Add to Cart
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;

