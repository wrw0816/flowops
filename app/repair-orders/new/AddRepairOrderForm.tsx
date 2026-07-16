"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CreateRepairOrderResponse = {
  success: boolean;
  message: string;
};

const initialForm = {
  roNumber: "",
  vehicle: "",
  serviceDescription: "",
  advisorName: "",
  priority: "normal",
  promisedAt: "",
  estimatedHours: "1.0",
};

export default function AddRepairOrderForm() {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [pending, setPending] = useState(false);
  const [result, setResult] =
    useState<CreateRepairOrderResponse | null>(null);

  function updateField(
    field: keyof typeof initialForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPending(true);
    setResult(null);

    try {
      const response = await fetch("/api/repair-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data =
        (await response.json()) as CreateRepairOrderResponse;

      setResult(data);

      if (!response.ok || !data.success) {
        return;
      }

      setForm(initialForm);

      setTimeout(() => {
        router.push("/dispatch");
        router.refresh();
      }, 700);
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The repair order could not be created.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="repair-order-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-field">
          <span>RO Number</span>

          <input
            type="text"
            value={form.roNumber}
            onChange={(event) =>
              updateField("roNumber", event.target.value)
            }
            placeholder="Example: 56351"
            required
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
          <span>Work Requested</span>

          <textarea
            value={form.serviceDescription}
            onChange={(event) =>
              updateField(
                "serviceDescription",
                event.target.value,
              )
            }
            placeholder="Brake inspection, oil change, diagnostic, etc."
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
          <span>Priority</span>

          <select
            value={form.priority}
            onChange={(event) =>
              updateField("priority", event.target.value)
            }
            disabled={pending}
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>

        <label className="form-field">
          <span>Promised Time</span>

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
              updateField("estimatedHours", event.target.value)
            }
            required
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
          {pending ? "Creating RO..." : "Create Repair Order"}
        </button>
      </div>
    </form>
  );
}