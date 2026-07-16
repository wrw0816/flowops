import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveShopId } from "@/lib/shop-context";

export type AppPage =
  | "command-center"
  | "dispatch"
  | "repair-orders"
  | "appointments"
  | "technicians"
  | "tv"
  | "activity"
  | "analytics"
  | "production"
  | "settings";

type AppSidebarProps = {
  activePage: AppPage;
};

type Shop = {
  name: string;
  shop_code: string | null;
  location_name: string | null;
};

type NavigationItem = {
  page: AppPage;
  href: string;
  icon: string;
  label: string;
};

const navigationItems: NavigationItem[] = [
  {
    page: "command-center",
    href: "/",
    icon: "▦",
    label: "Command Center",
  },
  {
    page: "dispatch",
    href: "/dispatch",
    icon: "⇄",
    label: "Dispatch Board",
  },
  {
    page: "repair-orders",
    href: "/repair-orders",
    icon: "▤",
    label: "Repair Orders",
  },
  {
    page: "appointments",
    href: "/appointments",
    icon: "◷",
    label: "Appointments",
  },
  {
    page: "technicians",
    href: "/technicians",
    icon: "●",
    label: "Technicians",
  },
  {
    page: "tv",
    href: "/tv",
    icon: "▥",
    label: "TV Mode",
  },
  {
    page: "activity",
    href: "/activity",
    icon: "↻",
    label: "Activity",
  },
  {
    page: "analytics",
    href: "/analytics",
    icon: "⌁",
    label: "Analytics",
  },
  {
    page: "production",
    href: "/production",
    icon: "◎",
    label: "Production",
  },
];

export default async function AppSidebar({
  activePage,
}: AppSidebarProps) {
  const supabase = await createClient();
  const shopId = getActiveShopId();

  const { data, error } = await supabase
    .from("shops")
    .select(`
      name,
      shop_code,
      location_name
    `)
    .eq("id", shopId)
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to load sidebar shop information: ${
        error?.message ?? "Shop not found"
      }`,
    );
  }

  const shop = data as Shop;

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <div className="brand-mark">F</div>

          <div>
            <div className="brand-name">FlowOps</div>

            <div className="brand-subtitle">
              Service Operations
            </div>
          </div>
        </div>

        <nav className="nav">
          {navigationItems.map((item) => (
            <Link
              className={
                activePage === item.page
                  ? "nav-item active"
                  : "nav-item"
              }
              href={item.href}
              key={item.page}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <Link
          className={
            activePage === "settings"
              ? "nav-item active"
              : "nav-item"
          }
          href="/settings"
        >
          <span>⚙</span>
          Shop Settings
        </Link>

        <div className="shop-card">
          <div className="shop-icon">
            {shop.shop_code ?? "FS"}
          </div>

          <div>
            <div className="shop-name">{shop.name}</div>

            <div className="shop-location">
              {shop.location_name ?? "Primary location"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}