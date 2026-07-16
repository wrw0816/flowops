import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppointmentControls from "./AppointmentControls";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "arrived"
  | "late"
  | "cancelled"
  | "no_show"
  | "converted_to_ro";

type AppointmentPriority = "urgent" | "high" | "normal";

type Appointment = {
  id: string;
  customer_name: string | null;
  vehicle: string;
  service_description: string;
  advisor_name: string | null;
  appointment_at: string;
  promised_at: string | null;
  estimated_hours: number | string;
  priority: AppointmentPriority;
  status: AppointmentStatus;
  assigned_technician_id: string | null;
  repair_order_id: string | null;
  notes: string | null;
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

function formatStatus(status: AppointmentStatus) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

export default async function AppointmentDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: appointmentData, error: appointmentError } =
    await supabase
      .from("appointments")
      .select(`
        id,
        customer_name,
        vehicle,
        service_description,
        advisor_name,
        appointment_at,
        promised_at,
        estimated_hours,
        priority,
        status,
        assigned_technician_id,
        repair_order_id,
        notes,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .single();

  if (appointmentError || !appointmentData) {
    notFound();
  }

  const appointment = appointmentData as Appointment;

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

  const assignedTechnician =
    technicians.find(
      (technician) =>
        technician.id === appointment.assigned_technician_id,
    ) ?? null;

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

            <Link
              className="nav-item active"
              href="/appointments"
            >
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
            <p className="eyebrow">Appointment Detail</p>
            <h1>{appointment.vehicle}</h1>

            <p className="page-description">
              {appointment.customer_name ?? "No customer name"}
            </p>
          </div>

          <div className="topbar-actions">
            <Link
              className="secondary-button button-link"
              href="/appointments"
            >
              Back to Appointments
            </Link>

            {appointment.repair_order_id ? (
              <Link
                className="primary-button button-link"
                href={`/repair-orders/${appointment.repair_order_id}`}
              >
                Open Repair Order
              </Link>
            ) : null}
          </div>
        </header>

        <section className="appointment-detail-layout">
          <div className="appointment-detail-main">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Appointment</h2>
                  <p>Current scheduling information</p>
                </div>

                <span
                  className={`appointment-status-badge appointment-status-${appointment.status}`}
                >
                  {formatStatus(appointment.status)}
                </span>
              </div>

              <div className="ro-detail-grid">
                <div className="ro-detail-field">
                  <span>Customer</span>
                  <strong>
                    {appointment.customer_name ?? "Not provided"}
                  </strong>
                </div>

                <div className="ro-detail-field">
                  <span>Vehicle</span>
                  <strong>{appointment.vehicle}</strong>
                </div>

                <div className="ro-detail-field">
                  <span>Advisor</span>
                  <strong>
                    {appointment.advisor_name ?? "Unassigned"}
                  </strong>
                </div>

                <div className="ro-detail-field">
                  <span>Technician</span>
                  <strong>
                    {assignedTechnician?.name ?? "Unassigned"}
                  </strong>
                </div>

                <div className="ro-detail-field">
                  <span>Appointment Time</span>
                  <strong>
                    {formatDateTime(appointment.appointment_at)}
                  </strong>
                </div>

                <div className="ro-detail-field">
                  <span>Promised Completion</span>
                  <strong>
                    {formatDateTime(appointment.promised_at)}
                  </strong>
                </div>

                <div className="ro-detail-field">
                  <span>Estimated Labor</span>
                  <strong>
                    {Number(appointment.estimated_hours).toFixed(1)}{" "}
                    hours
                  </strong>
                </div>

                <div className="ro-detail-field">
                  <span>Priority</span>
                  <strong>{appointment.priority}</strong>
                </div>

                <div className="ro-detail-field ro-detail-field-wide">
                  <span>Service Requested</span>
                  <strong>
                    {appointment.service_description}
                  </strong>
                </div>

                <div className="ro-detail-field ro-detail-field-wide">
                  <span>Notes</span>
                  <strong>
                    {appointment.notes ?? "No notes"}
                  </strong>
                </div>
              </div>
            </section>
          </div>

          <aside className="appointment-detail-sidebar">
            <AppointmentControls
              appointment={appointment}
              technicians={technicians}
            />

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Record Information</h2>
                  <p>Appointment timestamps</p>
                </div>
              </div>

              <div className="ro-timing-list">
                <div>
                  <span>Created</span>
                  <strong>
                    {formatDateTime(appointment.created_at)}
                  </strong>
                </div>

                <div>
                  <span>Last Updated</span>
                  <strong>
                    {formatDateTime(appointment.updated_at)}
                  </strong>
                </div>

                <div>
                  <span>Repair Order</span>
                  <strong>
                    {appointment.repair_order_id
                      ? "Created"
                      : "Not created"}
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