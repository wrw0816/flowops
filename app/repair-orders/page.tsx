import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

type RepairOrder = {
  id: string;
  ro_number: string;
  vehicle: string;
  service_description: string;
  advisor_name: string | null;
  priority: "urgent" | "high" | "normal";
  status:
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
  promised_at: string | null;
  estimated_hours: number | string;
  created_at: string;
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

function formatStatus(status: RepairOrder["status"]) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(value));
}

function getTechnicianName(technician: RepairOrder["technician"]) {
  if (!technician) return "Unassigned";

  if (Array.isArray(technician)) {
    return technician[0]?.name ?? "Unassigned";
  }

  return technician.name;
}

export default async function RepairOrdersPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
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
      created_at,
      assigned_technician_id,
      technician:technicians!assigned_technician_id (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load repair orders: ${error.message}`);
  }

  const repairOrders = (data ?? []) as RepairOrder[];

  const openCount = repairOrders.filter(
    (repairOrder) => repairOrder.status !== "closed",
  ).length;

  const waitingDispatchCount = repairOrders.filter(
    (repairOrder) => repairOrder.status === "waiting_dispatch",
  ).length;

  const inProgressCount = repairOrders.filter((repairOrder) =>
    ["in_progress", "ready_for_technician"].includes(repairOrder.status),
  ).length;

  const readyCount = repairOrders.filter(
    (repairOrder) => repairOrder.status === "ready_delivery",
  ).length;

  return (
  <AppShell activePage="repair-orders">
        <header className="topbar">
          <div>
            <p className="eyebrow">Repair Order Pipeline</p>
            <h1>Repair Orders</h1>
            <p className="page-description">
              Track every RO from check-in through delivery.
            </p>
          </div>

          <div className="topbar-actions">
            <Link
              className="primary-button button-link"
              href="/repair-orders/new"
            >
              + Add Repair Order
            </Link>
          </div>
        </header>

        <section className="repair-order-summary">
          <article className="repair-order-summary-card">
            <span>Open ROs</span>
            <strong>{openCount}</strong>
          </article>

          <article className="repair-order-summary-card">
            <span>Waiting Dispatch</span>
            <strong>{waitingDispatchCount}</strong>
          </article>

          <article className="repair-order-summary-card">
            <span>In Progress</span>
            <strong>{inProgressCount}</strong>
          </article>

          <article className="repair-order-summary-card">
            <span>Ready Delivery</span>
            <strong>{readyCount}</strong>
          </article>
        </section>

        <section className="panel repair-orders-panel">
          <div className="panel-heading">
            <div>
              <h2>All Repair Orders</h2>
              <p>{repairOrders.length} total records</p>
            </div>

            <div className="repair-order-filters">
              <button className="dispatch-filter active">All</button>
              <button className="dispatch-filter">Open</button>
              <button className="dispatch-filter">Waiting</button>
              <button className="dispatch-filter">In Progress</button>
              <button className="dispatch-filter">Ready</button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="repair-orders-table">
              <thead>
                <tr>
                  <th>RO</th>
                  <th>Vehicle</th>
                  <th>Work Requested</th>
                  <th>Status</th>
                  <th>Technician</th>
                  <th>Advisor</th>
                  <th>Hours</th>
                  <th>Promised</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {repairOrders.map((repairOrder) => (
                  <tr key={repairOrder.id}>
                    <td>
                      <strong>RO {repairOrder.ro_number}</strong>
                    </td>

                    <td>{repairOrder.vehicle}</td>

                    <td className="repair-order-description">
                      {repairOrder.service_description}
                    </td>

                    <td>
                      <span
                        className={`ro-status ro-status-${repairOrder.status}`}
                      >
                        {formatStatus(repairOrder.status)}
                      </span>
                    </td>

                    <td>{getTechnicianName(repairOrder.technician)}</td>

                    <td>{repairOrder.advisor_name ?? "Unassigned"}</td>

                    <td>
                      {Number(repairOrder.estimated_hours).toFixed(1)}
                    </td>

                    <td>{formatDateTime(repairOrder.promised_at)}</td>

                    <td>
                      <Link
                        className="repair-order-open-link"
                        href={`/repair-orders/${repairOrder.id}`}
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}

                {repairOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="repair-orders-empty">
                        No repair orders have been created.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </AppShell>
  );
}