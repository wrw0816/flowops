"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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

type Technician = {
  id: string;
  name: string;
  status: "working" | "waiting" | "available" | "off";
};

type RepairOrderControlsProps = {
  repairOrderId: string;
  roNumber: string;
  currentStatus: RepairOrderStatus;
  currentTechnicianId: string | null;
  technicians: Technician[];
};

type UpdateResponse = {
  success: boolean;
  message: string;
};

const workflowStatuses: {
  value: RepairOrderStatus;
  label: string;
}[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "checked_in", label: "Checked In" },
  { value: "waiting_dispatch", label: "Waiting Dispatch" },
  { value: "inspection", label: "Inspection" },
  { value: "waiting_estimate", label: "Waiting Estimate" },
  { value: "waiting_approval", label: "Waiting Approval" },
  { value: "approved", label: "Approved" },
  { value: "waiting_parts", label: "Waiting Parts" },
  {
    value: "ready_for_technician",
    label: "Ready for Technician",
  },
  { value: "in_progress", label: "In Progress" },
  { value: "quality_check", label: "Quality Check" },
  { value: "ready_delivery", label: "Ready for Delivery" },
  { value: "closed", label: "Closed" },
];

export default function RepairOrderControls({
  repairOrderId,
  roNumber,
  currentStatus,
  currentTechnicianId,
  technicians,
}: RepairOrderControlsProps) {
  const router = useRouter();

  const [status, setStatus] =
    useState<RepairOrderStatus>(currentStatus);

  const [technicianId, setTechnicianId] = useState(
    currentTechnicianId ?? "",
  );

  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<UpdateResponse | null>(
    null,
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPending(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/repair-orders/${repairOrderId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            technicianId: technicianId || null,
          }),
        },
      );

      const data = (await response.json()) as UpdateResponse;

      setResult(data);

      if (!response.ok || !data.success) {
        return;
      }

      router.refresh();
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The repair order could not be updated.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel ro-control-panel">
      <div className="panel-heading">
        <div>
          <h2>Manage RO</h2>
          <p>Update workflow and assignment</p>
        </div>
      </div>

      <form className="ro-control-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Workflow Status</span>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as RepairOrderStatus,
              )
            }
            disabled={pending}
          >
            {workflowStatuses.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Assigned Technician</span>

          <select
            value={technicianId}
            onChange={(event) =>
              setTechnicianId(event.target.value)
            }
            disabled={pending}
          >
            <option value="">Unassigned</option>

            {technicians
              .filter(
                (technician) => technician.status !== "off",
              )
              .map((technician) => (
                <option
                  key={technician.id}
                  value={technician.id}
                >
                  {technician.name}
                </option>
              ))}
          </select>
        </label>

        {result ? (
          <p
            className={
              result.success
                ? "form-message success"
                : "form-message error"
            }
          >
            {result.message}
          </p>
        ) : null}

        <button
          className="primary-button ro-update-button"
          type="submit"
          disabled={pending}
        >
          {pending
            ? "Updating..."
            : `Update RO ${roNumber}`}
        </button>
      </form>
    </section>
  );
}