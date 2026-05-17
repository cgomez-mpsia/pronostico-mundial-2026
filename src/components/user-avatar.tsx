import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName: string;
  size?: number;
  className?: string;
  championFlagUrl?: string | null;
  championTeamName?: string | null;
}

export function UserAvatar({
  avatarUrl,
  fullName,
  size = 32,
  className,
  championFlagUrl,
  championTeamName,
}: UserAvatarProps) {
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const badgeSize = Math.round(size * 0.45);

  const avatar = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt={fullName}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  ) : (
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

  if (!championFlagUrl) return avatar;

  return (
    <span className="relative inline-flex shrink-0">
      {avatar}
      <img
        src={championFlagUrl}
        alt={championTeamName ?? "Campeón"}
        title={championTeamName ?? undefined}
        className="absolute -bottom-0.5 -right-1 rounded-sm object-cover ring-1 ring-white dark:ring-zinc-900"
        style={{ width: badgeSize, height: Math.round(badgeSize * 0.67) }}
      />
    </span>
  );
}
