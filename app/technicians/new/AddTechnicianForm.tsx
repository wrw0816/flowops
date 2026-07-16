"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type TechnicianStatus =
  | "working"
  | "waiting"
  | "available"
  | "off";

type CreateTechnicianResponse = {
  success: boolean;
  message: string;
};

type TechnicianFormState = {
  name: string;
  initials: string;
  status: TechnicianStatus;
  displayOrder: string;
  active: boolean;
};

const initialForm: TechnicianFormState = {
  name: "",
  initials: "",
  status: "available",
  displayOrder: "1",
  active: true,
};

export default function AddTechnicianForm() {
  const router = useRouter();

  const [form, setForm] =
    useState<TechnicianFormState>(initialForm);

  const [pending, setPending] = useState(false);

  const [result, setResult] =
    useState<CreateTechnicianResponse | null>(null);

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
      const response = await fetch("/api/technicians", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data =
        (await response.json()) as CreateTechnicianResponse;

      setResult(data);

      if (!response.ok || !data.success) {
        return;
      }

      setForm(initialForm);

      setTimeout(() => {
        router.push("/technicians");
        router.refresh();
      }, 700);
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The technician could not be created.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="repair-order-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-field">
          <span>Technician Name</span>

          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              updateField("name", event.target.value)
            }
            placeholder="Example: John Smith"
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
                event.target.value.toUpperCase().slice(0, 3),
              )
            }
            placeholder="JS"
            maxLength={3}
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Starting Status</span>

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
              updateField("displayOrder", event.target.value)
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
              Active technicians appear on the dispatch board.
            </small>
          </span>
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
          {pending ? "Adding Technician..." : "Add Technician"}
        </button>
      </div>
    </form>
  );
}