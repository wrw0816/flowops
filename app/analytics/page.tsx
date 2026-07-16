import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveShopId } from "@/lib/shop-context";
import { getServerTimestamp } from "@/lib/server-time";

type RepairOrderStatus =
  | "scheduled"
  | "checked_in"
  | "waiting_dispatch"
  | "inspection"
  | "waiting_estimate"
  | "waiting_approval"
  | "approved"
  | "waiting_parts"
  | "ready_for_technician"
  | "in_progress"
  | "quality_check"
  | "ready_delivery"
  | "closed";

type TechnicianStatus =
  | "working"
  | "waiting"
  | "available"
  | "off";

type Shop = {
  id: string;
  name: string;
  shop_code: string | null;
  location_name: string | null;
};

type RepairOrder = {
  id: string;
  ro_number: string;
  vehicle: string;
  status: RepairOrderStatus;
  estimated_hours: number | string;
  waiting_since: string;
  dispatched_at: string | null;
  work_started_at: string | null;
  completed_at: string | null;
  assigned_technician_id: string | null;
};

type Technician = {
  id: string;
  name: string;
  status: TechnicianStatus;
  current_ro: string | null;
  current_vehicle: string | null;
  elapsed_minutes: number;
  status_changed_at: string | null;
  active: boolean;
};

type DispatchEvent = {
  id: string;
  event_type:
    | "created"
    | "assigned"
    | "reassigned"
    | "queued_next"
    | "started"
    | "status_changed"
    | "returned_to_dispatch"
    | "completed"
    | "unassigned";
  technician_id: string | null;
  created_at: string;
};

type TechnicianPerformance = {
  id: string;
  name: string;
  assignments: number;
  starts: number;
  completions: number;
  reassignments: number;
};

type BottleneckItem = {
  id: string;
  title: string;
  detail: string;
  status: string;
  minutes: number;
  severity: "danger" | "warning" | "info";
  href: string;
};

function differenceInMinutes(
  startValue: string | null,
  endValue: string | null,
) {
  if (!startValue || !endValue) {
    return null;
  }

  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    end < start
  ) {
    return null;
  }

  return Math.floor((end - start) / 60000);
}

function minutesSince(
  value: string | null,
  currentTimestamp: number,
) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor((currentTimestamp - timestamp) / 60000),
  );
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce((total, value) => total + value, 0) /
    values.length
  );
}

