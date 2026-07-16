import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveShopId } from "@/lib/shop-context";
import { getServerTimestamp } from "@/lib/server-time";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";

type TechnicianStatus =
  | "working"
  | "waiting"
  | "available"
  | "off";

type Technician = {
  id: string;
  name: string;
  initials: string | null;
  status: TechnicianStatus;
  current_ro: string | null;
  current_vehicle: string | null;
  current_operation: string | null;
  sold_hours: number | string;
  elapsed_minutes: number;
  next_ro: string | null;
  next_vehicle: string | null;
  active: boolean;
  display_order: number;
  status_changed_at: string | null;
};

type RepairOrder = {
  id: string;
  ro_number: string;
  vehicle: string;
  service_description: string;
  priority: "urgent" | "high" | "normal";
  status: string;
  estimated_hours: number | string;
  waiting_since: string;
  promised_at: string | null;
  assigned_technician_id: string | null;
};

type Appointment = {
  id: string;
  customer_name: string | null;
  vehicle: string;
  service_description: string;
  status:
    | "scheduled"
    | "confirmed"
    | "arrived"
    | "late"
    | "cancelled"
    | "no_show"
    | "converted_to_ro";
  appointment_at: string;
  estimated_hours: number | string;
};

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
  updated_at: string;
};

function safeNumber(
  value: number | string | null | undefined,
) {
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(value));
}

function formatDateHeading() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date());
}

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date());
}

function getIndianapolisDecimalHour() {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Indiana/Indianapolis",
  }).formatToParts(new Date());

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value ?? 0,
  );

  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );

  return hour + minute / 60;
}

