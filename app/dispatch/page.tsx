import { createClient } from "@/lib/supabase/server";
import AssignmentForm from "./AssignmentForm";
type Technician = {
  id: string;
  name: string;
  initials: string | null;
  status: "working" | "waiting" | "available" | "off";
  current_ro: string | null;
  current_vehicle: string | null;
  current_operation: string | null;
  sold_hours: number | string;
  elapsed_minutes: number;
  next_ro: string | null;
  next_vehicle: string | null;
  display_order: number;
};

type RepairOrder = {
  id: string;
  ro_number: string;
  vehicle: string;
  service_description: string;
  advisor_name: string | null;
  priority: "urgent" | "high" | "normal";
  promised_at: string | null;
  estimated_hours: number | string;
  waiting_since: string;
};

function technicianStatusClass(status: Technician["status"]) {
  if (status === "working") return "dispatch-tech-status working";
  if (status === "waiting") return "dispatch-tech-status waiting";
  if (status === "available") return "dispatch-tech-status available";
  return "dispatch-tech-status off";
}

function formatStatus(status: Technician["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

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

function formatWaitingTime(waitingSince: string) {
  const start = new Date(waitingSince).getTime();
  const now = Date.now();
  const minutes = Math.max(0, Math.floor((now - start) / 60000));

  return formatElapsed(minutes);
}

function formatPromisedTime(promisedAt: string | null) {
  if (!promisedAt) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(promisedAt));
}

function priorityLabel(priority: RepairOrder["priority"]) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export default async function DispatchPage() {
  const supabase = await createClient();

  const [
    { data: technicianData, error: technicianError },
    { data: repairOrderData, error: repairOrderError },
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
        display_order
      `)
      .eq("active", true)
      .order("display_order", { ascending: true }),

    supabase
      .from("repair_orders")
      .select(`
        id,
        ro_number,
        vehicle,
        service_description,
        advisor_name,
        priority,
        promised_at,
        estimated_hours,
        waiting_since
      `)
      .eq("status", "waiting_dispatch")
      .order("waiting_since", { ascending: true }),
  ]);

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

  const technicians = (technicianData ?? []) as Technician[];
  const queue = (repairOrderData ?? []) as RepairOrder[];

  const workingCount = technicians.filter(
    (technician) => technician.status === "working",
  ).length;

  const availableTechnicians = technicians.filter(
    (technician) => technician.status === "available",
  );

  const totalWaitingHours = queue.reduce(
    (total, repairOrder) =>
      total + Number(repairOrder.estimated_hours ?? 0),
    0,
  );

  const atRiskCount = queue.filter((repairOrder) => {
    const waitingMinutes = Math.floor(
      (Date.now() - new Date(repairOrder.waiting_since).getTime()) / 60000,
    );

    return waitingMinutes >= 15 || repairOrder.priority === "urgent";
  }).length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-mark">F</div>

            <div>
              <div className="brand-name">FlowOps</div>
              <div className="brand-subtitle">Service Operations</div>
            </div>
          </div>

          <nav className="nav">
            <a className="nav-item" href="/">
              <span>▦</span>
              Command Center
            </a>

            <a className="nav-item active" href="/dispatch">
              <span>⇄</span>
              Dispatch Board
            </a>

            <a className="nav-item" href="#">
              <span>▤</span>
              Repair Orders
            </a>

            <a className="nav-item" href="#">
              <span>◷</span>
              Appointments
            </a>

            <a className="nav-item" href="#">
              <span>●</span>
              Technicians
            </a>

            <a className="nav-item" href="#">
              <span>▥</span>
              TV Mode
            </a>

            <a className="nav-item" href="#">
              <span>⌁</span>
              Analytics
            </a>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <a className="nav-item" href="#">
            <span>⚙</span>
            Shop Settings
          </a>

          <div className="shop-card">
            <div className="shop-icon">AA</div>

            <div>
              <div className="shop-name">Alderman Automotive</div>
              <div className="shop-location">Primary location</div>
            </div>
          </div>
        </div>
      </aside>

      <section className="content dispatch-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Live Shop Flow</p>
            <h1>Dispatch Board</h1>

            <p className="page-description">
              Assign work, monitor technician flow and eliminate idle time.
            </p>
          </div>

          <div className="topbar-actions">
            <div className="live-indicator">
              <span className="live-dot" />
              Live
            </div>

            <button className="secondary-button">TV Mode</button>
            <button className="primary-button">+ Add Repair Order</button>
          </div>
        </header>

        <section className="dispatch-summary">
          <article className="dispatch-summary-card">
            <span>Waiting Dispatch</span>
            <strong>{queue.length}</strong>
            <small>{totalWaitingHours.toFixed(1)} labor hours</small>
          </article>

          <article className="dispatch-summary-card">
            <span>Technicians Working</span>
            <strong>{workingCount}</strong>

            <small>
              {technicians.length > 0
                ? `${Math.round(
                    (workingCount / technicians.length) * 100,
                  )}% active utilization`
                : "No technicians configured"}
            </small>
          </article>

          <article className="dispatch-summary-card">
            <span>Available Now</span>

            <strong className="dispatch-red">
              {availableTechnicians.length}
            </strong>

            <small>
              {availableTechnicians.length > 0
                ? `${availableTechnicians[0].name} available now`
                : "No technicians currently available"}
            </small>
          </article>

          <article className="dispatch-summary-card">
            <span>At Risk</span>
            <strong className="dispatch-yellow">{atRiskCount}</strong>
            <small>Urgent or waiting more than 15 minutes</small>
          </article>
        </section>

        <section className="dispatch-layout">
          <div className="dispatch-queue-panel">
            <div className="dispatch-section-header">
              <div>
                <h2>Ready for Dispatch</h2>
                <p>Prioritized repair orders waiting for assignment</p>
              </div>

              <div className="dispatch-filter-row">
                <button className="dispatch-filter active">All</button>
                <button className="dispatch-filter">Waiting</button>
                <button className="dispatch-filter">Customer Waiter</button>
                <button className="dispatch-filter">Parts Ready</button>
              </div>
            </div>

            <div className="dispatch-card-list">
              {queue.length === 0 ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "#737985",
                    background: "#ffffff",
                    border: "1px solid #e4e6ea",
                    borderRadius: "10px",
                  }}
                >
                  No repair orders are currently waiting for dispatch.
                </div>
              ) : (
                queue.map((item) => (
                  <article className="dispatch-ro-card" key={item.id}>
                    <div className="dispatch-card-top">
                      <div className="dispatch-card-heading">
                        <span
                          className={`priority priority-${item.priority}`}
                        >
                          {priorityLabel(item.priority)}
                        </span>

                        <div>
                          <strong>RO {item.ro_number}</strong>
                          <span>{item.vehicle}</span>
                        </div>
                      </div>

                      <span className="dispatch-wait-time">
                        Waiting {formatWaitingTime(item.waiting_since)}
                      </span>
                    </div>

                    <div className="dispatch-service-name">
                      {item.service_description}
                    </div>

                    <div className="dispatch-card-details">
                      <div>
                        <span>Advisor</span>
                        <strong>{item.advisor_name ?? "Unassigned"}</strong>
                      </div>

                      <div>
                        <span>Promised</span>
                        <strong>
                          {formatPromisedTime(item.promised_at)}
                        </strong>
                      </div>

                      <div>
                        <span>Labor</span>
                        <strong>
                          {Number(item.estimated_hours).toFixed(1)} hrs
                        </strong>
                      </div>
                    </div>

                    <AssignmentForm
  repairOrderId={item.id}
  technicians={technicians.map((technician) => ({
    id: technician.id,
    name: technician.name,
    status: technician.status,
  }))}
/>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="dispatch-technician-panel">
            <div className="dispatch-section-header">
              <div>
                <h2>Technician Workload</h2>
                <p>Current and next assignments</p>
              </div>
            </div>

            <div className="dispatch-technician-list">
              {technicians.length === 0 ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "#737985",
                    background: "#ffffff",
                    border: "1px solid #e4e6ea",
                    borderRadius: "10px",
                  }}
                >
                  No technicians have been configured.
                </div>
              ) : (
                technicians.map((technician) => (
                  <article
                    className="dispatch-technician-card"
                    key={technician.id}
                  >
                    <div className="dispatch-tech-header">
                      <div className="dispatch-tech-identity">
                        <div className="avatar">
                          {technician.initials ??
                            technician.name.slice(0, 2).toUpperCase()}
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

                      <button className="row-action">•••</button>
                    </div>

                    <div className="dispatch-current-job">
                      <span className="dispatch-card-label">
                        Current Assignment
                      </span>

                      <strong>
                        {technician.current_ro ?? "No active RO"}
                      </strong>

                      <span>
                        {technician.current_vehicle ??
                          "No vehicle assigned"}
                      </span>

                      <small>
                        {technician.current_operation ??
                          "No active operation"}
                      </small>

                      <div className="dispatch-job-timer">
                        <span>Time in status</span>

                        <strong>
                          {formatElapsed(technician.elapsed_minutes)}
                        </strong>
                      </div>
                    </div>

                    <div className="dispatch-next-job">
                      <span className="dispatch-card-label">
                        Next Assignment
                      </span>

                      <strong>
                        {technician.next_ro ?? "Unassigned"}
                      </strong>

                      <span>
                        {technician.next_vehicle ??
                          "Needs next assignment"}
                      </span>
                    </div>

                    <button className="dispatch-manage-button">
                      Manage Technician
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}