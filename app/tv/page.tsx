import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveShopId } from "@/lib/shop-context";
import { getServerTimestamp } from "@/lib/server-time";
import AutoRefresh from "./AutoRefresh";

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
};

type RepairOrder = {
  id: string;
  ro_number: string;
  vehicle: string;
  service_description: string;
  priority: "urgent" | "high" | "normal";
  estimated_hours: number | string;
  waiting_since: string;
  promised_at: string | null;
};

function formatElapsed(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

function formatWaitingTime(
  waitingSince: string,
  currentTimestamp: number,
) {
  const waitingSinceTimestamp = new Date(waitingSince).getTime();

  if (Number.isNaN(waitingSinceTimestamp)) {
    return "Unknown";
  }

  const elapsedMinutes = Math.max(
    0,
    Math.floor(
      (currentTimestamp - waitingSinceTimestamp) / 60000,
    ),
  );

  return formatElapsed(elapsedMinutes);
}

function formatPromisedTime(promisedAt: string | null) {
  if (!promisedAt) {
    return "No promise";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(promisedAt));
}

function formatStatus(status: TechnicianStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function technicianStatusClass(status: TechnicianStatus) {
  if (status === "working") {
    return "tv-technician-status working";
  }

  if (status === "waiting") {
    return "tv-technician-status waiting";
  }

  if (status === "available") {
    return "tv-technician-status available";
  }

  return "tv-technician-status off";
}

function priorityLabel(priority: RepairOrder["priority"]) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export default async function TvModePage() {
  const supabase = await createClient();
  const shopId = getActiveShopId();
  const currentTimestamp = getServerTimestamp();

  const [
    { data: technicianData, error: technicianError },
    { data: repairOrderData, error: repairOrderError },
    { data: shopData, error: shopError },
  ] = await Promise.all([
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
        display_order
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
        estimated_hours,
        waiting_since,
        promised_at
      `)
      .eq("shop_id", shopId)
      .eq("status", "waiting_dispatch")
      .order("waiting_since", { ascending: true }),

    supabase
      .from("shops")
      .select("name, daily_labor_goal")
      .eq("id", shopId)
      .single(),
  ]);

  if (technicianError) {
    throw new Error(
      `Unable to load technicians: ${technicianError.message}`,
    );
  }

  if (repairOrderError) {
    throw new Error(
      `Unable to load dispatch queue: ${repairOrderError.message}`,
    );
  }

  if (shopError) {
    throw new Error(
      `Unable to load shop settings: ${shopError.message}`,
    );
  }

  const technicians = (technicianData ?? []) as Technician[];
  const repairOrders = (repairOrderData ?? []) as RepairOrder[];

  const dailyLaborGoal = Number(
    shopData?.daily_labor_goal ?? 32,
  );

  const activeSoldHours = technicians.reduce(
    (total, technician) =>
      total + Number(technician.sold_hours ?? 0),
    0,
  );

  const waitingLaborHours = repairOrders.reduce(
    (total, repairOrder) =>
      total + Number(repairOrder.estimated_hours ?? 0),
    0,
  );

  const workingCount = technicians.filter(
    (technician) => technician.status === "working",
  ).length;

  const waitingCount = technicians.filter(
    (technician) => technician.status === "waiting",
  ).length;

  const availableCount = technicians.filter(
    (technician) => technician.status === "available",
  ).length;

  const goalPercentage =
    dailyLaborGoal > 0
      ? Math.min(
          100,
          Math.round((activeSoldHours / dailyLaborGoal) * 100),
        )
      : 0;

  return (
    <main className="tv-shell">
      <AutoRefresh intervalSeconds={10} />

      <header className="tv-header">
        <div className="tv-brand">
          <div className="tv-brand-mark">F</div>

          <div>
            <div className="tv-brand-name">FlowOps</div>
            <div className="tv-shop-name">
              {shopData?.name ?? "FlowOps Shop"}
            </div>
          </div>
        </div>

        <div className="tv-header-center">
          <h1>Live Shop Flow</h1>
          <p>Technician assignments and dispatch readiness</p>
        </div>

        <div className="tv-header-actions">
          <div className="tv-live-badge">
            <span />
            Live
          </div>

          <Link className="tv-exit-link" href="/dispatch">
            Exit TV Mode
          </Link>
        </div>
      </header>

      <section className="tv-metrics">
        <article className="tv-metric-card">
          <span>Active Sold Hours</span>
          <strong>{activeSoldHours.toFixed(1)}</strong>
          <small>Goal: {dailyLaborGoal.toFixed(1)}</small>
        </article>

        <article className="tv-metric-card">
          <span>Goal Progress</span>
          <strong>{goalPercentage}%</strong>

          <div className="tv-progress-track">
            <div
              className="tv-progress-bar"
              style={{ width: `${goalPercentage}%` }}
            />
          </div>
        </article>

        <article className="tv-metric-card">
          <span>Waiting Dispatch</span>
          <strong>{repairOrders.length}</strong>
          <small>{waitingLaborHours.toFixed(1)} labor hours</small>
        </article>

        <article className="tv-metric-card">
          <span>Working</span>
          <strong>{workingCount}</strong>
          <small>{technicians.length} active technicians</small>
        </article>

        <article className="tv-metric-card">
          <span>Waiting</span>
          <strong className="tv-warning-number">
            {waitingCount}
          </strong>
          <small>Approval, parts or information</small>
        </article>

        <article className="tv-metric-card">
          <span>Available</span>
          <strong className="tv-danger-number">
            {availableCount}
          </strong>
          <small>Ready for assignment</small>
        </article>
      </section>

      <section className="tv-main-grid">
        <section className="tv-technician-panel">
          <div className="tv-section-heading">
            <div>
              <h2>Technician Board</h2>
              <p>Current assignment and next job</p>
            </div>

            <span>{technicians.length} technicians</span>
          </div>

          <div className="tv-technician-grid">
            {technicians.map((technician) => (
              <article
                className={`tv-technician-card tv-technician-card-${technician.status}`}
                key={technician.id}
              >
                <div className="tv-technician-header">
                  <div className="tv-technician-identity">
                    <div className="tv-avatar">
                      {technician.initials ??
                        technician.name
                          .slice(0, 2)
                          .toUpperCase()}
                    </div>

                    <div>
                      <strong>{technician.name}</strong>

                      <div
                        className={technicianStatusClass(
                          technician.status,
                        )}
                      >
                        <span />
                        {formatStatus(technician.status)}
                      </div>
                    </div>
                  </div>

                  <div className="tv-time-status">
                    {formatElapsed(technician.elapsed_minutes)}
                  </div>
                </div>

                <div className="tv-current-assignment">
                  <span>Current Assignment</span>

                  <strong>
                    {technician.current_ro ?? "No Active RO"}
                  </strong>

                  <p>
                    {technician.current_vehicle ??
                      "Ready for dispatch"}
                  </p>

                  <small>
                    {technician.current_operation ??
                      "No active operation"}
                  </small>
                </div>

                <div className="tv-technician-hours">
                  <span>Sold Hours</span>

                  <strong>
                    {Number(
                      technician.sold_hours ?? 0,
                    ).toFixed(1)}
                  </strong>
                </div>

                <div className="tv-next-assignment">
                  <span>Next Assignment</span>

                  <strong>
                    {technician.next_ro ?? "Unassigned"}
                  </strong>

                  <p>
                    {technician.next_vehicle ??
                      "Needs next assignment"}
                  </p>
                </div>
              </article>
            ))}

            {technicians.length === 0 ? (
              <div className="tv-empty-state">
                No active technicians are configured.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="tv-dispatch-panel">
          <div className="tv-section-heading">
            <div>
              <h2>Dispatch Queue</h2>
              <p>Vehicles waiting for assignment</p>
            </div>

            <span>{repairOrders.length} waiting</span>
          </div>

          <div className="tv-dispatch-list">
            {repairOrders.map((repairOrder, index) => (
              <article
                className="tv-dispatch-card"
                key={repairOrder.id}
              >
                <div className="tv-dispatch-priority">
                  <span
                    className={`priority priority-${repairOrder.priority}`}
                  >
                    {priorityLabel(repairOrder.priority)}
                  </span>

                  <strong>#{index + 1}</strong>
                </div>

                <div className="tv-dispatch-ro">
                  <strong>RO {repairOrder.ro_number}</strong>
                  <span>{repairOrder.vehicle}</span>
                </div>

                <div className="tv-dispatch-service">
                  {repairOrder.service_description}
                </div>

                <div className="tv-dispatch-footer">
                  <div>
                    <span>Waiting</span>
                    <strong>
                      {formatWaitingTime(
                        repairOrder.waiting_since,
                        currentTimestamp,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Labor</span>
                    <strong>
                      {Number(
                        repairOrder.estimated_hours,
                      ).toFixed(1)}{" "}
                      hrs
                    </strong>
                  </div>

                  <div>
                    <span>Promised</span>
                    <strong>
                      {formatPromisedTime(
                        repairOrder.promised_at,
                      )}
                    </strong>
                  </div>
                </div>
              </article>
            ))}

            {repairOrders.length === 0 ? (
              <div className="tv-empty-state">
                No repair orders are waiting for dispatch.
              </div>
            ) : null}
          </div>
        </aside>
      </section>

      <footer className="tv-footer">
        <span>FlowOps Service Operations</span>

        <span>
          Automatically refreshes every 10 seconds
        </span>
      </footer>
    </main>
  );
}