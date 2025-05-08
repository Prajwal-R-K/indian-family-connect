
import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Logo: React.FC<LogoProps> = ({ className, size = "md" }) => {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="bg-gradient-to-br from-isn-primary to-isn-secondary p-2 rounded-lg">
        <span className="text-white font-bold">ISN</span>
      </div>
      <span className={cn("font-bold text-isn-dark", sizeClasses[size])}>
        Indian Social Network
      </span>
    </div>
  );
};

export default Logo;
