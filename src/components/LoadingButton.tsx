import React from "react";

interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "outline";
  children: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading = false,
  variant = "primary",
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses =
    "relative inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors duration-200";

  const variantClasses = {
    primary: "bg-primary hover:bg-primary/90 text-white",
    secondary: "bg-dark-light hover:bg-dark-light/80 text-white",
    outline: "border border-primary text-primary hover:bg-primary/10",
  };

  const loadingClasses = isLoading ? "cursor-wait opacity-80" : "";
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  // Individual letters with animations
  const letters = ["F", "i", "v", "e", "a", "s", "i", "d", "e"];
  const delays = [0, 100, 200, 300, 400, 500, 600, 700, 800];

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${loadingClasses} ${disabledClasses} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            {letters.map((letter, index) => (
              <span
                key={index}
                className="inline-block animate-bounce font-bold"
                style={{
                  animationDelay: `${delays[index]}ms`,
                  animationDuration: "1s",
                  background: "linear-gradient(90deg, #00ffcc, #00ccff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 0 8px rgba(0, 255, 204, 0.6)",
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          <div className="ml-3 relative">
            <div className="absolute inset-0 bg-cyan-400/40 rounded-full animate-ping"></div>
            <div className="h-2 w-2 rounded-full bg-cyan-400 relative z-10"></div>
          </div>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;
