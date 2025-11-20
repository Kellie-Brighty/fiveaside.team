// Phase 8: Product Management Page - For sellers (club managers, admins)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
} from "../services/productService";
import { getClubsByManager } from "../services/clubService";
import { uploadImageToImgBB } from "../utils/imgUpload";
import { hasPermission } from "../utils/permissions";
import type { Product, ProductVariation } from "../types";

const ProductManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentState } = useStateContext();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [managedClubs, setManagedClubs] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "merchandise" as Product["category"],
    clubId: "",
    price: "",
    discountPrice: "",
    isOnSale: false,
    inStock: true,
    stockQuantity: "",
    images: [] as string[],
    variations: [] as ProductVariation[],
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    // Check permissions
    const canManageProducts =
      hasPermission(currentUser.role, "list_products") ||
      currentUser.role === "club_manager" ||
      currentUser.role === "admin" ||
      currentUser.role === "service_provider";

    if (!canManageProducts) {
      window.toast?.error("You don't have permission to manage products");
      navigate("/");
      return;
    }

    if (currentState) {
      loadProducts();
      loadManagedClubs();
    }
  }, [currentUser, navigate, currentState?.id]);

  const loadProducts = async () => {
    if (!currentState) return;
    try {
      setLoading(true);
      const filters: any = {};
      // Filter to show only products created by the current user (for non-admins)
      if (currentUser?.role === "club_manager" || currentUser?.role === "service_provider") {
        filters.sellerId = currentUser.id;
      }
      const allProducts = await getAllProducts(currentState.id, filters);
      setProducts(allProducts);
    } catch (error) {
      console.error("Error loading products:", error);
      window.toast?.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadManagedClubs = async () => {
    if (currentUser?.role === "club_manager" && currentUser.id && currentState) {
      try {
        // Get clubs where this user is the manager
        const managed = await getClubsByManager(currentUser.id, currentState.id);
        setManagedClubs(managed);
      } catch (error) {
        console.error("Error loading managed clubs:", error);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...imageFiles, ...files].slice(0, 5); // Max 5 images
    setImageFiles(newFiles);

    // Create previews
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentState) {
      window.toast?.error("State not available");
      return;
    }
    
    setSubmitting(true);

    try {
      // Upload images
      const uploadedImages: string[] = [];
      setIsUploadingImage(true);

      for (const file of imageFiles) {
        try {
          const imageUrl = await uploadImageToImgBB(file);
          uploadedImages.push(imageUrl);
        } catch (error) {
          console.error("Error uploading image:", error);
          window.toast?.error(`Failed to upload image: ${file.name}`);
        }
      }

      setIsUploadingImage(false);

      // Combine existing images with new ones
      const allImages = [...formData.images, ...uploadedImages];

      // Helper to remove undefined values (Firestore doesn't accept undefined)
      const removeUndefined = (obj: any): any => {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            cleaned[key] = value;
          }
        }
        return cleaned;
      };

      const productData = removeUndefined({
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        clubId: formData.clubId || undefined,
        price: parseFloat(formData.price),
        discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : undefined,
        isOnSale: formData.isOnSale,
        inStock: formData.inStock,
        stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : undefined,
        images: allImages,
        variations: formData.variations.length > 0 ? formData.variations : undefined,
        sellerId: currentUser!.id,
        sellerType: 
          currentUser!.role === "club_manager" ? "club" 
          : currentUser!.role === "admin" ? "admin" 
          : currentUser!.role === "service_provider" ? "vendor"
          : "vendor",
      });

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData, currentState.id);
        window.toast?.success("Product updated successfully!");
      } else {
        await createProduct(productData, currentState.id);
        window.toast?.success("Product created successfully!");
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        category: "merchandise",
        clubId: "",
        price: "",
        discountPrice: "",
        isOnSale: false,
        inStock: true,
        stockQuantity: "",
        images: [],
        variations: [],
      });
      setImageFiles([]);
      setImagePreviews([]);
      setShowCreateForm(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (error: any) {
      console.error("Error saving product:", error);
      window.toast?.error(error.message || "Failed to save product");
    } finally {
      setSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      category: product.category,
      clubId: product.clubId || "",
      price: product.price.toString(),
      discountPrice: product.discountPrice?.toString() || "",
      isOnSale: product.isOnSale,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity?.toString() || "",
      images: product.images || [],
      variations: product.variations || [],
    });
    setImageFiles([]);
    setImagePreviews([]);
    setShowCreateForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    if (!currentState) {
      window.toast?.error("State not available");
      return;
    }

    try {
      setDeletingProductId(productId);
      await deleteProduct(productId, currentState.id);
      window.toast?.success("Product deleted successfully!");
      await loadProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      window.toast?.error(error.message || "Failed to delete product");
    } finally {
      setDeletingProductId(null);
    }
  };

  const addVariation = () => {
    setFormData({
      ...formData,
      variations: [
        ...formData.variations,
        {
          id: `var-${Date.now()}`,
          name: "",
          options: [],
        },
      ],
    });
  };

  const removeVariation = (index: number) => {
    setFormData({
      ...formData,
      variations: formData.variations.filter((_, i) => i !== index),
    });
  };

  const updateVariation = (index: number, field: keyof ProductVariation, value: any) => {
    const updated = [...formData.variations];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, variations: updated });
  };

  const addVariationOption = (variationIndex: number) => {
    const updated = [...formData.variations];
    updated[variationIndex].options.push({
      value: "",
      priceModifier: 0,
      inStock: true,
      stockQuantity: undefined,
    });
    setFormData({ ...formData, variations: updated });
  };

  const removeVariationOption = (variationIndex: number, optionIndex: number) => {
    const updated = [...formData.variations];
    updated[variationIndex].options = updated[variationIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    setFormData({ ...formData, variations: updated });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Manage Products</h1>
            <p className="text-gray-400 text-sm md:text-base">Create and manage your products</p>
          </div>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setEditingProduct(null);
              setFormData({
                name: "",
                description: "",
                category: "merchandise",
                clubId: "",
                price: "",
                discountPrice: "",
                isOnSale: false,
                inStock: true,
                stockQuantity: "",
                images: [],
                variations: [],
              });
              setImageFiles([]);
              setImagePreviews([]);
            }}
            className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
          >
            {editingProduct ? "Cancel Edit" : "+ Create Product"}
          </button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">
              {editingProduct ? "Edit Product" : "Create New Product"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as Product["category"] })
                    }
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  >
                    <option value="kit">Kit</option>
                    <option value="jersey">Jersey</option>
                    <option value="boots">Boots</option>
                    <option value="equipment">Equipment</option>
                    <option value="merchandise">Merchandise</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Club Selection (for club managers) */}
              {currentUser?.role === "club_manager" && managedClubs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Club (Optional)
                  </label>
                  <select
                    value={formData.clubId}
                    onChange={(e) => setFormData({ ...formData, clubId: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  >
                    <option value="">No specific club</option>
                    {managedClubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Price (₦) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Discount Price (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discountPrice}
                    onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isOnSale}
                      onChange={(e) =>
                        setFormData({ ...formData, isOnSale: e.target.checked })
                      }
                      className="w-5 h-5 mr-2"
                    />
                    <span className="text-sm font-medium text-gray-300">On Sale</span>
                  </label>
                </div>
              </div>

              {/* Inventory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.inStock}
                      onChange={(e) =>
                        setFormData({ ...formData, inStock: e.target.checked })
                      }
                      className="w-5 h-5 mr-2"
                    />
                    <span className="text-sm font-medium text-gray-300">In Stock</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product Images (Max 5)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="w-full px-3 md:px-4 py-2 text-sm md:text-base bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                />
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 md:gap-4 mt-4 flex-wrap">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {formData.images.length > 0 && (
                  <div className="flex gap-4 mt-4 flex-wrap">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Existing ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              images: formData.images.filter((_, i) => i !== index),
                            });
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Variations */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                  <label className="text-sm font-medium text-gray-300">
                    Variations (Sizes, Colors, etc.)
                  </label>
                  <button
                    type="button"
                    onClick={addVariation}
                    className="w-full sm:w-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                  >
                    + Add Variation
                  </button>
                </div>
                {formData.variations.map((variation, varIndex) => (
                  <div
                    key={variation.id}
                    className="bg-gray-700 rounded-lg p-4 mb-4 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <input
                        type="text"
                        placeholder="Variation name (e.g., Size, Color)"
                        value={variation.name}
                        onChange={(e) =>
                          updateVariation(varIndex, "name", e.target.value)
                        }
                        className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeVariation(varIndex)}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-2">
                      {variation.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                          <input
                            type="text"
                            placeholder="Option value (e.g., Large, Red)"
                            value={option.value}
                            onChange={(e) => {
                              const updated = [...formData.variations];
                              updated[varIndex].options[optIndex].value = e.target.value;
                              setFormData({ ...formData, variations: updated });
                            }}
                            className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Price modifier"
                            step="0.01"
                            value={option.priceModifier || 0}
                            onChange={(e) => {
                              const updated = [...formData.variations];
                              updated[varIndex].options[optIndex].priceModifier =
                                parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, variations: updated });
                            }}
                            className="w-full sm:w-32 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariationOption(varIndex, optIndex)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors whitespace-nowrap"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addVariationOption(varIndex)}
                        className="w-full sm:w-auto px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                      >
                        + Add Option
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button
                  type="submit"
                  disabled={submitting || isUploadingImage}
                  className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {submitting || isUploadingImage
                    ? "Saving..."
                    : editingProduct
                    ? "Update Product"
                    : "Create Product"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingProduct(null);
                  }}
                  className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products List */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Your Products</h2>
          {products.length === 0 ? (
            <div className="text-center py-8 md:py-12 bg-gray-800 rounded-lg px-4">
              <p className="text-gray-400 mb-4 text-sm md:text-base">No products yet</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 md:px-6 py-2 md:py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
              >
                Create Your First Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-gray-800 rounded-lg overflow-hidden">
                  {product.images && product.images.length > 0 && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-40 md:h-48 object-cover"
                    />
                  )}
                  <div className="p-3 md:p-4">
                    <h3 className="font-semibold text-white mb-2 text-sm md:text-base line-clamp-2">{product.name}</h3>
                    <p className="text-xs md:text-sm text-gray-400 mb-2">
                      {product.category} • ₦{product.price.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 mb-3 md:mb-4 flex-wrap">
                      <span
                        className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                          product.inStock
                            ? "bg-green-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {product.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                      {product.isOnSale && (
                        <span className="text-xs px-2 py-1 rounded bg-red-600 text-white whitespace-nowrap">
                          SALE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="flex-1 px-3 md:px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-xs md:text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingProductId === product.id}
                        className="flex-1 px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs md:text-sm disabled:opacity-50"
                      >
                        {deletingProductId === product.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductManagementPage;

