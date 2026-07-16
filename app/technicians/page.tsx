import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type TechnicianStatus = "working" | "waiting" | "available" | "off";

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

function formatStatus(status: TechnicianStatus) {
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

function statusClass(status: TechnicianStatus) {
  if (status === "working") {
    return "technician-management-status working";
  }

  if (status === "waiting") {
    return "technician-management-status waiting";
  }

  if (status === "available") {
    return "technician-management-status available";
  }

  return "technician-management-status off";
}

export default async function TechniciansPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
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
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load technicians: ${error.message}`);
  }

  const technicians = (data ?? []) as Technician[];

  const activeTechnicians = technicians.filter(
    (technician) => technician.active,
  );

  const workingCount = activeTechnicians.filter(
    (technician) => technician.status === "working",
  ).length;

  const waitingCount = activeTechnicians.filter(
    (technician) => technician.status === "waiting",
  ).length;

  const availableCount = activeTechnicians.filter(
    (technician) => technician.status === "available",
  ).length;

  const totalSoldHours = activeTechnicians.reduce(
    (total, technician) =>
      total + Number(technician.sold_hours ?? 0),
    0,
  );

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

            <a className="nav-item" href="#">
              <span>◷</span>
              Appointments
            </a>

            <Link
              className="nav-item active"
              href="/technicians"
            >
              <span>●</span>
              Technicians
            </Link>

            <Link className="nav-item" href="/tv">
  <span>▥</span>
  TV Mode
</Link>

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
              <div className="shop-name">
                Alderman Automotive
              </div>

              <div className="shop-location">
                Primary location
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Team Management</p>
            <h1>Technicians</h1>

            <p className="page-description">
              Manage technician availability, workload and shop
              assignments.
            </p>
          </div>

          <div className="topbar-actions">
            <Link
              className="primary-button button-link"
              href="/technicians/new"
            >
              + Add Technician
            </Link>
          </div>
        </header>

        <section className="technician-summary-grid">
          <article className="technician-summary-card">
            <span>Active Technicians</span>
            <strong>{activeTechnicians.length}</strong>
            <small>{technicians.length} total records</small>
          </article>

          <article className="technician-summary-card">
            <span>Working</span>
            <strong>{workingCount}</strong>
            <small>Currently producing</small>
          </article>

          <article className="technician-summary-card">
            <span>Waiting</span>
            <strong className="warning">{waitingCount}</strong>
            <small>Approval, parts or information</small>
          </article>

          <article className="technician-summary-card">
            <span>Available</span>
            <strong className="negative">{availableCount}</strong>
            <small>Ready for dispatch</small>
          </article>

          <article className="technician-summary-card">
            <span>Current Sold Hours</span>
            <strong>{totalSoldHours.toFixed(1)}</strong>
            <small>Across active technicians</small>
          </article>
        </section>

        <section className="panel technician-management-panel">
          <div className="panel-heading">
            <div>
              <h2>Technician Roster</h2>
              <p>
                Current assignments, status and upcoming work
              </p>
            </div>
          </div>

          <div className="technician-management-grid">
            {technicians.map((technician) => (
              <article
                className={`technician-management-card ${
                  technician.active ? "" : "inactive"
                }`}
                key={technician.id}
              >
                <div className="technician-management-header">
                  <div className="technician-management-identity">
                    <div className="avatar">
                      {technician.initials ??
                        technician.name
                          .slice(0, 2)
                          .toUpperCase()}
                    </div>

                    <div>
                      <strong>{technician.name}</strong>

                      <div className={statusClass(technician.status)}>
                        <span />
                        {formatStatus(technician.status)}
                      </div>
                    </div>
                  </div>

                  <span
                    className={
                      technician.active
                        ? "technician-active-badge"
                        : "technician-inactive-badge"
                    }
                  >
                    {technician.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="technician-management-section">
                  <span className="technician-management-label">
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
                </div>

                <div className="technician-management-stats">
                  <div>
                    <span>Sold Hours</span>

                    <strong>
                      {Number(
                        technician.sold_hours ?? 0,
                      ).toFixed(1)}
                    </strong>
                  </div>

                  <div>
                    <span>Time in Status</span>

                    <strong>
                      {formatElapsed(
                        technician.elapsed_minutes,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Display Order</span>
                    <strong>{technician.display_order}</strong>
                  </div>
                </div>

                <div className="technician-management-next">
                  <span className="technician-management-label">
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

                <Link
                  className="technician-edit-link"
                  href={`/technicians/${technician.id}`}
                >
                  Manage Technician →
                </Link>
              </article>
            ))}

            {technicians.length === 0 ? (
              <div className="technician-management-empty">
                No technicians have been configured.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
