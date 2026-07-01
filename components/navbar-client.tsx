"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Trophy,
  UsersThree,
  ChartBar,
  BookOpenText,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

const items = [
  { href: "/tournaments", label: "Turniere", icon: Trophy },
  { href: "/teams", label: "Teams", icon: UsersThree },
  { href: "/leaderboard", label: "Rangliste", icon: ChartBar },
  { href: "/rules", label: "Regeln", icon: BookOpenText },
];

export function NavbarClient({
  isLoggedIn,
  username,
}: {
  isLoggedIn: boolean;
  username: string | null;
}) {
  const pathname = usePathname();

  const profileItem = isLoggedIn
    ? { href: "/profile", label: username ?? "Profil", icon: UserCircle }
    : { href: "/login", label: "Login", icon: UserCircle };

  const allItems = [...items, profileItem];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-border bg-surface md:static md:border-t-0 md:border-b-2"
      aria-label="Hauptnavigation"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around md:justify-center md:gap-2 md:py-2">
        {allItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-2 py-1 text-xs font-medium transition-colors duration-150 md:flex-row md:gap-2 md:rounded-xl md:px-4 md:text-sm",
                  active
                    ? "text-primary md:bg-primary/10"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={22} weight={active ? "fill" : "regular"} />
                <span className="truncate max-w-[4.5rem] md:max-w-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
