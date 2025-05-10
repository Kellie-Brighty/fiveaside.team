// Toast notification utility
type ToastType = "success" | "error" | "info" | "warning";

// Initialize toast functionality
export const initToast = () => {
  if (!window.toast) {
    window.toast = {} as any;
  }

  // Assign functions to window.toast
  window.toast!.success = (message: string, duration?: number) =>
    showToast(message, "success", duration);
  window.toast!.error = (message: string, duration?: number) =>
    showToast(message, "error", duration);
  window.toast!.info = (message: string, duration?: number) =>
    showToast(message, "info", duration);
  window.toast!.warning = (message: string, duration?: number) =>
    showToast(message, "warning", duration);
};

// Helper function to create and show toast
const showToast = (message: string, type: ToastType, duration?: number) => {
  // Remove any existing toasts
  const existingToasts = document.querySelectorAll(".toast-notification");
  existingToasts.forEach((toast) => {
    document.body.removeChild(toast);
  });

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast-notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md transition-opacity duration-300 transform translate-y-0 opacity-0`;

  // Set color based on type
  switch (type) {
    case "success":
      toast.classList.add("bg-green-600", "text-white");
      break;
    case "error":
      toast.classList.add("bg-red-600", "text-white");
      break;
    case "warning":
      toast.classList.add("bg-yellow-500", "text-white");
      break;
    case "info":
    default:
      toast.classList.add("bg-blue-600", "text-white");
      break;
  }

  // Create content
  toast.innerHTML = `
    <div class="flex items-center">
      <div class="flex-shrink-0 mr-3">
        ${getIconForType(type)}
      </div>
      <div class="flex-1 pr-4">
        ${message}
      </div>
      <div class="flex-shrink-0">
        <button class="text-white focus:outline-none hover:text-gray-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Add to DOM
  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.add("opacity-100");
  }, 10);

  // Set up close button
  const closeBtn = toast.querySelector("button");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      toast.classList.remove("opacity-100");
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    });
  }

  // Auto dismiss after duration or default 4 seconds
  const dismissDuration = duration || 4000;
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.classList.remove("opacity-100");
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }
  }, dismissDuration);
};

// Helper function to get appropriate icon
const getIconForType = (
  type: "success" | "error" | "info" | "warning"
): string => {
  switch (type) {
    case "success":
      return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>`;
    case "error":
      return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>`;
    case "warning":
      return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>`;
    case "info":
    default:
      return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`;
  }
};
