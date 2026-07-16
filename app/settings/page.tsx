import { createClient } from "@/lib/supabase/server";
import ShopSettingsForm from "./ShopSettingsForm";
import { getActiveShopId } from "@/lib/shop-context";
import AppSidebar from "@/components/AppSidebar";

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
      <AppSidebar activePage="settings" />

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