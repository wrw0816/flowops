"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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

type TechnicianFormProps = {
  technician: Technician;
};

type TechnicianFormState = {
  name: string;
  initials: string;
  status: TechnicianStatus;
  active: boolean;
  displayOrder: string;
  currentRo: string;
  currentVehicle: string;
  currentOperation: string;
  soldHours: string;
  elapsedMinutes: string;
  nextRo: string;
  nextVehicle: string;
};

type UpdateTechnicianResponse = {
  success: boolean;
  message: string;
};

export default function TechnicianForm({
  technician,
}: TechnicianFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<TechnicianFormState>({
    name: technician.name,
    initials: technician.initials ?? "",
    status: technician.status,
    active: technician.active,
    displayOrder: String(technician.display_order),
    currentRo: technician.current_ro ?? "",
    currentVehicle: technician.current_vehicle ?? "",
    currentOperation: technician.current_operation ?? "",
    soldHours: String(technician.sold_hours ?? 0),
    elapsedMinutes: String(technician.elapsed_minutes ?? 0),
    nextRo: technician.next_ro ?? "",
    nextVehicle: technician.next_vehicle ?? "",
  });

  const [pending, setPending] = useState(false);
  const [result, setResult] =
    useState<UpdateTechnicianResponse | null>(null);

  function updateField<K extends keyof TechnicianFormState>(
    field: K,
    value: TechnicianFormState[K],
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
      const response = await fetch(
        `/api/technicians/${technician.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const data =
        (await response.json()) as UpdateTechnicianResponse;

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
            : "The technician could not be updated.",
      });
    } finally {
      setPending(false);
    }
  }

  function clearCurrentAssignment() {
    setForm((current) => ({
      ...current,
      status: "available",
      currentRo: "",
      currentVehicle: "",
      currentOperation: "",
      soldHours: "0",
      elapsedMinutes: "0",
    }));
  }

  function clearNextAssignment() {
    setForm((current) => ({
      ...current,
      nextRo: "",
      nextVehicle: "",
    }));
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Edit Technician</h2>
          <p>Update technician details and assignments</p>
        </div>
      </div>

      <form
        className="technician-edit-form"
        onSubmit={handleSubmit}
      >
        <section className="technician-form-section">
          <div className="technician-form-section-heading">
            <h3>Basic Information</h3>
            <p>Name, status and roster settings</p>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Technician Name</span>

              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  updateField("name", event.target.value)
                }
                required
                disabled={pending}
              />
            </label>

            <label className="form-field">
              <span>Initials</span>

              <input
                type="text"
                value={form.initials}
                onChange={(event) =>
                  updateField(
                    "initials",
                    event.target.value
                      .toUpperCase()
                      .slice(0, 3),
                  )
                }
                maxLength={3}
                disabled={pending}
              />
            </label>

            <label className="form-field">
              <span>Status</span>

              <select
                value={form.status}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target.value as TechnicianStatus,
                  )
                }
                disabled={pending}
              >
                <option value="available">Available</option>
                <option value="working">Working</option>
                <option value="waiting">Waiting</option>
                <option value="off">Off</option>
              </select>
            </label>

            <label className="form-field">
              <span>Display Order</span>

              <input
                type="number"
                min="0"
                step="1"
                value={form.displayOrder}
                onChange={(event) =>
                  updateField(
                    "displayOrder",
                    event.target.value,
                  )
                }
                required
                disabled={pending}
              />
            </label>

            <label className="technician-checkbox-field">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  updateField("active", event.target.checked)
                }
                disabled={pending}
              />

              <span>
                <strong>Active Technician</strong>

                <small>
                  Active technicians appear on dispatch and
                  assignment screens.
                </small>
              </span>
            </label>
          </div>
        </section>

        <section className="technician-form-section">
          <div className="technician-form-section-heading">
            <div>
              <h3>Current Assignment</h3>
              <p>Work currently being performed</p>
            </div>

            <button
              className="technician-clear-button"
              type="button"
              onClick={clearCurrentAssignment}
              disabled={pending}
            >
              Clear Current Assignment
            </button>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Current RO</span>

              <input
                type="text"
                value={form.currentRo}
                onChange={(event) =>
                  updateField("currentRo", event.target.value)
                }
                placeholder="RO 56321"
                disabled={pending}
              />
            </label>

            <label className="form-field">
              <span>Current Vehicle</span>

              <input
                type="text"
                value={form.currentVehicle}
                onChange={(event) =>
                  updateField(
                    "currentVehicle",
                    event.target.value,
                  )
                }
                placeholder="2021 Ford F-150"
                disabled={pending}
              />
            </label>

            <label className="form-field form-field-wide">
              <span>Current Operation</span>

              <input
                type="text"
                value={form.currentOperation}
                onChange={(event) =>
                  updateField(
                    "currentOperation",
                    event.target.value,
                  )
                }
                placeholder="Front brake replacement"
                disabled={pending}
              />
            </label>

            <label className="form-field">
              <span>Sold Hours</span>

              <input
                type="number"
                min="0"
                step="0.1"
                value={form.soldHours}
                onChange={(event) =>
                  updateField(
                    "soldHours",
                    event.target.value,
                  )
                }
                disabled={pending}
              />
            </label>

            <label className="form-field">
              <span>Minutes in Status</span>

              <input
                type="number"
                min="0"
                step="1"
                value={form.elapsedMinutes}
                onChange={(event) =>
                  updateField(
                    "elapsedMinutes",
                    event.target.value,
                  )
                }
                disabled={pending}
              />
            </label>
          </div>
        </section>

        <section className="technician-form-section">
          <div className="technician-form-section-heading">
            <div>
              <h3>Next Assignment</h3>
              <p>Queued work for the technician</p>
            </div>

            <button
              className="technician-clear-button"
              type="button"
              onClick={clearNextAssignment}
              disabled={pending}
            >
              Clear Next Assignment
            </button>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Next RO</span>

              <input
                type="text"
                value={form.nextRo}
                onChange={(event) =>
                  updateField("nextRo", event.target.value)
                }
                placeholder="RO 56346"
                disabled={pending}
              />
            </label>

            <label className="form-field">
              <span>Next Vehicle</span>

              <input
                type="text"
                value={form.nextVehicle}
                onChange={(event) =>
                  updateField(
                    "nextVehicle",
                    event.target.value,
                  )
                }
                placeholder="2020 Honda Accord"
                disabled={pending}
              />
            </label>
          </div>
        </section>

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

        <div className="technician-form-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={pending}
          >
            {pending
              ? "Saving Technician..."
              : "Save Technician Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}