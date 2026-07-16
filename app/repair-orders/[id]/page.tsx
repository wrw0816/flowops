import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RepairOrderControls from "./RepairOrderControls";

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

type RepairOrderPriority = "urgent" | "high" | "normal";

type RepairOrder = {
  id: string;
  ro_number: string;
  vehicle: string;
  service_description: string;
  advisor_name: string | null;
  priority: RepairOrderPriority;
  status: RepairOrderStatus;
  promised_at: string | null;
  estimated_hours: number | string;
  assigned_technician_id: string | null;
  waiting_since: string;
  created_at: string;
  updated_at: string;
};

type Technician = {
  id: string;
  name: string;
  status: "working" | "waiting" | "available" | "off";
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatStatus(status: RepairOrderStatus) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPriority(priority: RepairOrderPriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(value));
}

export default async function RepairOrderDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: repairOrderData, error: repairOrderError } =
    await supabase
      .from("repair_orders")
      .select(`
        id,
        ro_number,
        vehicle,
        service_description,
        advisor_name,
        priority,
        status,
        promised_at,
        estimated_hours,
        assigned_technician_id,
        waiting_since,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .single();

  if (repairOrderError || !repairOrderData) {
    notFound();
  }

  const repairOrder = repairOrderData as RepairOrder;

  let assignedTechnician: Technician | null = null;

  if (repairOrder.assigned_technician_id) {
    const { data: technicianData } = await supabase
      .from("technicians")
      .select("id, name, status")
      .eq("id", repairOrder.assigned_technician_id)
      .single();

    assignedTechnician = technicianData as Technician | null;
  }

  const { data: technicianData, error: technicianError } =
    await supabase
      .from("technicians")
      .select("id, name, status")
      .eq("active", true)
      .order("display_order", { ascending: true });

  if (technicianError) {
    throw new Error(
      `Unable to load technicians: ${technicianError.message}`,
    );
  }

  const technicians = (technicianData ?? []) as Technician[];

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

            <Link
              className="nav-item active"
              href="/repair-orders"
            >
              <span>▤</span>
              Repair Orders
            </Link>

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
            <p className="eyebrow">Repair Order Detail</p>

            <h1>RO {repairOrder.ro_number}</h1>

            <p className="page-description">
              {repairOrder.vehicle}
            </p>
          </div>

          <div className="topbar-actions">
            <Link
              className="secondary-button button-link"
              href="/repair-orders"
            >
              Back to Repair Orders
            </Link>

            <Link
              className="secondary-button button-link"
              href="/dispatch"
            >
              Open Dispatch
            </Link>
          </div>
        </header>

        <section className="ro-detail-layout">
          <div className="ro-detail-main">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Repair Order</h2>
                  <p>Current service information</p>
                </div>

                <span
                  className={`ro-status ro-status-${repairOrder.status}`}
                >
                  {formatStatus(repairOrder.status)}
                </span>
              </div>

              <div className="ro-detail-grid">
                <div className="ro-detail-field">
                  <span>RO Number</span>
                  <strong>RO {repairOrder.ro_number}</strong>
                </div>

                <div className="ro-detail-field">
                  <span>Vehicle</span>
                  <strong>{repairOrder.vehicle}</strong>
                </div>

                <div className="ro-detail-field">
                  <span>Advisor</span>
                  <strong>
                    {repairOrder.advisor_name ?? "Unassigned"}
                  </strong>
                </div>

                <div className="ro-detail-field">
                  <span>Technician</span>
                  <strong>
                    {assignedTechnician?.name ?? "Unassigned"}
                  </strong>
                </div>

                <div className="ro-detail-field">
                  <span>Priority</span>

                  <strong
                    className={`priority-text priority-text-${repairOrder.priority}`}
                  >
                    {formatPriority(repairOrder.priority)}
                  </strong>
                </div>

                <div className="ro-detail-field">
                  <span>Estimated Labor</span>

                  <strong>
                    {Number(repairOrder.estimated_hours).toFixed(1)}{" "}
                    hours
                  </strong>
                </div>

                <div className="ro-detail-field">
                  <span>Promised Time</span>
                  <strong>
                    {formatDateTime(repairOrder.promised_at)}
                  </strong>
                </div>

                <div className="ro-detail-field">
                  <span>Created</span>
                  <strong>
                    {formatDateTime(repairOrder.created_at)}
                  </strong>
                </div>

                <div className="ro-detail-field ro-detail-field-wide">
                  <span>Work Requested</span>

                  <strong>
                    {repairOrder.service_description}
                  </strong>
                </div>
              </div>
            </section>

            <section className="panel ro-workflow-panel">
              <div className="panel-heading">
                <div>
                  <h2>Workflow Progress</h2>
                  <p>Current position in the service process</p>
                </div>
              </div>

              <div className="ro-workflow-track">
                {[
                  "Checked In",
                  "Dispatch",
                  "Inspection",
                  "Approval",
                  "Repair",
                  "Quality Check",
                  "Ready",
                  "Closed",
                ].map((step) => (
                  <div className="ro-workflow-step" key={step}>
                    <span />
                    <small>{step}</small>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="ro-detail-sidebar">
            <RepairOrderControls
              repairOrderId={repairOrder.id}
              roNumber={repairOrder.ro_number}
              currentStatus={repairOrder.status}
              currentTechnicianId={
                repairOrder.assigned_technician_id
              }
              technicians={technicians}
            />

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Timing</h2>
                  <p>Important RO timestamps</p>
                </div>
              </div>

              <div className="ro-timing-list">
                <div>
                  <span>Waiting Since</span>
                  <strong>
                    {formatDateTime(repairOrder.waiting_since)}
                  </strong>
                </div>

                <div>
                  <span>Last Updated</span>
                  <strong>
                    {formatDateTime(repairOrder.updated_at)}
                  </strong>
                </div>

                <div>
                  <span>Promised</span>
                  <strong>
                    {formatDateTime(repairOrder.promised_at)}
                  </strong>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}