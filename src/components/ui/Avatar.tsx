import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  firstName: string;
  lastName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-12 w-12 text-lg",
};

export function Avatar({ firstName, lastName, size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full bg-nexus-100 flex items-center justify-center font-medium text-nexus-700 shrink-0",
        sizeClasses[size],
        className
      )}
      aria-label={`${firstName} ${lastName}`}
    >
      {getInitials(firstName, lastName)}
    </div>
  );
}
