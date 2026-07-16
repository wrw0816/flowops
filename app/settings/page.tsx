import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShopSettingsForm from "./ShopSettingsForm";
import { getActiveShopId } from "@/lib/shop-context";

type Shop = {
  id: string;
  name: string;
  shop_code: string | null;
  location_name: string | null;
  timezone: string;
  shop_open_time: string;
  shop_close_time: string;
  daily_labor_goal: number | string;
  daily_labor_sales_goal: number | string;
  daily_gross_profit_goal: number | string;
  daily_car_count_goal: number;
  target_elr: number | string;
  labor_gross_profit_percent: number | string;
  minimum_dispatch_minutes: number;
  approval_alert_minutes: number;
  idle_alert_minutes: number;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const shopId = getActiveShopId();

  const { data, error } = await supabase
    .from("shops")
    .select(`
      id,
      name,
      shop_code,
      location_name,
      timezone,
      shop_open_time,
      shop_close_time,
      daily_labor_goal,
      daily_labor_sales_goal,
      daily_gross_profit_goal,
      daily_car_count_goal,
      target_elr,
      labor_gross_profit_percent,
      minimum_dispatch_minutes,
      approval_alert_minutes,
      idle_alert_minutes
    `)
    .eq("id", shopId)
.single();

  if (error || !data) {
    throw new Error(
      `Unable to load shop settings: ${
        error?.message ?? "Shop not found"
      }`,
    );
  }

  const shop = data as Shop;

  return (
    <main className="app-shell">
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
            <Link className="nav-item" href="/">
              <span>▦</span>
              Command Center
            </Link>

            <Link className="nav-item" href="/dispatch">
              <span>⇄</span>
              Dispatch Board
            </Link>

            <Link className="nav-item" href="/repair-orders">
              <span>▤</span>
              Repair Orders
            </Link>

            <Link className="nav-item" href="/appointments">
              <span>◷</span>
              Appointments
            </Link>

            <Link className="nav-item" href="/technicians">
              <span>●</span>
              Technicians
            </Link>

            <Link className="nav-item" href="/tv">
              <span>▥</span>
              TV Mode
            </Link>

            <Link className="nav-item" href="/activity">
              <span>↻</span>
              Activity
            </Link>

            <Link className="nav-item" href="/analytics">
              <span>⌁</span>
              Analytics
            </Link>

            <Link className="nav-item" href="/production">
              <span>◎</span>
              Production
            </Link>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <Link
            className="nav-item active"
            href="/settings"
          >
            <span>⚙</span>
            Shop Settings
          </Link>

          <div className="shop-card">
            <div className="shop-icon">
              {shop.shop_code ?? "AA"}
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

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Administration</p>
            <h1>Shop Settings</h1>

            <p className="page-description">
              Configure operating hours, production goals and
              alert thresholds.
            </p>
          </div>
        </header>

        <ShopSettingsForm
          initialValues={{
            name: shop.name,
            shopCode: shop.shop_code ?? "",
            locationName: shop.location_name ?? "",
            timezone: shop.timezone,
            shopOpenTime: shop.shop_open_time.slice(0, 5),
            shopCloseTime: shop.shop_close_time.slice(0, 5),
            dailyLaborGoal: String(shop.daily_labor_goal),
            dailyLaborSalesGoal: String(
              shop.daily_labor_sales_goal,
            ),
            dailyGrossProfitGoal: String(
              shop.daily_gross_profit_goal,
            ),
            dailyCarCountGoal: String(
              shop.daily_car_count_goal,
            ),
            targetElr: String(shop.target_elr),
            laborGrossProfitPercent: String(
              shop.labor_gross_profit_percent,
            ),
            minimumDispatchMinutes: String(
              shop.minimum_dispatch_minutes,
            ),
            approvalAlertMinutes: String(
              shop.approval_alert_minutes,
            ),
            idleAlertMinutes: String(
              shop.idle_alert_minutes,
            ),
          }}
        />
      </section>
    </main>
  );
}