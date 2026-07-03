import { cn } from "@/lib/cn";

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-base",
  lg: "h-16 w-16 text-xl",
};

export function Avatar({
  username,
  color,
  imageUrl,
  size = "md",
  className,
}: {
  username: string;
  color: string;
  imageUrl?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={username}
        className={cn("shrink-0 rounded-full object-cover", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-heading font-bold text-[#1c1204]",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {initials(username)}
    </div>
  );
}
