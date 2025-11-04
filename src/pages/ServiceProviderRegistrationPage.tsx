// Phase 9: Service Provider Registration Page
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { createServiceProvider, getServiceProviderByUserId } from "../services/serviceProviderService";
import type { ServiceProvider } from "../types";
import LoadingButton from "../components/LoadingButton";

const ServiceProviderRegistrationPage: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // Form state
  const [providerType, setProviderType] = useState<ServiceProvider["providerType"]>("referee");
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [fixedRate, setFixedRate] = useState("");
  const [state, setState] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [radius, setRadius] = useState("");
  const [availabilityDays, setAvailabilityDays] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const providerTypes: ServiceProvider["providerType"][] = [
    "referee",
    "coach",
    "trainer",
    "physiotherapist",
    "equipment_supplier",
    "other",
  ];

  useEffect(() => {
    checkExistingProfile();
  }, [currentUser, isLoading]);

  const checkExistingProfile = async () => {
    if (!currentUser || isLoading) return;

    // Check if user already has a service provider profile
    try {
      const existing = await getServiceProviderByUserId(currentUser.id);
      if (existing) {
        window.toast?.info("You already have a service provider profile");
        navigate("/service-providers/manage");
        return;
      }
    } catch (error) {
      console.error("Error checking existing profile:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setAvailabilityDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
  };

  const handleAddCity = () => {
    if (cityInput.trim() && !cities.includes(cityInput.trim())) {
      setCities([...cities, cityInput.trim()]);
      setCityInput("");
    }
  };

  const handleRemoveCity = (city: string) => {
    setCities(cities.filter((c) => c !== city));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!specialization.trim()) {
      window.toast?.error("Specialization is required");
      return;
    }

    if (!state.trim()) {
      window.toast?.error("State is required");
      return;
    }

    if (cities.length === 0) {
      window.toast?.error("At least one city is required");
      return;
    }

    try {
      setIsSubmitting(true);

      const providerData: Omit<ServiceProvider, "id" | "createdAt" | "updatedAt"> = {
        userId: currentUser.id,
        providerType: providerType,
        specialization: specialization.trim(),
        experienceYears: experienceYears ? Number(experienceYears) : undefined,
        bio: bio.trim() || undefined,
        certificationIds: currentUser.certifications?.map((c) => c.id) || [],
        services: [], // Services will be added later in dashboard
        availability: {
          days: availabilityDays,
          isAvailable: isAvailable,
        },
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        fixedRate: fixedRate ? Number(fixedRate) : undefined,
        serviceArea: {
          cities,
          state: state.trim(),
          radius: radius ? Number(radius) : undefined,
        },
        rating: undefined,
        reviewCount: 0,
        isListed: true, // Can be toggled later
        views: 0,
        bookings: 0,
      };

      await createServiceProvider(providerData);
      window.toast?.success("Service provider profile created successfully!");
      navigate("/service-providers/manage");
    } catch (error) {
      console.error("Error creating service provider:", error);
      window.toast?.error("Failed to create service provider profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || checking) {
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
          <p className="text-gray-400 mb-4">
            Please login to create a service provider profile.
          </p>
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

  if (currentUser.role !== "service_provider") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">
            You need to be a service provider to create a profile.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Service Provider Profile</h1>
          <p className="text-gray-400">
            Register as a service provider to offer your services on the platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Provider Type <span className="text-red-400">*</span>
            </label>
            <select
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as ServiceProvider["providerType"])}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
              required
            >
              {providerTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Specialization */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Specialization <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g., Youth Development, Fitness Training"
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
              required
            />
          </div>

          {/* Experience Years */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Years of Experience
            </label>
            <input
              type="number"
              min="0"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              placeholder="e.g., 5"
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bio/Description
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell us about your experience and expertise..."
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
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="e.g., 5000"
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
                value={fixedRate}
                onChange={(e) => setFixedRate(e.target.value)}
                placeholder="e.g., 20000"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Service Area */}
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-bold">Service Area</h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                State <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g., Ondo"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cities <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
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
              {cities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {cities.map((city) => (
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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Service Radius (km)
              </label>
              <input
                type="number"
                min="0"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder="e.g., 50"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Availability */}
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-bold">Availability</h3>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <span className="text-gray-300">Currently available</span>
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
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      availabilityDays.includes(day)
                        ? "bg-primary text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
            >
              Create Profile
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceProviderRegistrationPage;

