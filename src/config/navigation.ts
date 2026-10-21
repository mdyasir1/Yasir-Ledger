import {
  CalendarRange,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short label used by the mobile bottom navigation bar. */
  shortLabel: string;
};

/** Primary navigation, in the order required by the plan. */
export const navigation: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    icon: LayoutDashboard,
  },
  {
    href: "/collections",
    label: "Collections",
    shortLabel: "Collect",
    icon: Wallet,
  },
  {
    href: "/members",
    label: "Members",
    shortLabel: "Members",
    icon: Users,
  },
  {
    href: "/timeline",
    label: "Timeline",
    shortLabel: "Timeline",
    icon: CalendarRange,
  },
  {
    href: "/transactions",
    label: "Transactions",
    shortLabel: "Ledger",
    icon: Receipt,
  },
  {
    href: "/settings",
    label: "Settings",
    shortLabel: "Settings",
    icon: Settings,
  },
];

/** Path that marks a navigation item as active. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