function formatDuration(totalMinutes: number) {
  const roundedMinutes = Math.max(
    0,
    Math.round(totalMinutes),
  );

  if (roundedMinutes < 60) {
    return `${roundedMinutes}m`;
  }

  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  return minutes > 0
    ? `${hours}h ${minutes}m`
    : `${hours}h`;
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function statusBottleneckStart(
  repairOrder: RepairOrder,
) {
  if (repairOrder.status === "waiting_dispatch") {
    return repairOrder.waiting_since;
  }

  if (
    repairOrder.status === "in_progress" ||
    repairOrder.status === "inspection" ||
    repairOrder.status === "quality_check"
  ) {
    return (
      repairOrder.work_started_at ??
      repairOrder.dispatched_at ??
      repairOrder.waiting_since
    );
  }

  return (
    repairOrder.dispatched_at ??
    repairOrder.waiting_since
  );
}

function bottleneckSeverity(
  status: RepairOrderStatus,
  minutes: number,
): BottleneckItem["severity"] {
  if (
    status === "waiting_dispatch" &&
    minutes >= 30
  ) {
    return "danger";
  }

  if (
    [
      "waiting_approval",
      "waiting_parts",
      "waiting_estimate",
    ].includes(status) &&
    minutes >= 45
  ) {
    return "danger";
  }

  if (minutes >= 20) {
    return "warning";
  }

  return "info";
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const shopId = getActiveShopId();
  const currentTimestamp = getServerTimestamp();

  const [
    { data: shopData, error: shopError },
    { data: repairOrderData, error: repairOrderError },
    { data: technicianData, error: technicianError },
    { data: eventData, error: eventError },
  ] = await Promise.all([
    supabase
      .from("shops")
      .select("id, name, shop_code, location_name")
      .eq("id", shopId)
      .single(),
    supabase
      .from("repair_orders")
      .select(`
        id,
        ro_number,
        vehicle,
        status,
        estimated_hours,
        waiting_since,
        dispatched_at,
        work_started_at,
        completed_at,
        assigned_technician_id
      `)
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("technicians")
      .select(`
        id,
        name,
        status,
        current_ro,
        current_vehicle,
        elapsed_minutes,
        status_changed_at,
        active
      `)
      .eq("shop_id", shopId)
      .order("display_order", { ascending: true }),

    supabase
      .from("dispatch_events")
      .select(`
        id,
        event_type,
        technician_id,
        created_at
      `)
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  if (shopError || !shopData) {
    throw new Error(
      `Unable to load shop settings: ${
        shopError?.message ?? "Shop not found"
      }`,
    );
  }

  if (repairOrderError) {
    throw new Error(
      `Unable to load repair orders: ${repairOrderError.message}`,
    );
  }

  if (technicianError) {
    throw new Error(
      `Unable to load technicians: ${technicianError.message}`,
    );
  }

  if (eventError) {
    throw new Error(
      `Unable to load dispatch history: ${eventError.message}`,
    );
  }

  const shop = shopData as Shop;

  const repairOrders =
    (repairOrderData ?? []) as RepairOrder[];

  const technicians =
    (technicianData ?? []) as Technician[];

  const events =
    (eventData ?? []) as DispatchEvent[];

  const dispatchTimes = repairOrders
    .map((repairOrder) =>
      differenceInMinutes(
        repairOrder.waiting_since,
        repairOrder.dispatched_at,
      ),
    )
    .filter(
      (value): value is number => value !== null,
    );

  const cycleTimes = repairOrders
    .map((repairOrder) =>
      differenceInMinutes(
        repairOrder.work_started_at,
        repairOrder.completed_at,
      ),
    )
    .filter(
      (value): value is number => value !== null,
    );

  const completedRepairOrders = repairOrders.filter(
    (repairOrder) =>
      repairOrder.status === "ready_delivery" ||
      repairOrder.status === "closed",
  );

  const openRepairOrders = repairOrders.filter(
    (repairOrder) => repairOrder.status !== "closed",
  );

  const waitingDispatchOrders = repairOrders.filter(
    (repairOrder) =>
      repairOrder.status === "waiting_dispatch",
  );

  const waitingApprovalHours = repairOrders
    .filter(
      (repairOrder) =>
        repairOrder.status === "waiting_approval",
    )
    .reduce(
      (total, repairOrder) =>
        total +
        Number(repairOrder.estimated_hours ?? 0),
      0,
    );

  const waitingPartsHours = repairOrders
    .filter(
      (repairOrder) =>
        repairOrder.status === "waiting_parts",
    )
    .reduce(
      (total, repairOrder) =>
        total +
        Number(repairOrder.estimated_hours ?? 0),
      0,
    );

  const waitingDispatchHours =
    waitingDispatchOrders.reduce(
      (total, repairOrder) =>
        total +
        Number(repairOrder.estimated_hours ?? 0),
      0,
    );

  const returnToDispatchCount = events.filter(
    (event) =>
      event.event_type === "returned_to_dispatch",
  ).length;

  const reassignmentCount = events.filter(
    (event) =>
      event.event_type === "reassigned",
  ).length;

  const technicianPerformance: TechnicianPerformance[] =
    technicians
      .filter((technician) => technician.active)
      .map((technician) => {
        const technicianEvents = events.filter(
          (event) =>
            event.technician_id === technician.id,
        );

        return {
          id: technician.id,
          name: technician.name,
          assignments: technicianEvents.filter(
            (event) =>
              event.event_type === "assigned" ||
              event.event_type === "queued_next",
          ).length,
          starts: technicianEvents.filter(
            (event) =>
              event.event_type === "started",
          ).length,
          completions: technicianEvents.filter(
            (event) =>
              event.event_type === "completed",
          ).length,
          reassignments: technicianEvents.filter(
            (event) =>
              event.event_type === "reassigned",
          ).length,
        };
      })
      .sort(
        (first, second) =>
          second.assignments - first.assignments,
      );

  const technicianIdleMinutes = technicians
    .filter(
      (technician) =>
        technician.active &&
        technician.status === "available",
    )
    .map((technician) =>
      technician.status_changed_at
        ? minutesSince(technician.status_changed_at, currentTimestamp)
        : technician.elapsed_minutes,
    );

  const technicianWaitingMinutes = technicians
    .filter(
      (technician) =>
        technician.active &&
        technician.status === "waiting",
    )
    .map((technician) =>
      technician.status_changed_at
        ? minutesSince(technician.status_changed_at, currentTimestamp)
        : technician.elapsed_minutes,
    );

  const repairOrderBottlenecks: BottleneckItem[] =
    openRepairOrders
      .filter((repairOrder) =>
        [
          "waiting_dispatch",
          "waiting_estimate",
          "waiting_approval",
          "waiting_parts",
          "ready_for_technician",
          "quality_check",
        ].includes(repairOrder.status),
      )
      .map((repairOrder) => {
        const minutes = minutesSince(
          statusBottleneckStart(repairOrder),
          currentTimestamp,
        );

        return {
          id: repairOrder.id,
          title: `RO ${repairOrder.ro_number}`,
          detail: repairOrder.vehicle,
          status: formatStatus(repairOrder.status),
          minutes,
          severity: bottleneckSeverity(
            repairOrder.status,
            minutes,
          ),
          href: `/repair-orders/${repairOrder.id}`,
        };
      });

  const technicianBottlenecks: BottleneckItem[] =
    technicians
      .filter(
        (technician) =>
          technician.active &&
          ["available", "waiting"].includes(
            technician.status,
          ),
      )
      .map((technician) => {
        const minutes = technician.status_changed_at
          ? minutesSince(technician.status_changed_at, currentTimestamp)
          : technician.elapsed_minutes;

        return {
          id: `technician-${technician.id}`,
          title: technician.name,
          detail:
            technician.current_ro ??
            technician.current_vehicle ??
            "No active assignment",
          status: formatStatus(technician.status),
          minutes,
          severity:
            minutes >= 30
              ? "danger"
              : minutes >= 15
                ? "warning"
                : "info",
          href: `/technicians/${technician.id}`,
        };
      });

  const bottlenecks = [
    ...repairOrderBottlenecks,
    ...technicianBottlenecks,
  ]
    .sort(
      (first, second) =>
        second.minutes - first.minutes,
    )
    .slice(0, 10);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-mark">F</div>

            <div>
              <div className="brand-name">
                FlowOps
              </div>

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

            <Link
              className="nav-item"
              href="/dispatch"
            >
              <span>⇄</span>
              Dispatch Board
            </Link>

            <Link
              className="nav-item"
              href="/repair-orders"
            >
              <span>▤</span>
              Repair Orders
            </Link>

            <Link
              className="nav-item"
              href="/appointments"
            >
              <span>◷</span>
              Appointments
            </Link>

            <Link
              className="nav-item"
              href="/technicians"
            >
              <span>●</span>
              Technicians
            </Link>

            <Link className="nav-item" href="/tv">
              <span>▥</span>
              TV Mode
            </Link>

            <Link
              className="nav-item"
              href="/activity"
            >
              <span>↻</span>
              Activity
            </Link>

            <Link
              className="nav-item active"
              href="/analytics"
            >
              <span>⌁</span>
              Analytics
            </Link>

            <Link
              className="nav-item"
              href="/production"
            >
              <span>◎</span>
              Production
            </Link>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <Link className="nav-item" href="/settings">
            <span>⚙</span>
            Shop Settings
          </Link>

          <div className="shop-card">
            <div className="shop-icon">
              {shop.shop_code ?? "AA"}
            </div>

            <div>
              <div className="shop-name">
                {shop.name}
              </div>

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
            <p className="eyebrow">
              Dispatch Performance
            </p>

            <h1>Operations Analytics</h1>

            <p className="page-description">
              Measure shop movement, assignment speed and
              current bottlenecks.
            </p>
          </div>

          <div className="topbar-actions">
            <Link
              className="secondary-button button-link"
              href="/activity"
            >
              View Activity
            </Link>

            <Link
              className="secondary-button button-link"
              href="/dispatch"
            >
              Open Dispatch
            </Link>
          </div>
        </header>

        <section className="analytics-primary-grid">
          <article className="analytics-primary-card">
            <span>Average Dispatch Time</span>

            <strong>
              {formatDuration(average(dispatchTimes))}
            </strong>

            <small>
              Waiting dispatch to technician assignment
            </small>
          </article>

          <article className="analytics-primary-card">
            <span>Average Repair Cycle</span>

            <strong>
              {formatDuration(average(cycleTimes))}
            </strong>

            <small>
              Work started to ready or closed
            </small>
          </article>

          <article className="analytics-primary-card">
            <span>Completed ROs</span>

            <strong className="positive">
              {completedRepairOrders.length}
            </strong>

            <small>
              Ready for delivery or closed
            </small>
          </article>

          <article className="analytics-primary-card">
            <span>Returned to Dispatch</span>

            <strong className="negative">
              {returnToDispatchCount}
            </strong>

            <small>
              ROs requiring another assignment
            </small>
          </article>

          <article className="analytics-primary-card">
            <span>Reassignments</span>

            <strong className="warning">
              {reassignmentCount}
            </strong>

            <small>
              Technician changes recorded
            </small>
          </article>

          <article className="analytics-primary-card">
            <span>Average Available Time</span>

            <strong>
              {formatDuration(
                average(technicianIdleMinutes),
              )}
            </strong>

            <small>
              Current idle technicians
            </small>
          </article>
        </section>

        <section className="analytics-secondary-grid">
          <article className="analytics-hour-card">
            <span>Waiting Dispatch Hours</span>
            <strong>
              {waitingDispatchHours.toFixed(1)}
            </strong>
          </article>

          <article className="analytics-hour-card">
            <span>Waiting Approval Hours</span>
            <strong>
              {waitingApprovalHours.toFixed(1)}
            </strong>
          </article>

          <article className="analytics-hour-card">
            <span>Waiting Parts Hours</span>
            <strong>
              {waitingPartsHours.toFixed(1)}
            </strong>
          </article>

          <article className="analytics-hour-card">
            <span>Average Technician Wait</span>
            <strong>
              {formatDuration(
                average(technicianWaitingMinutes),
              )}
            </strong>
          </article>

          <article className="analytics-hour-card">
            <span>Open Repair Orders</span>
            <strong>{openRepairOrders.length}</strong>
          </article>

          <article className="analytics-hour-card">
            <span>Activity Events</span>
            <strong>{events.length}</strong>
          </article>
        </section>

        <section className="analytics-main-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Technician Activity</h2>

                <p>
                  Assignment and workflow events by
                  technician
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Assignments</th>
                    <th>Starts</th>
                    <th>Completions</th>
                    <th>Reassignments</th>
                    <th>Completion Rate</th>
                  </tr>
                </thead>

                <tbody>
                  {technicianPerformance.map(
                    (technician) => {
                      const completionRate =
                        technician.starts > 0
                          ? Math.round(
                              (technician.completions /
                                technician.starts) *
                                100,
                            )
                          : 0;

                      return (
                        <tr key={technician.id}>
                          <td>
                            <Link
                              className="analytics-tech-link"
                              href={`/technicians/${technician.id}`}
                            >
                              {technician.name}
                            </Link>
                          </td>

                          <td>
                            {technician.assignments}
                          </td>

                          <td>
                            {technician.starts}
                          </td>

                          <td>
                            {technician.completions}
                          </td>

                          <td>
                            {technician.reassignments}
                          </td>

                          <td>
                            <div className="analytics-rate">
                              <div className="analytics-rate-track">
                                <div
                                  className="analytics-rate-bar"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      completionRate,
                                    )}%`,
                                  }}
                                />
                              </div>

                              <strong>
                                {completionRate}%
                              </strong>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}

                  {technicianPerformance.length ===
                  0 ? (
                    <tr>
                      <td colSpan={6}>
                        No technician activity is
                        available.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="panel">
            <div className="panel-heading">
              <div>
                <h2>Current Bottlenecks</h2>

                <p>
                  Longest operational delays right now
                </p>
              </div>
            </div>

            <div className="analytics-bottleneck-list">
              {bottlenecks.map((item) => (
                <Link
                  className={`analytics-bottleneck analytics-bottleneck-${item.severity}`}
                  href={item.href}
                  key={item.id}
                >
                  <div className="analytics-bottleneck-top">
                    <strong>{item.title}</strong>

                    <span>
                      {formatDuration(item.minutes)}
                    </span>
                  </div>

                  <p>{item.detail}</p>

                  <small>{item.status}</small>
                </Link>
              ))}

              {bottlenecks.length === 0 ? (
                <div className="analytics-empty">
                  No active bottlenecks detected.
                </div>
              ) : null}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}