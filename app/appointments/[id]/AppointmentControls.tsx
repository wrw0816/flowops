"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "arrived"
  | "late"
  | "cancelled"
  | "no_show"
  | "converted_to_ro";

type AppointmentPriority = "urgent" | "high" | "normal";

type Technician = {
  id: string;
  name: string;
  status: "working" | "waiting" | "available" | "off";
};

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
};

type AppointmentControlsProps = {
  appointment: Appointment;
  technicians: Technician[];
};

type ApiResponse = {
  success: boolean;
  message: string;
  repairOrderId?: string;
};

function toLocalInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);

  return localDate.toISOString().slice(0, 16);
}

export default function AppointmentControls({
  appointment,
  technicians,
}: AppointmentControlsProps) {
  const router = useRouter();

  const [status, setStatus] =
    useState<AppointmentStatus>(appointment.status);

  const [technicianId, setTechnicianId] = useState(
    appointment.assigned_technician_id ?? "",
  );

  const [appointmentAt, setAppointmentAt] = useState(
    toLocalInputValue(appointment.appointment_at),
  );

  const [promisedAt, setPromisedAt] = useState(
    toLocalInputValue(appointment.promised_at),
  );

  const [estimatedHours, setEstimatedHours] = useState(
    String(appointment.estimated_hours ?? 0),
  );

  const [notes, setNotes] = useState(
    appointment.notes ?? "",
  );

  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(
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
        `/api/appointments/${appointment.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            technicianId: technicianId || null,
            appointmentAt,
            promisedAt,
            estimatedHours,
            notes,
          }),
        },
      );

      const data = (await response.json()) as ApiResponse;

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
            : "The appointment could not be updated.",
      });
    } finally {
      setPending(false);
    }
  }

  async function convertToRepairOrder() {
    setPending(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/appointments/${appointment.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = (await response.json()) as ApiResponse;

      setResult(data);

      if (!response.ok || !data.success) {
        return;
      }

      if (data.repairOrderId) {
        router.push(`/repair-orders/${data.repairOrderId}`);
        router.refresh();
      }
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The appointment could not be converted.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Manage Appointment</h2>
          <p>Update check-in and scheduling details</p>
        </div>
      </div>

      <form
        className="ro-control-form"
        onSubmit={handleSubmit}
      >
        <label className="form-field">
          <span>Status</span>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as AppointmentStatus,
              )
            }
            disabled={pending}
          >
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="arrived">Arrived</option>
            <option value="late">Late</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
            <option value="converted_to_ro">
              Converted to RO
            </option>
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

        <label className="form-field">
          <span>Appointment Time</span>

          <input
            type="datetime-local"
            value={appointmentAt}
            onChange={(event) =>
              setAppointmentAt(event.target.value)
            }
            required
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Promised Completion</span>

          <input
            type="datetime-local"
            value={promisedAt}
            onChange={(event) =>
              setPromisedAt(event.target.value)
            }
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Estimated Labor Hours</span>

          <input
            type="number"
            min="0"
            step="0.1"
            value={estimatedHours}
            onChange={(event) =>
              setEstimatedHours(event.target.value)
            }
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Notes</span>

          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            rows={4}
            disabled={pending}
          />
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
          className="primary-button"
          type="submit"
          disabled={pending}
        >
          {pending
            ? "Saving..."
            : "Save Appointment Changes"}
        </button>

        {!appointment.repair_order_id ? (
          <button
            className="secondary-button appointment-convert-button"
            type="button"
            onClick={convertToRepairOrder}
            disabled={pending}
          >
            Convert Appointment to RO
          </button>
        ) : null}
      </form>
    </section>
  );
}