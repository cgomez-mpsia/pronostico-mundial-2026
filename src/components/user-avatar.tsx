import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName: string;
  size?: number;
  className?: string;
}

export function UserAvatar({
  avatarUrl,
  fullName,
  size = 32,
  className,
}: UserAvatarProps) {
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={fullName}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium select-none shrink-0",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
      aria-label={fullName}
    >
      {initials}
    </div>
  );
}
