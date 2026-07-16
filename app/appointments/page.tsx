import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
  notes: string | null;
  assigned_technician_id: string | null;
  technician:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

function formatStatus(status: AppointmentStatus) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPriority(priority: AppointmentPriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(value));
}

function getTechnicianName(technician: Appointment["technician"]) {
  if (!technician) {
    return "Unassigned";
  }

  if (Array.isArray(technician)) {
    return technician[0]?.name ?? "Unassigned";
  }

  return technician.name;
}

export default async function AppointmentsPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
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
      notes,
      assigned_technician_id,
      technician:technicians!assigned_technician_id (
        id,
        name
      )
    `)
    .gte("appointment_at", startOfDay.toISOString())
    .lte("appointment_at", endOfDay.toISOString())
    .order("appointment_at", { ascending: true });

  if (error) {
    throw new Error(`Unable to load appointments: ${error.message}`);
  }

  const appointments = (data ?? []) as Appointment[];

  const scheduledCount = appointments.filter(
    (appointment) => appointment.status === "scheduled",
  ).length;

  const confirmedCount = appointments.filter(
    (appointment) => appointment.status === "confirmed",
  ).length;

  const arrivedCount = appointments.filter(
    (appointment) => appointment.status === "arrived",
  ).length;

  const lateCount = appointments.filter(
    (appointment) => appointment.status === "late",
  ).length;

  const totalHours = appointments.reduce(
    (total, appointment) =>
      total + Number(appointment.estimated_hours ?? 0),
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
            <p className="eyebrow">Today&apos;s Schedule</p>
            <h1>Appointments</h1>

            <p className="page-description">
              See upcoming arrivals, shop load and check-in status.
            </p>
          </div>

          <div className="topbar-actions">
            <Link
              className="primary-button button-link"
              href="/appointments/new"
            >
              + Add Appointment
            </Link>
          </div>
        </header>

        <section className="appointment-summary-grid">
          <article className="appointment-summary-card">
            <span>Total Appointments</span>
            <strong>{appointments.length}</strong>
            <small>{totalHours.toFixed(1)} estimated labor hours</small>
          </article>

          <article className="appointment-summary-card">
            <span>Scheduled</span>
            <strong>{scheduledCount}</strong>
            <small>Not yet confirmed</small>
          </article>

          <article className="appointment-summary-card">
            <span>Confirmed</span>
            <strong>{confirmedCount}</strong>
            <small>Expected to arrive</small>
          </article>

          <article className="appointment-summary-card">
            <span>Arrived</span>
            <strong>{arrivedCount}</strong>
            <small>Checked in today</small>
          </article>

          <article className="appointment-summary-card">
            <span>Late</span>
            <strong className="negative">{lateCount}</strong>
            <small>Past appointment time</small>
          </article>
        </section>

        <section className="panel appointments-panel">
          <div className="panel-heading">
            <div>
              <h2>Today&apos;s Appointments</h2>
              <p>Scheduled arrivals in chronological order</p>
            </div>
          </div>

          <div className="appointments-board">
            {appointments.map((appointment) => (
              <article
                className={`appointment-board-card appointment-board-card-${appointment.status}`}
                key={appointment.id}
              >
                <div className="appointment-board-time">
                  <strong>
                    {formatTime(appointment.appointment_at)}
                  </strong>

                  <span
                    className={`appointment-status-badge appointment-status-${appointment.status}`}
                  >
                    {formatStatus(appointment.status)}
                  </span>
                </div>

                <div className="appointment-board-main">
                  <div>
                    <strong>
                      {appointment.customer_name ?? "No customer name"}
                    </strong>

                    <span>{appointment.vehicle}</span>
                  </div>

                  <p>{appointment.service_description}</p>

                  {appointment.notes ? (
                    <small>{appointment.notes}</small>
                  ) : null}
                </div>

                <div className="appointment-board-details">
                  <div>
                    <span>Advisor</span>
                    <strong>
                      {appointment.advisor_name ?? "Unassigned"}
                    </strong>
                  </div>

                  <div>
                    <span>Technician</span>
                    <strong>
                      {getTechnicianName(appointment.technician)}
                    </strong>
                  </div>

                  <div>
                    <span>Labor</span>
                    <strong>
                      {Number(
                        appointment.estimated_hours ?? 0,
                      ).toFixed(1)}{" "}
                      hrs
                    </strong>
                  </div>

                  <div>
                    <span>Priority</span>
                    <strong
                      className={`appointment-priority appointment-priority-${appointment.priority}`}
                    >
                      {formatPriority(appointment.priority)}
                    </strong>
                  </div>
                </div>

                <Link
                  className="appointment-open-link"
                  href={`/appointments/${appointment.id}`}
                >
                  Open →
                </Link>
              </article>
            ))}

            {appointments.length === 0 ? (
              <div className="appointments-empty">
                No appointments are scheduled for today.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}