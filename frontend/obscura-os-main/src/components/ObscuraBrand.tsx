import ObscuraLogo from "@/components/brand/ObscuraLogo";
import { cn } from "@/lib/utils";

type ObscuraBrandProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "default" | "onDark" | "mono";
};

export default function ObscuraBrand({
  size = "md",
  className,
  variant = "default",
}: ObscuraBrandProps) {
  return (
    <ObscuraLogo
      size={size}
      tone={variant === "onDark" ? "dark" : variant === "mono" ? "mono" : "light"}
      className={cn(className)}
    />
  );
}
