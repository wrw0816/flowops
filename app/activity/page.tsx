import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type DispatchEventType =
  | "created"
  | "assigned"
  | "reassigned"
  | "queued_next"
  | "started"
  | "status_changed"
  | "returned_to_dispatch"
  | "completed"
  | "unassigned";

type RelatedRecord =
  | {
      id: string;
      [key: string]: unknown;
    }
  | {
      id: string;
      [key: string]: unknown;
    }[]
  | null;

type DispatchEvent = {
  id: string;
  event_type: DispatchEventType;
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  created_at: string;
  repair_order_id: string | null;
  technician_id: string | null;
  previous_technician_id: string | null;
  repair_order: RelatedRecord;
  technician: RelatedRecord;
  previous_technician: RelatedRecord;
};

function firstRelatedRecord(record: RelatedRecord) {
  if (!record) {
    return null;
  }

  if (Array.isArray(record)) {
    return record[0] ?? null;
  }

  return record;
}

function relatedText(
  record: RelatedRecord,
  field: string,
  fallback: string,
) {
  const item = firstRelatedRecord(record);
  const value = item?.[field];

  return typeof value === "string" && value.trim()
    ? value
    : fallback;
}

function formatEventType(eventType: DispatchEventType) {
  return eventType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatStatus(status: string | null) {
  if (!status) {
    return "None";
  }

  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(value));
}

function eventClass(eventType: DispatchEventType) {
  if (
    eventType === "assigned" ||
    eventType === "started" ||
    eventType === "completed"
  ) {
    return "activity-event activity-event-success";
  }

  if (
    eventType === "returned_to_dispatch" ||
    eventType === "unassigned"
  ) {
    return "activity-event activity-event-danger";
  }

  if (
    eventType === "queued_next" ||
    eventType === "reassigned"
  ) {
    return "activity-event activity-event-warning";
  }

  return "activity-event activity-event-info";
}

function eventSymbol(eventType: DispatchEventType) {
  if (eventType === "assigned") return "A";
  if (eventType === "started") return "▶";
  if (eventType === "completed") return "✓";
  if (eventType === "queued_next") return "Q";
  if (eventType === "reassigned") return "↔";
  if (eventType === "returned_to_dispatch") return "↩";
  if (eventType === "unassigned") return "−";
  if (eventType === "created") return "+";

  return "•";
}

export default async function ActivityPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("dispatch_events")
    .select(`
      id,
      event_type,
      previous_status,
      new_status,
      note,
      created_at,
      repair_order_id,
      technician_id,
      previous_technician_id,
      repair_order:repair_orders!repair_order_id (
        id,
        ro_number,
        vehicle,
        service_description
      ),
      technician:technicians!technician_id (
        id,
        name
      ),
      previous_technician:technicians!previous_technician_id (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(
      `Unable to load dispatch activity: ${error.message}`,
    );
  }

  const events = (data ?? []) as DispatchEvent[];

  const assignmentCount = events.filter((event) =>
    ["assigned", "reassigned", "queued_next"].includes(
      event.event_type,
    ),
  ).length;

  const startedCount = events.filter(
    (event) => event.event_type === "started",
  ).length;

  const completedCount = events.filter(
    (event) => event.event_type === "completed",
  ).length;

  const returnedCount = events.filter(
    (event) =>
      event.event_type === "returned_to_dispatch",
  ).length;

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

            <Link className="nav-item" href="/appointments">
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

            <Link className="nav-item active" href="/activity">
              <span>↻</span>
              Activity
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
            <p className="eyebrow">Operational History</p>
            <h1>Dispatch Activity</h1>

            <p className="page-description">
              Review assignments, status changes and completed work.
            </p>
          </div>

          <div className="topbar-actions">
            <Link
              className="secondary-button button-link"
              href="/dispatch"
            >
              Open Dispatch Board
            </Link>
          </div>
        </header>

        <section className="activity-summary-grid">
          <article className="activity-summary-card">
            <span>Total Events</span>
            <strong>{events.length}</strong>
            <small>Most recent 100 records</small>
          </article>

          <article className="activity-summary-card">
            <span>Assignments</span>
            <strong>{assignmentCount}</strong>
            <small>Assigned, queued or reassigned</small>
          </article>

          <article className="activity-summary-card">
            <span>Work Started</span>
            <strong>{startedCount}</strong>
            <small>ROs moved into active work</small>
          </article>

          <article className="activity-summary-card">
            <span>Completed</span>
            <strong className="positive">{completedCount}</strong>
            <small>Ready for delivery or closed</small>
          </article>

          <article className="activity-summary-card">
            <span>Returned to Dispatch</span>
            <strong className="negative">{returnedCount}</strong>
            <small>ROs requiring reassignment</small>
          </article>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Activity</h2>
              <p>Newest events appear first</p>
            </div>
          </div>

          <div className="activity-timeline">
            {events.map((event) => {
              const roNumber = relatedText(
                event.repair_order,
                "ro_number",
                "Unknown RO",
              );

              const vehicle = relatedText(
                event.repair_order,
                "vehicle",
                "Unknown vehicle",
              );

              const technicianName = relatedText(
                event.technician,
                "name",
                "Unassigned",
              );

              const previousTechnicianName = relatedText(
                event.previous_technician,
                "name",
                "None",
              );

              return (
                <article className={eventClass(event.event_type)} key={event.id}>
                  <div className="activity-event-marker">
                    {eventSymbol(event.event_type)}
                  </div>

                  <div className="activity-event-content">
                    <div className="activity-event-heading">
                      <div>
                        <strong>
                          {formatEventType(event.event_type)}
                        </strong>

                        <span>
                          RO {roNumber} · {vehicle}
                        </span>
                      </div>

                      <time>
                        {formatDateTime(event.created_at)}
                      </time>
                    </div>

                    <p>
                      {event.note ??
                        `RO ${roNumber} recorded a dispatch event.`}
                    </p>

                    <div className="activity-event-details">
                      <div>
                        <span>Technician</span>
                        <strong>{technicianName}</strong>
                      </div>

                      <div>
                        <span>Previous Technician</span>
                        <strong>{previousTechnicianName}</strong>
                      </div>

                      <div>
                        <span>Previous Status</span>
                        <strong>
                          {formatStatus(event.previous_status)}
                        </strong>
                      </div>

                      <div>
                        <span>New Status</span>
                        <strong>
                          {formatStatus(event.new_status)}
                        </strong>
                      </div>
                    </div>

                    {event.repair_order_id ? (
                      <Link
                        className="activity-open-link"
                        href={`/repair-orders/${event.repair_order_id}`}
                      >
                        Open Repair Order →
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {events.length === 0 ? (
              <div className="activity-empty">
                No dispatch activity has been recorded yet.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}