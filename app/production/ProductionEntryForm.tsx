"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ProductionFormState = {
  laborHoursClosed: string;
  laborSales: string;
  grossProfit: string;
  repairOrdersClosed: string;
  vehiclesDelivered: string;
  inspectionCount: string;
  eligibleInspectionCount: string;
  estimatesPresented: string;
  estimatesApproved: string;
  discounts: string;
  notes: string;
};

type ProductionEntryFormProps = {
  productionDate: string;
  initialValues: ProductionFormState;
};

type ApiResponse = {
  success: boolean;
  message: string;
};

export default function ProductionEntryForm({
  productionDate,
  initialValues,
}: ProductionEntryFormProps) {
  const router = useRouter();

  const [form, setForm] =
    useState<ProductionFormState>(initialValues);

  const [pending, setPending] = useState(false);
  const [result, setResult] =
    useState<ApiResponse | null>(null);

  function updateField<K extends keyof ProductionFormState>(
    field: K,
    value: ProductionFormState[K],
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
      const response = await fetch("/api/production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productionDate,
          ...form,
        }),
      });

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
            : "Production results could not be saved.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="production-entry-form"
      onSubmit={handleSubmit}
    >
      <div className="production-entry-grid">
        <label className="form-field">
          <span>Labor Hours Closed</span>

          <input
            type="number"
            min="0"
            step="0.1"
            value={form.laborHoursClosed}
            onChange={(event) =>
              updateField(
                "laborHoursClosed",
                event.target.value,
              )
            }
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Labor Sales</span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.laborSales}
            onChange={(event) =>
              updateField("laborSales", event.target.value)
            }
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Gross Profit</span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.grossProfit}
            onChange={(event) =>
              updateField("grossProfit", event.target.value)
            }
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Discounts</span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.discounts}
            onChange={(event) =>
              updateField("discounts", event.target.value)
            }
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>ROs Closed</span>

          <input
            type="number"
            min="0"
            step="1"
            value={form.repairOrdersClosed}
            onChange={(event) =>
              updateField(
                "repairOrdersClosed",
                event.target.value,
              )
            }
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Vehicles Delivered</span>

          <input
            type="number"
            min="0"
            step="1"
            value={form.vehiclesDelivered}
            onChange={(event) =>
              updateField(
                "vehiclesDelivered",
                event.target.value,
              )
            }
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Inspections Completed</span>

          <input
            type="number"
            min="0"
            step="1"
            value={form.inspectionCount}
            onChange={(event) =>
              updateField(
                "inspectionCount",
                event.target.value,
              )
            }
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Inspection-Eligible ROs</span>

          <input
            type="number"
            min="0"
            step="1"
            value={form.eligibleInspectionCount}
            onChange={(event) =>
              updateField(
                "eligibleInspectionCount",
                event.target.value,
              )
            }
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Estimates Presented</span>

          <input
            type="number"
            min="0"
            step="1"
            value={form.estimatesPresented}
            onChange={(event) =>
              updateField(
                "estimatesPresented",
                event.target.value,
              )
            }
            disabled={pending}
          />
        </label>

        <label className="form-field">
          <span>Estimates Approved</span>

          <input
            type="number"
            min="0"
            step="1"
            value={form.estimatesApproved}
            onChange={(event) =>
              updateField(
                "estimatesApproved",
                event.target.value,
              )
            }
            disabled={pending}
          />
        </label>

        <label className="form-field production-notes-field">
          <span>Daily Notes</span>

          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) =>
              updateField("notes", event.target.value)
            }
            placeholder="Production blockers, staffing issues, recovery actions, etc."
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

      <div className="production-entry-actions">
        <button
          className="primary-button"
          type="submit"
          disabled={pending}
        >
          {pending
            ? "Saving Production..."
            : "Save Production Results"}
        </button>
      </div>
    </form>
  );
}