import React from "react";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-dark-lighter border border-gray-700 shadow-xl transition-all sm:w-full sm:max-w-lg">
          <div className="p-6">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Confirm Logout</h3>
              <p className="text-gray-400">
                Are you sure you want to log out of your account?
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-3">
              <button
                type="button"
                className="py-2.5 px-5 bg-dark border border-gray-600 rounded-md font-medium text-gray-300 hover:bg-dark-light"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="py-2.5 px-5 bg-primary hover:bg-primary/90 text-white rounded-md font-medium"
                onClick={onConfirm}
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