function formatElapsed(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

function formatWaitingTime(
  waitingSince: string,
  currentTimestamp: number,
) {
  const start = new Date(waitingSince).getTime();

  if (Number.isNaN(start)) {
    return "Unknown";
  }

  const minutes = Math.max(
    0,
    Math.floor((currentTimestamp - start) / 60000),
  );

  return formatElapsed(minutes);
}

function technicianStatusClass(status: TechnicianStatus) {
  if (status === "working") {
    return "status status-working";
  }

  if (status === "waiting") {
    return "status status-waiting";
  }

  return "status status-available";
}

function formatStatus(status: TechnicianStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatAppointmentStatus(
  status: Appointment["status"],
) {
  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function priorityLabel(
  priority: RepairOrder["priority"],
) {
  return (
    priority.charAt(0).toUpperCase() +
    priority.slice(1)
  );
}

export default async function Home() {
  const supabase = await createClient();
  const shopId = getActiveShopId();
  const currentTimestamp = getServerTimestamp();
  const today = getTodayDate();

  const startOfDay = new Date(`${today}T00:00:00`);
  const endOfDay = new Date(`${today}T23:59:59.999`);

  const [
    { data: shopData, error: shopError },
    { data: productionData, error: productionError },
    { data: technicianData, error: technicianError },
    { data: repairOrderData, error: repairOrderError },
    { data: appointmentData, error: appointmentError },
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
        updated_at
      `)
      .eq("shop_id", shopId)
      .eq("production_date", today)
      .maybeSingle(),

    supabase
      .from("technicians")
      .select(`
        id,
        name,
        initials,
        status,
        current_ro,
        current_vehicle,
        current_operation,
        sold_hours,
        elapsed_minutes,
        next_ro,
        next_vehicle,
        active,
        display_order,
        status_changed_at
      `)
      .eq("shop_id", shopId)
      .eq("active", true)
      .order("display_order", { ascending: true }),

    supabase
      .from("repair_orders")
      .select(`
        id,
        ro_number,
        vehicle,
        service_description,
        priority,
        status,
        estimated_hours,
        waiting_since,
        promised_at,
        assigned_technician_id
      `)
      .eq("shop_id", shopId)
      .neq("status", "closed")
      .order("waiting_since", { ascending: true }),

    supabase
      .from("appointments")
      .select(`
        id,
        customer_name,
        vehicle,
        service_description,
        status,
        appointment_at,
        estimated_hours
      `)
      .eq("shop_id", shopId)
      .gte("appointment_at", startOfDay.toISOString())
      .lte("appointment_at", endOfDay.toISOString())
      .not(
        "status",
        "in",
        '("cancelled","no_show","converted_to_ro")',
      )
      .order("appointment_at", { ascending: true }),
  ]);

  if (shopError || !shopData) {
    throw new Error(
      `Unable to load shop settings: ${
        shopError?.message ?? "Shop not found"
      }`,
    );
  }

  if (productionError) {
    throw new Error(
      `Unable to load production: ${productionError.message}`,
    );
  }

  if (technicianError) {
    throw new Error(
      `Unable to load technicians: ${technicianError.message}`,
    );
  }

  if (repairOrderError) {
    throw new Error(
      `Unable to load repair orders: ${repairOrderError.message}`,
    );
  }

  if (appointmentError) {
    throw new Error(
      `Unable to load appointments: ${appointmentError.message}`,
    );
  }

  const shop = shopData as Shop;

  const production: DailyProduction =
    (productionData as DailyProduction | null) ?? {
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
      updated_at: new Date().toISOString(),
    };

  const technicians =
    (technicianData ?? []) as Technician[];

  const repairOrders =
    (repairOrderData ?? []) as RepairOrder[];

  const appointments =
    (appointmentData ?? []) as Appointment[];

  const dispatchQueue = repairOrders.filter(
    (repairOrder) =>
      repairOrder.status === "waiting_dispatch",
  );

  const waitingApprovalOrders = repairOrders.filter(
    (repairOrder) =>
      repairOrder.status === "waiting_approval",
  );

  const waitingPartsOrders = repairOrders.filter(
    (repairOrder) =>
      repairOrder.status === "waiting_parts",
  );

  const availableTechnicians = technicians.filter(
    (technician) =>
      technician.status === "available",
  );

  const waitingTechnicians = technicians.filter(
    (technician) =>
      technician.status === "waiting",
  );

  const laborGoal = safeNumber(shop.daily_labor_goal);
  const laborSalesGoal = safeNumber(
    shop.daily_labor_sales_goal,
  );
  const targetElr = safeNumber(shop.target_elr);

  const laborGrossProfitPercent =
    safeNumber(shop.labor_gross_profit_percent) /
    100;

  const laborHoursClosed = safeNumber(
    production.labor_hours_closed,
  );

  const laborSales = safeNumber(
    production.labor_sales,
  );

  const repairOrdersClosed = safeNumber(
    production.repair_orders_closed,
  );

  const laborHoursRemaining = Math.max(
    0,
    laborGoal - laborHoursClosed,
  );

  const shopOpenHour = 7;
  const shopCloseHour = 18;

  const currentHour = getIndianapolisDecimalHour();

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

  const currentHourlyPace =
    laborHoursClosed / elapsedOperatingHours;

  const projectedLaborHours =
    laborHoursClosed +
    currentHourlyPace * remainingOperatingHours;

  const projectedLaborSales =
    laborHoursClosed > 0
      ? laborSales *
        (projectedLaborHours /
          laborHoursClosed)
      : 0;

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
    unrealizedLaborSales *
    laborGrossProfitPercent;

  const requiredHourlyRecovery =
    remainingOperatingHours > 0
      ? laborHoursRemaining /
        remainingOperatingHours
      : laborHoursRemaining;

  const goalPercentage =
    laborGoal > 0
      ? Math.min(
          100,
          (laborHoursClosed / laborGoal) * 100,
        )
      : 0;

  const projectedGoalPercentage =
    laborGoal > 0
      ? Math.min(
          100,
          (projectedLaborHours / laborGoal) *
            100,
        )
      : 0;

  const waitingDispatchHours =
    dispatchQueue.reduce(
      (total, repairOrder) =>
        total +
        safeNumber(
          repairOrder.estimated_hours,
        ),
      0,
    );

  const waitingApprovalHours =
    waitingApprovalOrders.reduce(
      (total, repairOrder) =>
        total +
        safeNumber(
          repairOrder.estimated_hours,
        ),
      0,
    );

  const waitingPartsHours =
    waitingPartsOrders.reduce(
      (total, repairOrder) =>
        total +
        safeNumber(
          repairOrder.estimated_hours,
        ),
      0,
    );

  const totalHoursAtRisk =
    waitingDispatchHours +
    waitingApprovalHours +
    waitingPartsHours;

  const recoverableSales =
    totalHoursAtRisk * targetElr;

  const currentAro =
    repairOrdersClosed > 0
      ? laborSales / repairOrdersClosed
      : 0;

  const urgentActions: {
    title: string;
    detail: string;
    type: "danger" | "warning" | "info";
    href: string;
  }[] = [];

  if (availableTechnicians.length > 0) {
    urgentActions.push({
      title: `${availableTechnicians.length} technician${
        availableTechnicians.length === 1
          ? ""
          : "s"
      } available`,
      detail:
        dispatchQueue.length > 0
          ? `${dispatchQueue.length} RO${
              dispatchQueue.length === 1
                ? ""
                : "s"
            } are waiting for dispatch.`
          : "No repair orders are ready for assignment.",
      type: "danger",
      href: "/dispatch",
    });
  }

  if (waitingApprovalHours > 0) {
    urgentActions.push({
      title: `${waitingApprovalHours.toFixed(
        1,
      )} hours waiting for approval`,
      detail:
        "Advisor follow-up can release labor back into production.",
      type: "warning",
      href: "/repair-orders",
    });
  }

  if (projectedHourShortfall > 0) {
    urgentActions.push({
      title: `${projectedHourShortfall.toFixed(
        1,
      )} projected hour shortfall`,
      detail: `${formatCurrency(
        unrealizedLaborSales,
      )} in labor sales is currently at risk.`,
      type: "info",
      href: "/production",
    });
  }

  const topActions = urgentActions.slice(0, 3);

  return (
  <AppShell activePage="command-center"> 
          <PageHeader
  eyebrow={formatDateHeading()}
  title="Shop Command Center"
  description="Live workload, technician flow and production pace."
  actions={
    <>
      <div className="live-indicator">
        <span className="live-dot" />
        Live
      </div>

      <Link
        className="secondary-button button-link"
        href="/tv"
      >
        Open TV Mode
      </Link>

      <Link
        className="primary-button button-link"
        href="/repair-orders/new"
      >
        + Add Repair Order
      </Link>
    </>
  }
/>

        <section className="metric-grid">
          <article className="metric-card">
            <div className="metric-label">
              Labor Hours Closed
            </div>

            <div className="metric-row">
              <strong>
                {laborHoursClosed.toFixed(1)}
              </strong>

              <span>
                of {laborGoal.toFixed(1)}
              </span>
            </div>

            <div className="progress-track">
              <div
                className="progress-bar progress-red"
                style={{
                  width: `${goalPercentage}%`,
                }}
              />
            </div>

            <div className="metric-footer">
              <span>
                {Math.round(goalPercentage)}% of goal
              </span>

              <span className="negative">
                {laborHoursRemaining.toFixed(1)}{" "}
                remaining
              </span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">
              Projected Finish
            </div>

            <div className="metric-row">
              <strong>
                {projectedLaborHours.toFixed(1)}
              </strong>

              <span>hours</span>
            </div>

            <div className="progress-track">
              <div
                className="progress-bar progress-yellow"
                style={{
                  width: `${projectedGoalPercentage}%`,
                }}
              />
            </div>

            <div className="metric-footer">
              <span>Current pace</span>

              <span
                className={
                  projectedHourShortfall > 0
                    ? "warning"
                    : "positive"
                }
              >
                {projectedHourShortfall > 0
                  ? `${projectedHourShortfall.toFixed(
                      1,
                    )}-hour gap`
                  : "Goal projected"}
              </span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">
              Waiting Dispatch
            </div>

            <div className="metric-row">
              <strong>
                {dispatchQueue.length}
              </strong>

              <span>vehicles</span>
            </div>

            <div className="metric-footer metric-footer-spaced">
              <span>
                {waitingDispatchHours.toFixed(1)}{" "}
                labor hours
              </span>

              <span className="negative">
                {dispatchQueue.length > 0
                  ? formatWaitingTime(
                      dispatchQueue[0].waiting_since,
                      currentTimestamp,
                    )
                  : "No wait"}
              </span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">
              Unrealized Labor
            </div>

            <div className="metric-row">
              <strong>
                {formatCurrency(
                  unrealizedLaborSales,
                )}
              </strong>
            </div>

            <div className="metric-footer metric-footer-spaced">
              <span>
                {projectedHourShortfall.toFixed(1)}{" "}
                projected hours
              </span>

              <span className="negative">
                {formatCurrency(
                  unrealizedLaborGrossProfit,
                )}{" "}
                GP
              </span>
            </div>
          </article>
        </section>

        <section className="main-grid">
          <div className="panel technician-panel">
            <div className="panel-heading">
              <div>
                <h2>Technician Flow</h2>

                <p>
                  Current and next assignments
                </p>
              </div>

              <Link
                className="text-button"
                href="/technicians"
              >
                Manage technicians →
              </Link>
            </div>

            <div className="technician-list">
              {technicians.map(
                (technician) => (
                  <article
                    className="technician-row"
                    key={technician.id}
                  >
                    <div className="technician-identity">
                      <div className="avatar">
                        {technician.initials ??
                          technician.name
                            .slice(0, 2)
                            .toUpperCase()}
                      </div>

                      <div>
                        <div className="technician-name">
                          {technician.name}
                        </div>

                        <div
                          className={technicianStatusClass(
                            technician.status,
                          )}
                        >
                          <span />
                          {formatStatus(
                            technician.status,
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="assignment">
                      <div className="assignment-label">
                        Current
                      </div>

                      <strong>
                        {technician.current_ro ??
                          "No active RO"}
                      </strong>

                      <span>
                        {technician.current_vehicle ??
                          "Ready for dispatch"}
                      </span>

                      <small>
                        {technician.current_operation ??
                          "No active operation"}
                      </small>
                    </div>

                    <div className="time-block">
                      <div className="assignment-label">
                        Sold
                      </div>

                      <strong>
                        {safeNumber(
                          technician.sold_hours,
                        ).toFixed(1)}{" "}
                        hrs
                      </strong>

                      <span>
                        {formatElapsed(
                          technician.elapsed_minutes,
                        )}
                      </span>
                    </div>

                    <div className="assignment next-assignment">
                      <div className="assignment-label">
                        Next
                      </div>

                      <strong>
                        {technician.next_ro ??
                          "Unassigned"}
                      </strong>

                      <span>
                        {technician.next_vehicle ??
                          "Needs next assignment"}
                      </span>
                    </div>

                    <Link
                      className="row-action button-link"
                      href={`/technicians/${technician.id}`}
                    >
                      •••
                    </Link>
                  </article>
                ),
              )}

              {technicians.length === 0 ? (
                <div className="appointments-empty">
                  No active technicians are
                  configured.
                </div>
              ) : null}
            </div>
          </div>

          <div className="right-column">
            <div className="panel alert-panel">
              <div className="panel-heading">
                <div>
                  <h2>Action Required</h2>

                  <p>
                    Highest-impact issues right now
                  </p>
                </div>

                <span className="alert-count">
                  {topActions.length}
                </span>
              </div>

              <div className="alert-list">
                {topActions.map(
                  (action) => (
                    <Link
                      className={`alert-item alert-${action.type}`}
                      href={action.href}
                      key={action.title}
                    >
                      <div className="alert-icon">
                        {action.type === "danger"
                          ? "!"
                          : action.type ===
                              "warning"
                            ? "◷"
                            : "↗"}
                      </div>

                      <div>
                        <strong>
                          {action.title}
                        </strong>

                        <p>
                          {action.detail}
                        </p>
                      </div>
                    </Link>
                  ),
                )}

                {topActions.length === 0 ? (
                  <div className="appointments-empty">
                    No urgent actions detected.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Upcoming</h2>

                  <p>
                    Next scheduled arrivals
                  </p>
                </div>

                <Link
                  className="text-button"
                  href="/appointments"
                >
                  View all →
                </Link>
              </div>

              <div className="appointment-list">
                {appointments
                  .slice(0, 4)
                  .map((appointment) => (
                    <Link
                      className="appointment-row"
                      href={`/appointments/${appointment.id}`}
                      key={appointment.id}
                    >
                      <div className="appointment-time">
                        {formatTime(
                          appointment.appointment_at,
                        )}
                      </div>

                      <div className="appointment-details">
                        <strong>
                          {appointment.vehicle}
                        </strong>

                        <span>
                          {
                            appointment.service_description
                          }
                        </span>
                      </div>

                      <span
                        className={
                          appointment.status ===
                          "arrived"
                            ? "appointment-status arrived"
                            : "appointment-status"
                        }
                      >
                        {formatAppointmentStatus(
                          appointment.status,
                        )}
                      </span>
                    </Link>
                  ))}

                {appointments.length === 0 ? (
                  <div className="appointments-empty">
                    No remaining appointments
                    today.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="panel queue-panel">
          <div className="panel-heading">
            <div>
              <h2>Dispatch Queue</h2>

              <p>
                Vehicles ready for technician
                assignment
              </p>
            </div>

            <Link
              className="secondary-button button-link"
              href="/dispatch"
            >
              Open Dispatch Board
            </Link>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>RO</th>
                  <th>Vehicle</th>
                  <th>Work Requested</th>
                  <th>Waiting</th>
                  <th>Labor</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {dispatchQueue
                  .slice(0, 6)
                  .map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span
                          className={`priority priority-${item.priority}`}
                        >
                          {priorityLabel(
                            item.priority,
                          )}
                        </span>
                      </td>

                      <td>
                        <strong>
                          RO {item.ro_number}
                        </strong>
                      </td>

                      <td>{item.vehicle}</td>

                      <td>
                        {
                          item.service_description
                        }
                      </td>

                      <td>
                        {formatWaitingTime(
                          item.waiting_since,
                          currentTimestamp,
                        )}
                      </td>

                      <td>
                        {safeNumber(
                          item.estimated_hours,
                        ).toFixed(1)}{" "}
                        hrs
                      </td>

                      <td>
                        <Link
                          className="assign-button button-link"
                          href="/dispatch"
                        >
                          Assign
                        </Link>
                      </td>
                    </tr>
                  ))}

                {dispatchQueue.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="repair-orders-empty">
                        No repair orders are
                        waiting for dispatch.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="production-command-summary">
          <article>
            <span>Labor Sales</span>
            <strong>
              {formatCurrency(laborSales)}
            </strong>
            <small>
              Projected{" "}
              {formatCurrency(
                projectedLaborSales,
              )}
            </small>
          </article>

          <article>
            <span>Sales Gap</span>
            <strong
              className={
                projectedSalesShortfall > 0
                  ? "negative"
                  : "positive"
              }
            >
              {formatCurrency(
                projectedSalesShortfall,
              )}
            </strong>
            <small>
              Against{" "}
              {formatCurrency(
                laborSalesGoal,
              )}{" "}
              goal
            </small>
          </article>

          <article>
            <span>Hours at Risk</span>
            <strong>
              {totalHoursAtRisk.toFixed(1)}
            </strong>
            <small>
              {formatCurrency(
                recoverableSales,
              )}{" "}
              potential labor sales
            </small>
          </article>

          <article>
            <span>Current Labor ARO</span>
            <strong>
              {formatCurrency(currentAro)}
            </strong>
            <small>
              {repairOrdersClosed} closed ROs
            </small>
          </article>

          <article>
            <span>Recovery Pace Needed</span>
            <strong>
              {requiredHourlyRecovery.toFixed(
                1,
              )}
            </strong>
            <small>
              Sold hours per remaining clock hour
            </small>
          </article>

          <article>
            <span>Technicians Waiting</span>
            <strong>
              {waitingTechnicians.length}
            </strong>
            <small>
              Approval, parts or information
            </small>
          </article>
      </section>
  </AppShell>
);
}