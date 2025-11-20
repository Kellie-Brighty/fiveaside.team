// Phase 4.1: Club Registration Page
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import { createClub } from "../services/clubService";
import { uploadImageToImgBB } from "../utils/imgUpload";
import { hasPermission } from "../utils/permissions";
import LoadingButton from "../components/LoadingButton";


const ClubRegistrationPage: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const { currentState } = useStateContext();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [founded, setFounded] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Check permissions
  if (!isLoading && currentUser) {
    const canCreateClub =
      hasPermission(currentUser.role, "create_clubs") ||
      hasPermission(currentUser.role, "register_clubs");

    if (!canCreateClub) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-4">
              You need to be a club manager to register a club.
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
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        window.toast?.error("Logo size should be less than 5MB");
        return;
      }

      setLogo(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!currentState) {
      window.toast?.error("State not available. Please select a state.");
      return;
    }

    if (!name.trim()) {
      window.toast?.error("Club name is required");
      return;
    }

    if (!city.trim() || !state.trim()) {
      window.toast?.error("City and State are required");
      return;
    }

    try {
      setIsSubmitting(true);

      let logoUrl: string | undefined;

      // Upload logo if provided
      if (logo) {
        setIsUploadingLogo(true);
        try {
          logoUrl = await uploadImageToImgBB(logo);
          window.toast?.success("Club logo uploaded successfully!");
        } catch (error) {
          console.error("Error uploading logo:", error);
          window.toast?.error("Failed to upload logo. Please try again.");
          setIsUploadingLogo(false);
          return;
        } finally {
          setIsUploadingLogo(false);
        }
      }

      // Build club data - only include fields that have values (no undefined)
      const clubData: any = {
        name: name.trim(),
        managerId: currentUser.id,
        location: {
          city: city.trim(),
          state: state.trim(),
        },
      };

      // Add optional fields only if they have values
      if (shortName.trim()) {
        clubData.shortName = shortName.trim();
      }
      if (founded) {
        clubData.founded = parseInt(founded);
      }
      if (description.trim()) {
        clubData.description = description.trim();
      }
      if (logoUrl) {
        clubData.logo = logoUrl;
      }
      if (address.trim()) {
        clubData.location.address = address.trim();
      }
      if (contactEmail.trim()) {
        clubData.contactEmail = contactEmail.trim();
      }
      if (contactPhone.trim()) {
        clubData.contactPhone = contactPhone.trim();
      }
      if (website.trim()) {
        clubData.website = website.trim();
      }

      // Add social media only if at least one field has a value
      const socialMedia: any = {};
      if (twitter.trim()) {
        socialMedia.twitter = twitter.trim();
      }
      if (instagram.trim()) {
        socialMedia.instagram = instagram.trim();
      }
      if (facebook.trim()) {
        socialMedia.facebook = facebook.trim();
      }
      if (Object.keys(socialMedia).length > 0) {
        clubData.socialMedia = socialMedia;
      }

      // Create club
      const newClub = await createClub(clubData, currentState.id);

      window.toast?.success("Club registered successfully!");
      
      // Navigate to club management page
      navigate(`/club/${newClub.id}/manage`);
    } catch (error) {
      console.error("Error registering club:", error);
      window.toast?.error(
        error instanceof Error
          ? error.message
          : "Failed to register club. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Register New Club
        </h1>
        <p className="text-gray-400">
          Register your football club officially on MonkeyPost
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-dark-lighter rounded-xl shadow-xl p-6 sm:p-8">
          {/* Club Logo */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Club Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
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
                {isUploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="club-logo"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  disabled={isUploadingLogo}
                />
                <label
                  htmlFor="club-logo"
                  className={`inline-block px-4 py-2 bg-dark border border-gray-700 rounded-lg text-gray-300 hover:bg-dark-light cursor-pointer transition-colors ${
                    isUploadingLogo ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {logoPreview ? "Change Logo" : "Upload Logo"}
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Max 5MB. JPG, PNG, or GIF
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Basic Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Club Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                placeholder="e.g., Sunshine Stars FC"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Short Name / Abbreviation
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="e.g., SSFC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Year Founded
                </label>
                <input
                  type="number"
                  value={founded}
                  onChange={(e) => setFounded(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="e.g., 1995"
                  min="1800"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary resize-none"
                placeholder="Tell us about your club..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {description.length}/500 characters
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4 mb-6 border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Location</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="e.g., Akure"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="e.g., Ondo"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                placeholder="Street address (optional)"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 mb-6 border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Contact Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="club@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="+234 800 000 0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                placeholder="https://yourclub.com"
              />
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4 mb-6 border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Social Media
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Twitter
                </label>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="@yourclub"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Instagram
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="@yourclub"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Facebook
                </label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="Your Club Page"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
          >
            Cancel
          </button>
          <LoadingButton
            type="submit"
            variant="primary"
            isLoading={isSubmitting || isUploadingLogo}
            className="px-8 py-3"
          >
            {isSubmitting || isUploadingLogo ? "Registering..." : "Register Club"}
          </LoadingButton>
        </div>
      </form>
    </div>
  );
};

export default ClubRegistrationPage;

