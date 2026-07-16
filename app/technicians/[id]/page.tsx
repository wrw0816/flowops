import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TechnicianForm from "./TechnicianForm";

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
  created_at: string;
  updated_at: string;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(value));
}

function formatStatus(status: TechnicianStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
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

export default async function TechnicianDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
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
      display_order,
      created_at,
      updated_at
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const technician = data as Technician;

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
            <p className="eyebrow">Technician Management</p>
            <h1>{technician.name}</h1>

            <p className="page-description">
              Manage technician status, assignments and availability.
            </p>
          </div>

          <div className="topbar-actions">
            <Link
              className="secondary-button button-link"
              href="/technicians"
            >
              Back to Technicians
            </Link>

            <Link
              className="secondary-button button-link"
              href="/dispatch"
            >
              Open Dispatch
            </Link>
          </div>
        </header>

        <section className="technician-detail-layout">
          <div className="technician-detail-main">
            <TechnicianForm technician={technician} />
          </div>

          <aside className="technician-detail-sidebar">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Current Snapshot</h2>
                  <p>Live technician information</p>
                </div>
              </div>

              <div className="technician-snapshot">
                <div className="technician-snapshot-identity">
                  <div className="avatar technician-detail-avatar">
                    {technician.initials ??
                      technician.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <strong>{technician.name}</strong>

                    <div className={statusClass(technician.status)}>
                      <span />
                      {formatStatus(technician.status)}
                    </div>
                  </div>
                </div>

                <div className="technician-snapshot-row">
                  <span>Current RO</span>
                  <strong>
                    {technician.current_ro ?? "No active RO"}
                  </strong>
                </div>

                <div className="technician-snapshot-row">
                  <span>Current Vehicle</span>
                  <strong>
                    {technician.current_vehicle ??
                      "No vehicle assigned"}
                  </strong>
                </div>

                <div className="technician-snapshot-row">
                  <span>Next RO</span>
                  <strong>
                    {technician.next_ro ?? "Unassigned"}
                  </strong>
                </div>

                <div className="technician-snapshot-row">
                  <span>Sold Hours</span>
                  <strong>
                    {Number(technician.sold_hours ?? 0).toFixed(1)}
                  </strong>
                </div>

                <div className="technician-snapshot-row">
                  <span>Active</span>
                  <strong>
                    {technician.active ? "Yes" : "No"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Record Information</h2>
                  <p>Technician database timestamps</p>
                </div>
              </div>

              <div className="ro-timing-list">
                <div>
                  <span>Created</span>
                  <strong>
                    {formatDateTime(technician.created_at)}
                  </strong>
                </div>

                <div>
                  <span>Last Updated</span>
                  <strong>
                    {formatDateTime(technician.updated_at)}
                  </strong>
                </div>

                <div>
                  <span>Display Order</span>
                  <strong>{technician.display_order}</strong>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}