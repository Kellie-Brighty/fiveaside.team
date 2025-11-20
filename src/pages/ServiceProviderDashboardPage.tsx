// Phase 9: Service Provider Dashboard - Manage Profile and Services
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import {
  getServiceProviderByUserId,
  updateServiceProvider,
  addServiceToProvider,
  updateServiceForProvider,
  removeServiceFromProvider,
} from "../services/serviceProviderService";
import type { ServiceProvider, Service } from "../types";
import LoadingButton from "../components/LoadingButton";

const ServiceProviderDashboardPage: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const { currentState } = useStateContext();
  const navigate = useNavigate();

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    specialization: "",
    experienceYears: "",
    bio: "",
    hourlyRate: "",
    fixedRate: "",
    isListed: true,
    isAvailable: true,
    state: "",
    cities: [] as string[],
    cityInput: "",
    radius: "",
    availabilityDays: [] as string[],
  });

  // Service form state
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    duration: "",
    price: "",
    serviceType: "fixed" as Service["serviceType"],
  });

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    if (!isLoading && currentUser && currentState) {
      loadProvider();
    }
  }, [currentUser, isLoading, currentState?.id]);

  const loadProvider = async () => {
    if (!currentUser || !currentState) return;

    try {
      setLoading(true);
      const providerData = await getServiceProviderByUserId(currentUser.id, currentState.id);

      if (!providerData) {
        window.toast?.info("You don't have a service provider profile yet");
        navigate("/service-providers/register");
        return;
      }

      setProvider(providerData);
      setFormData({
        specialization: providerData.specialization || "",
        experienceYears: providerData.experienceYears?.toString() || "",
        bio: providerData.bio || "",
        hourlyRate: providerData.hourlyRate?.toString() || "",
        fixedRate: providerData.fixedRate?.toString() || "",
        isListed: providerData.isListed,
        isAvailable: providerData.availability?.isAvailable ?? true,
        state: providerData.serviceArea?.state || "",
        cities: providerData.serviceArea?.cities || [],
        cityInput: "",
        radius: providerData.serviceArea?.radius?.toString() || "",
        availabilityDays: providerData.availability?.days || [],
      });
    } catch (error) {
      console.error("Error loading provider:", error);
      window.toast?.error("Failed to load service provider profile");
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      availabilityDays: prev.availabilityDays.includes(day)
        ? prev.availabilityDays.filter((d) => d !== day)
        : [...prev.availabilityDays, day],
    }));
  };

  const handleAddCity = () => {
    if (formData.cityInput.trim() && !formData.cities.includes(formData.cityInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        cities: [...prev.cities, prev.cityInput.trim()],
        cityInput: "",
      }));
    }
  };

  const handleRemoveCity = (city: string) => {
    setFormData((prev) => ({
      ...prev,
      cities: prev.cities.filter((c) => c !== city),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !currentState) return;

    try {
      setSubmitting(true);

      const updates: Partial<ServiceProvider> = {
        specialization: formData.specialization.trim() || undefined,
        experienceYears: formData.experienceYears ? Number(formData.experienceYears) : undefined,
        bio: formData.bio.trim() || undefined,
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : undefined,
        fixedRate: formData.fixedRate ? Number(formData.fixedRate) : undefined,
        isListed: formData.isListed,
        availability: {
          days: formData.availabilityDays,
          isAvailable: formData.isAvailable,
        },
        serviceArea: formData.state || formData.cities.length > 0
          ? {
              state: formData.state.trim(),
              cities: formData.cities,
              radius: formData.radius ? Number(formData.radius) : undefined,
            }
          : undefined,
      };

      await updateServiceProvider(provider.id, updates, currentState.id);
      window.toast?.success("Profile updated successfully!");
      await loadProvider();
    } catch (error) {
      console.error("Error updating provider:", error);
      window.toast?.error("Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !currentState) return;

    if (!serviceForm.name.trim() || !serviceForm.price) {
      window.toast?.error("Service name and price are required");
      return;
    }

    try {
      setSubmitting(true);
      const serviceData: Omit<Service, "id"> = {
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim() || undefined,
        duration: serviceForm.duration ? Number(serviceForm.duration) : undefined,
        price: Number(serviceForm.price),
        serviceType: serviceForm.serviceType,
      };

      await addServiceToProvider(provider.id, serviceData, currentState.id);
      window.toast?.success("Service added successfully!");
      setServiceForm({
        name: "",
        description: "",
        duration: "",
        price: "",
        serviceType: "fixed",
      });
      setShowServiceForm(false);
      await loadProvider();
    } catch (error) {
      console.error("Error adding service:", error);
      window.toast?.error("Failed to add service");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || "",
      duration: service.duration?.toString() || "",
      price: service.price.toString(),
      serviceType: service.serviceType,
    });
    setShowServiceForm(true);
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !editingService || !currentState) return;

    try {
      setSubmitting(true);
      const updates: Partial<Service> = {
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim() || undefined,
        duration: serviceForm.duration ? Number(serviceForm.duration) : undefined,
        price: Number(serviceForm.price),
        serviceType: serviceForm.serviceType,
      };

      await updateServiceForProvider(provider.id, editingService.id, updates, currentState.id);
      window.toast?.success("Service updated successfully!");
      setEditingService(null);
      setServiceForm({
        name: "",
        description: "",
        duration: "",
        price: "",
        serviceType: "fixed",
      });
      setShowServiceForm(false);
      await loadProvider();
    } catch (error) {
      console.error("Error updating service:", error);
      window.toast?.error("Failed to update service");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!provider || !currentState) return;
    if (!window.confirm("Are you sure you want to delete this service?")) {
      return;
    }

    try {
      await removeServiceFromProvider(provider.id, serviceId, currentState.id);
      window.toast?.success("Service deleted successfully!");
      await loadProvider();
    } catch (error) {
      console.error("Error deleting service:", error);
      window.toast?.error("Failed to delete service");
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-gray-400 mb-4">Please login to manage your service provider profile.</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!provider) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">Manage Service Provider Profile</h1>
          <p className="text-gray-400 text-sm md:text-base">Update your profile and manage your services</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4 md:p-6 space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4">Profile Information</h2>

              {/* Specialization */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Specialization <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  required
                />
              </div>

              {/* Experience & Bio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hourly Rate (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fixed Rate (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.fixedRate}
                    onChange={(e) => setFormData({ ...formData, fixedRate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Service Area */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-base md:text-lg font-bold">Service Area</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Cities</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={formData.cityInput}
                      onChange={(e) => setFormData({ ...formData, cityInput: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCity();
                        }
                      }}
                      placeholder="Add a city"
                      className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCity}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {formData.cities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.cities.map((city) => (
                        <span
                          key={city}
                          className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm flex items-center gap-2"
                        >
                          {city}
                          <button
                            type="button"
                            onClick={() => handleRemoveCity(city)}
                            className="hover:text-red-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-base md:text-lg font-bold">Availability</h3>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAvailable}
                      onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-gray-300 text-sm md:text-base">Currently available</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Available Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayToggle(day)}
                        className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-xs md:text-sm ${
                          formData.availabilityDays.includes(day)
                            ? "bg-primary text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Listing Status */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isListed}
                    onChange={(e) => setFormData({ ...formData, isListed: e.target.checked })}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <span className="text-gray-300">List profile in directory</span>
                </label>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4">
                <LoadingButton
                  type="submit"
                  isLoading={submitting}
                  className="w-full md:w-auto px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
                >
                  Save Changes
                </LoadingButton>
              </div>
            </form>

            {/* Services Management */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <h2 className="text-xl md:text-2xl font-bold">Services</h2>
                <button
                  onClick={() => {
                    setEditingService(null);
                    setServiceForm({
                      name: "",
                      description: "",
                      duration: "",
                      price: "",
                      serviceType: "fixed",
                    });
                    setShowServiceForm(!showServiceForm);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
                >
                  {showServiceForm ? "Cancel" : "Add Service"}
                </button>
              </div>

              {/* Service Form */}
              {showServiceForm && (
                <form
                  onSubmit={editingService ? handleUpdateService : handleAddService}
                  className="mb-6 p-3 md:p-4 bg-gray-700 rounded-lg space-y-3 md:space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Service Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-primary focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={serviceForm.duration}
                        onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price (₦) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={serviceForm.price}
                        onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-primary focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Service Type
                      </label>
                      <select
                        value={serviceForm.serviceType}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, serviceType: e.target.value as Service["serviceType"] })
                        }
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-primary focus:outline-none"
                      >
                        <option value="fixed">Fixed</option>
                        <option value="hourly">Hourly</option>
                        <option value="per_session">Per Session</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowServiceForm(false);
                        setEditingService(null);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm md:text-base"
                    >
                      Cancel
                    </button>
                    <LoadingButton
                      type="submit"
                      isLoading={submitting}
                      className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
                    >
                      {editingService ? "Update Service" : "Add Service"}
                    </LoadingButton>
                  </div>
                </form>
              )}

              {/* Services List */}
              <div className="space-y-4">
                {!provider.services || provider.services.length === 0 ? (
                  <p className="text-gray-400">No services added yet.</p>
                ) : (
                  provider.services.map((service) => (
                    <div
                      key={service.id}
                      className="border border-gray-700 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                    >
                      <div className="flex-1">
                        <h3 className="text-base md:text-lg font-bold text-white mb-1">{service.name}</h3>
                        {service.description && (
                          <p className="text-gray-300 text-xs md:text-sm mb-2">{service.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-400">
                          <span>₦{service.price.toLocaleString()}</span>
                          {service.duration && <span>{service.duration} minutes</span>}
                          <span className="capitalize">{service.serviceType.replace("_", " ")}</span>
                        </div>
                      </div>
                      <div className="flex flex-row gap-2">
                        <button
                          onClick={() => handleEditService(service)}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors text-xs md:text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-xs md:text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 md:space-y-6">
            {/* Quick Stats */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <h3 className="text-base md:text-lg font-bold mb-4">Profile Stats</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Profile Views</p>
                  <p className="text-white font-medium text-xl">{provider.views || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Bookings</p>
                  <p className="text-white font-medium text-xl">{provider.bookings || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Services</p>
                  <p className="text-white font-medium text-xl">
                    {provider.services?.length || 0}
                  </p>
                </div>
                {provider.rating && (
                  <div>
                    <p className="text-gray-400 text-sm">Rating</p>
                    <p className="text-white font-medium text-xl">
                      {provider.rating.toFixed(1)} ⭐
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* View Profile */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-6 space-y-3">
              <h3 className="text-base md:text-lg font-bold mb-4">Actions</h3>
              <button
                onClick={() => navigate(`/service-providers/${provider.id}`)}
                className="w-full px-4 py-2 md:py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
              >
                View Public Profile
              </button>
              <button
                onClick={() => navigate("/service-providers/earnings")}
                className="w-full px-4 py-2 md:py-3 bg-green-600 hover:bg-green-600/90 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
              >
                View Earnings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderDashboardPage;

