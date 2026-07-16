import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductionEntryForm from "./ProductionEntryForm";
import { getActiveShopId } from "@/lib/shop-context";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";

type Shop = {
  id: string;
  name: string;
  daily_labor_goal: number | string;
  daily_labor_sales_goal: number | string;
  daily_gross_profit_goal: number | string;
  daily_car_count_goal: number;
  target_elr: number | string;
  labor_gross_profit_percent: number | string;
};

type DailyProduction = {
  id: string;
  production_date: string;
  labor_hours_closed: number | string;
  labor_sales: number | string;
  gross_profit: number | string;
  repair_orders_closed: number;
  vehicles_delivered: number;
  inspection_count: number;
  eligible_inspection_count: number;
  estimates_presented: number;
  estimates_approved: number;
  discounts: number | string;
  notes: string | null;
  updated_at: string;
};

type RepairOrder = {
  id: string;
  status: string;
  estimated_hours: number | string;
};

function safeNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value)}%`;
}

function getIndianapolisHour() {
  const hourText = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date());

  return Number(hourText);
}

export default async function ProductionPage() {
  const supabase = await createClient();
  const shopId = getActiveShopId();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date());

  const [
    { data: shopData, error: shopError },
    { data: productionData, error: productionError },
    { data: repairOrderData, error: repairOrderError },
  ] = await Promise.all([
    supabase
      .from("shops")
      .select(`
        id,
        name,
        daily_labor_goal,
        daily_labor_sales_goal,
        daily_gross_profit_goal,
        daily_car_count_goal,
        target_elr,
        labor_gross_profit_percent
      `)
      .eq("id", shopId)
.single(),

    supabase
      .from("daily_production")
      .select(`
        id,
        production_date,
        labor_hours_closed,
        labor_sales,
        gross_profit,
        repair_orders_closed,
        vehicles_delivered,
        inspection_count,
        eligible_inspection_count,
        estimates_presented,
        estimates_approved,
        discounts,
        notes,
        updated_at
      `)
      .eq("production_date", today)
      .limit(1)
      .maybeSingle(),

    supabase
      .from("repair_orders")
      .select("id, status, estimated_hours")
      .neq("status", "closed"),
  ]);

  if (shopError || !shopData) {
    throw new Error(
      `Unable to load shop production settings: ${
        shopError?.message ?? "Shop not found"
      }`,
    );
  }

  if (productionError) {
    throw new Error(
      `Unable to load daily production: ${productionError.message}`,
    );
  }

  if (repairOrderError) {
    throw new Error(
      `Unable to load open repair orders: ${repairOrderError.message}`,
    );
  }

  const shop = shopData as Shop;

  const production: DailyProduction =
    (productionData as DailyProduction | null) ?? {
      id: "",
      production_date: today,
      labor_hours_closed: 0,
      labor_sales: 0,
      gross_profit: 0,
      repair_orders_closed: 0,
      vehicles_delivered: 0,
      inspection_count: 0,
      eligible_inspection_count: 0,
      estimates_presented: 0,
      estimates_approved: 0,
      discounts: 0,
      notes: null,
      updated_at: new Date().toISOString(),
    };

  const repairOrders = (repairOrderData ?? []) as RepairOrder[];

  const laborGoal = safeNumber(shop.daily_labor_goal);
  const laborSalesGoal = safeNumber(shop.daily_labor_sales_goal);
  const grossProfitGoal = safeNumber(shop.daily_gross_profit_goal);
  const carCountGoal = safeNumber(shop.daily_car_count_goal);
  const targetElr = safeNumber(shop.target_elr);
  const laborGpPercent =
    safeNumber(shop.labor_gross_profit_percent) / 100;

  const laborHoursClosed = safeNumber(
    production.labor_hours_closed,
  );

  const laborSales = safeNumber(production.labor_sales);
  const grossProfit = safeNumber(production.gross_profit);
  const discounts = safeNumber(production.discounts);
  const repairOrdersClosed = safeNumber(
    production.repair_orders_closed,
  );
  const vehiclesDelivered = safeNumber(
    production.vehicles_delivered,
  );

  const inspectionCount = safeNumber(
    production.inspection_count,
  );

  const eligibleInspectionCount = safeNumber(
    production.eligible_inspection_count,
  );

  const estimatesPresented = safeNumber(
    production.estimates_presented,
  );

  const estimatesApproved = safeNumber(
    production.estimates_approved,
  );

  const currentHour = getIndianapolisHour();

  const shopOpenHour = 7;
  const shopCloseHour = 18;

  const totalOperatingHours =
    shopCloseHour - shopOpenHour;

  const elapsedOperatingHours = Math.min(
    totalOperatingHours,
    Math.max(0.5, currentHour - shopOpenHour),
  );

  const remainingOperatingHours = Math.max(
    0,
    totalOperatingHours - elapsedOperatingHours,
  );

  const hourlyLaborPace =
    laborHoursClosed / elapsedOperatingHours;

  const projectedLaborHours =
    laborHoursClosed +
    hourlyLaborPace * remainingOperatingHours;

  const projectedLaborSales =
    laborHoursClosed > 0
      ? laborSales *
        (projectedLaborHours / laborHoursClosed)
      : 0;

  const projectedGrossProfit =
    laborSales > 0
      ? grossProfit *
        (projectedLaborSales / laborSales)
      : 0;

  const hoursRemainingToGoal = Math.max(
    0,
    laborGoal - laborHoursClosed,
  );

  const projectedHourShortfall = Math.max(
    0,
    laborGoal - projectedLaborHours,
  );

  const projectedSalesShortfall = Math.max(
    0,
    laborSalesGoal - projectedLaborSales,
  );

  const unrealizedLaborSales =
    projectedHourShortfall * targetElr;

  const unrealizedLaborGrossProfit =
    unrealizedLaborSales * laborGpPercent;

  const requiredHourlyRecovery =
    remainingOperatingHours > 0
      ? hoursRemainingToGoal / remainingOperatingHours
      : hoursRemainingToGoal;

  const currentElr =
    laborHoursClosed > 0
      ? laborSales / laborHoursClosed
      : 0;

  const adjustedGrossProfit = grossProfit - discounts;

  const aro =
    repairOrdersClosed > 0
      ? laborSales / repairOrdersClosed
      : 0;

  const closeRate =
    estimatesPresented > 0
      ? (estimatesApproved / estimatesPresented) * 100
      : 0;

  const inspectionPercentage =
    eligibleInspectionCount > 0
      ? (inspectionCount / eligibleInspectionCount) * 100
      : 0;

  const laborGoalPercentage =
    laborGoal > 0
      ? Math.min(
          100,
          (laborHoursClosed / laborGoal) * 100,
        )
      : 0;

  const salesGoalPercentage =
    laborSalesGoal > 0
      ? Math.min(
          100,
          (laborSales / laborSalesGoal) * 100,
        )
      : 0;

  const grossProfitGoalPercentage =
    grossProfitGoal > 0
      ? Math.min(
          100,
          (adjustedGrossProfit / grossProfitGoal) * 100,
        )
      : 0;

  const carCountPercentage =
    carCountGoal > 0
      ? Math.min(
          100,
          (vehiclesDelivered / carCountGoal) * 100,
        )
      : 0;

  const waitingDispatchHours = repairOrders
    .filter(
      (repairOrder) =>
        repairOrder.status === "waiting_dispatch",
    )
    .reduce(
      (total, repairOrder) =>
        total + safeNumber(repairOrder.estimated_hours),
      0,
    );

  const waitingApprovalHours = repairOrders
    .filter(
      (repairOrder) =>
        repairOrder.status === "waiting_approval",
    )
    .reduce(
      (total, repairOrder) =>
        total + safeNumber(repairOrder.estimated_hours),
      0,
    );

  const waitingPartsHours = repairOrders
    .filter(
      (repairOrder) =>
        repairOrder.status === "waiting_parts",
    )
    .reduce(
      (total, repairOrder) =>
        total + safeNumber(repairOrder.estimated_hours),
      0,
    );

  return (
  <AppShell activePage="production">
        <PageHeader
  eyebrow="Daily Performance"
  title="Production Dashboard"
  description="Track today's production, labor performance and progress toward shop goals."
  actions={
    <>
      <Link
        className="secondary-button button-link"
        href="/analytics"
      >
        View Analytics
      </Link>

      <Link
        className="secondary-button button-link"
        href="/dispatch"
      >
        Open Dispatch
      </Link>

      <Link
        className="primary-button button-link"
        href="/settings"
      >
        Production Goals
      </Link>
    </>
  }
/>

        <section className="production-hero-grid">
          <article className="production-hero-card">
            <span>Labor Hours Closed</span>

            <div className="production-hero-value">
              <strong>{laborHoursClosed.toFixed(1)}</strong>
              <small>of {laborGoal.toFixed(1)}</small>
            </div>

            <div className="progress-track">
              <div
                className="progress-bar progress-red"
                style={{
                  width: `${laborGoalPercentage}%`,
                }}
              />
            </div>

            <footer>
              <span>
                {formatPercent(laborGoalPercentage)} of goal
              </span>

              <strong>
                {hoursRemainingToGoal.toFixed(1)} remaining
              </strong>
            </footer>
          </article>

          <article className="production-hero-card">
            <span>Projected Finish</span>

            <div className="production-hero-value">
              <strong>{projectedLaborHours.toFixed(1)}</strong>
              <small>labor hours</small>
            </div>

            <div className="progress-track">
              <div
                className="progress-bar progress-yellow"
                style={{
                  width: `${Math.min(
                    100,
                    laborGoal > 0
                      ? (projectedLaborHours / laborGoal) * 100
                      : 0,
                  )}%`,
                }}
              />
            </div>

            <footer>
              <span>Current pace</span>

              <strong
                className={
                  projectedHourShortfall > 0
                    ? "negative"
                    : "positive"
                }
              >
                {projectedHourShortfall > 0
                  ? `${projectedHourShortfall.toFixed(
                      1,
                    )} short`
                  : "Goal projected"}
              </strong>
            </footer>
          </article>

          <article className="production-hero-card production-loss-card">
            <span>Projected Lost Labor Sales</span>

            <div className="production-hero-value">
              <strong>
                {formatCurrency(unrealizedLaborSales)}
              </strong>
            </div>

            <footer>
              <span>
                {projectedHourShortfall.toFixed(1)} unrealized
                hours
              </span>

              <strong className="negative">
                {formatCurrency(unrealizedLaborGrossProfit)} GP
              </strong>
            </footer>
          </article>

          <article className="production-hero-card">
            <span>Required Recovery Pace</span>

            <div className="production-hero-value">
              <strong>
                {requiredHourlyRecovery.toFixed(1)}
              </strong>

              <small>hours per clock hour</small>
            </div>

            <footer>
              <span>
                {remainingOperatingHours.toFixed(1)} shop hours
                remaining
              </span>
            </footer>
          </article>
        </section>

        <section className="production-kpi-grid">
          <article className="production-kpi-card">
            <span>Labor Sales</span>
            <strong>{formatCurrency(laborSales)}</strong>
            <small>
              Goal {formatCurrency(laborSalesGoal)}
            </small>

            <div className="production-mini-progress">
              <i
                style={{
                  width: `${salesGoalPercentage}%`,
                }}
              />
            </div>
          </article>

          <article className="production-kpi-card">
            <span>Projected Labor Sales</span>
            <strong>
              {formatCurrency(projectedLaborSales)}
            </strong>

            <small
              className={
                projectedSalesShortfall > 0
                  ? "negative"
                  : "positive"
              }
            >
              {projectedSalesShortfall > 0
                ? `${formatCurrency(
                    projectedSalesShortfall,
                  )} short`
                : "Goal projected"}
            </small>
          </article>

          <article className="production-kpi-card">
            <span>Adjusted Gross Profit</span>
            <strong>
              {formatCurrency(adjustedGrossProfit)}
            </strong>

            <small>
              Goal {formatCurrency(grossProfitGoal)}
            </small>

            <div className="production-mini-progress">
              <i
                style={{
                  width: `${grossProfitGoalPercentage}%`,
                }}
              />
            </div>
          </article>

          <article className="production-kpi-card">
            <span>Projected Gross Profit</span>
            <strong>
              {formatCurrency(projectedGrossProfit)}
            </strong>

            <small>
              Discounts: {formatCurrency(discounts)}
            </small>
          </article>

          <article className="production-kpi-card">
            <span>Current ELR</span>
            <strong>{formatCurrency(currentElr)}</strong>

            <small>
              Target {formatCurrency(targetElr)}
            </small>
          </article>

          <article className="production-kpi-card">
            <span>Labor ARO</span>
            <strong>{formatCurrency(aro)}</strong>

            <small>
              {repairOrdersClosed} closed ROs
            </small>
          </article>

          <article className="production-kpi-card">
            <span>Close Rate</span>
            <strong>{formatPercent(closeRate)}</strong>

            <small>
              {estimatesApproved} of {estimatesPresented}
            </small>
          </article>

          <article className="production-kpi-card">
            <span>Inspection Percentage</span>
            <strong>
              {formatPercent(inspectionPercentage)}
            </strong>

            <small>
              {inspectionCount} of {eligibleInspectionCount}
            </small>
          </article>

          <article className="production-kpi-card">
            <span>Vehicles Delivered</span>
            <strong>{vehiclesDelivered}</strong>

            <small>Goal {carCountGoal}</small>

            <div className="production-mini-progress">
              <i
                style={{
                  width: `${carCountPercentage}%`,
                }}
              />
            </div>
          </article>
        </section>

        <section className="production-main-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Daily Production Entry</h2>

                <p>
                  Update today&apos;s closed production results
                </p>
              </div>
            </div>

            <ProductionEntryForm
              productionDate={today}
              initialValues={{
                laborHoursClosed:
                  laborHoursClosed.toString(),
                laborSales: laborSales.toString(),
                grossProfit: grossProfit.toString(),
                repairOrdersClosed:
                  repairOrdersClosed.toString(),
                vehiclesDelivered:
                  vehiclesDelivered.toString(),
                inspectionCount:
                  inspectionCount.toString(),
                eligibleInspectionCount:
                  eligibleInspectionCount.toString(),
                estimatesPresented:
                  estimatesPresented.toString(),
                estimatesApproved:
                  estimatesApproved.toString(),
                discounts: discounts.toString(),
                notes: production.notes ?? "",
              }}
            />
          </section>

          <aside className="production-right-column">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Hours at Risk</h2>

                  <p>
                    Open labor currently stalled in workflow
                  </p>
                </div>
              </div>

              <div className="production-risk-list">
                <div>
                  <span>Waiting Dispatch</span>
                  <strong>
                    {waitingDispatchHours.toFixed(1)} hrs
                  </strong>
                </div>

                <div>
                  <span>Waiting Approval</span>
                  <strong>
                    {waitingApprovalHours.toFixed(1)} hrs
                  </strong>
                </div>

                <div>
                  <span>Waiting Parts</span>
                  <strong>
                    {waitingPartsHours.toFixed(1)} hrs
                  </strong>
                </div>

                <div className="production-risk-total">
                  <span>Total Hours at Risk</span>

                  <strong>
                    {(
                      waitingDispatchHours +
                      waitingApprovalHours +
                      waitingPartsHours
                    ).toFixed(1)}{" "}
                    hrs
                  </strong>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Recovery Direction</h2>

                  <p>What the shop must accomplish next</p>
                </div>
              </div>

              <div className="production-recovery-card">
                {projectedHourShortfall > 0 ? (
                  <>
                    <strong>
                      Recover{" "}
                      {projectedHourShortfall.toFixed(1)} hours
                    </strong>

                    <p>
                      The shop is currently pacing below the daily
                      labor goal.
                    </p>

                    <ul>
                      <li>
                        Dispatch available work immediately.
                      </li>

                      <li>
                        Attack{" "}
                        {waitingApprovalHours.toFixed(1)} approval
                        hours.
                      </li>

                      <li>
                        Protect a minimum pace of{" "}
                        {requiredHourlyRecovery.toFixed(1)} sold
                        hours per remaining clock hour.
                      </li>
                    </ul>
                  </>
                ) : (
                  <>
                    <strong className="positive">
                      Daily labor goal is currently projected.
                    </strong>

                    <p>
                      Maintain dispatch speed and protect approved
                      work from delays.
                    </p>
                  </>
                )}
              </div>
            </section>
          </aside>
        </section>
      </AppShell>
  );
}