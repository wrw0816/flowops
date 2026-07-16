"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "arrived"
  | "late";

type AppointmentPriority = "urgent" | "high" | "normal";

type Technician = {
  id: string;
  name: string;
};

type AddAppointmentFormProps = {
  technicians: Technician[];
};

type AppointmentFormState = {
  customerName: string;
  vehicle: string;
  serviceDescription: string;
  advisorName: string;
  appointmentAt: string;
  promisedAt: string;
  estimatedHours: string;
  priority: AppointmentPriority;
  status: AppointmentStatus;
  technicianId: string;
  notes: string;
};

type CreateAppointmentResponse = {
  success: boolean;
  message: string;
};

const initialForm: AppointmentFormState = {
  customerName: "",
  vehicle: "",
  serviceDescription: "",
  advisorName: "",
  appointmentAt: "",
  promisedAt: "",
  estimatedHours: "1.0",
  priority: "normal",
  status: "scheduled",
  technicianId: "",
  notes: "",
};

export default function AddAppointmentForm({
  technicians,
}: AddAppointmentFormProps) {
  const router = useRouter();

  const [form, setForm] =
    useState<AppointmentFormState>(initialForm);

  const [pending, setPending] = useState(false);

  const [result, setResult] =
    useState<CreateAppointmentResponse | null>(null);

  function updateField<K extends keyof AppointmentFormState>(
    field: K,
    value: AppointmentFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPending(true);
    setResult(null);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data =
        (await response.json()) as CreateAppointmentResponse;

      setResult(data);

      if (!response.ok || !data.success) {
        return;
      }

      setForm(initialForm);

      setTimeout(() => {
        router.push("/appointments");
        router.refresh();
      }, 700);
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The appointment could not be created.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="repair-order-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-field">
          <span>Customer Name</span>

          <input
            type="text"
            value={form.customerName}
            onChange={(event) =>
              updateField("customerName", event.target.value)
            }
            placeholder="John Smith or company name"
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Vehicle</span>

          <input
            type="text"
            value={form.vehicle}
            onChange={(event) =>
              updateField("vehicle", event.target.value)
            }
            placeholder="2022 Ford Explorer"
            required
            disabled={pending}
          />
        </label>

        <label className="form-field form-field-wide">
          <span>Service Requested</span>

          <textarea
            value={form.serviceDescription}
            onChange={(event) =>
              updateField(
                "serviceDescription",
                event.target.value,
              )
            }
            placeholder="Oil change, brake inspection, diagnosis, etc."
            rows={4}
            required
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Advisor</span>

          <input
            type="text"
            value={form.advisorName}
            onChange={(event) =>
              updateField("advisorName", event.target.value)
            }
            placeholder="Advisor name"
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Assigned Technician</span>

          <select
            value={form.technicianId}
            onChange={(event) =>
              updateField("technicianId", event.target.value)
            }
            disabled={pending}
          >
            <option value="">Unassigned</option>

            {technicians.map((technician) => (
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
            value={form.appointmentAt}
            onChange={(event) =>
              updateField("appointmentAt", event.target.value)
            }
            required
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Promised Completion</span>

          <input
            type="datetime-local"
            value={form.promisedAt}
            onChange={(event) =>
              updateField("promisedAt", event.target.value)
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
            value={form.estimatedHours}
            onChange={(event) =>
              updateField(
                "estimatedHours",
                event.target.value,
              )
            }
            required
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Priority</span>

          <select
            value={form.priority}
            onChange={(event) =>
              updateField(
                "priority",
                event.target.value as AppointmentPriority,
              )
            }
            disabled={pending}
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>

        <label className="form-field">
          <span>Starting Status</span>

          <select
            value={form.status}
            onChange={(event) =>
              updateField(
                "status",
                event.target.value as AppointmentStatus,
              )
            }
            disabled={pending}
          >
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="arrived">Arrived</option>
            <option value="late">Late</option>
          </select>
        </label>

        <label className="form-field form-field-wide">
          <span>Notes</span>

          <textarea
            value={form.notes}
            onChange={(event) =>
              updateField("notes", event.target.value)
            }
            placeholder="Customer waiting, fleet unit number, special instructions, etc."
            rows={3}
            disabled={pending}
          />
        </label>
      </div>

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

      <div className="form-actions">
        <button
          className="primary-button"
          type="submit"
          disabled={pending}
        >
          {pending
            ? "Creating Appointment..."
            : "Create Appointment"}
        </button>
      </div>
    </form>
  );
}