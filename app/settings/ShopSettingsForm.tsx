"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type SettingsFormState = {
  name: string;
  shopCode: string;
  locationName: string;
  timezone: string;
  shopOpenTime: string;
  shopCloseTime: string;
  dailyLaborGoal: string;
  dailyLaborSalesGoal: string;
  dailyGrossProfitGoal: string;
  dailyCarCountGoal: string;
  targetElr: string;
  laborGrossProfitPercent: string;
  minimumDispatchMinutes: string;
  approvalAlertMinutes: string;
  idleAlertMinutes: string;
};

type ShopSettingsFormProps = {
  initialValues: SettingsFormState;
};

type ApiResponse = {
  success: boolean;
  message: string;
};

export default function ShopSettingsForm({
  initialValues,
}: ShopSettingsFormProps) {
  const router = useRouter();

  const [form, setForm] =
    useState<SettingsFormState>(initialValues);

  const [pending, setPending] = useState(false);
  const [result, setResult] =
    useState<ApiResponse | null>(null);

  function updateField<K extends keyof SettingsFormState>(
    field: K,
    value: SettingsFormState[K],
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
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
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
            : "Shop settings could not be saved.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="settings-form"
      onSubmit={handleSubmit}
    >
      <section className="panel settings-section">
        <div className="panel-heading">
          <div>
            <h2>Shop Identity</h2>
            <p>Name and location displayed throughout FlowOps</p>
          </div>
        </div>

        <div className="settings-grid">
          <label className="form-field">
            <span>Shop Name</span>

            <input
              value={form.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              required
              disabled={pending}
            />
          </label>

          <label className="form-field">
            <span>Shop Code</span>

            <input
              value={form.shopCode}
              onChange={(event) =>
                updateField(
                  "shopCode",
                  event.target.value
                    .toUpperCase()
                    .slice(0, 4),
                )
              }
              maxLength={4}
              disabled={pending}
            />
          </label>

          <label className="form-field">
            <span>Location Name</span>

            <input
              value={form.locationName}
              onChange={(event) =>
                updateField(
                  "locationName",
                  event.target.value,
                )
              }
              disabled={pending}
            />
          </label>

          <label className="form-field">
            <span>Time Zone</span>

            <select
              value={form.timezone}
              onChange={(event) =>
                updateField("timezone", event.target.value)
              }
              disabled={pending}
            >
              <option value="America/Indiana/Indianapolis">
                Eastern — Indiana
              </option>

              <option value="America/New_York">
                Eastern
              </option>

              <option value="America/Chicago">
                Central
              </option>

              <option value="America/Denver">
                Mountain
              </option>

              <option value="America/Los_Angeles">
                Pacific
              </option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel settings-section">
        <div className="panel-heading">
          <div>
            <h2>Operating Hours</h2>
            <p>
              Used for live pace and projected production
              calculations
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <label className="form-field">
            <span>Shop Opens</span>

            <input
              type="time"
              value={form.shopOpenTime}
              onChange={(event) =>
                updateField(
                  "shopOpenTime",
                  event.target.value,
                )
              }
              required
              disabled={pending}
            />
          </label>

          <label className="form-field">
            <span>Shop Closes</span>

            <input
              type="time"
              value={form.shopCloseTime}
              onChange={(event) =>
                updateField(
                  "shopCloseTime",
                  event.target.value,
                )
              }
              required
              disabled={pending}
            />
          </label>
        </div>
      </section>

      <section className="panel settings-section">
        <div className="panel-heading">
          <div>
            <h2>Daily Production Goals</h2>
            <p>
              Targets used by the Production Dashboard and
              Command Center
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <label className="form-field">
            <span>Labor Hours Goal</span>

            <input
              type="number"
              min="0"
              step="0.1"
              value={form.dailyLaborGoal}
              onChange={(event) =>
                updateField(
                  "dailyLaborGoal",
                  event.target.value,
                )
              }
              disabled={pending}
            />
          </label>

          <label className="form-field">
            <span>Labor Sales Goal</span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.dailyLaborSalesGoal}
              onChange={(event) =>
                updateField(
                  "dailyLaborSalesGoal",
                  event.target.value,
                )
              }
              disabled={pending}
            />
          </label>

          <label className="form-field">
            <span>Gross Profit Goal</span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.dailyGrossProfitGoal}
              onChange={(event) =>
                updateField(
                  "dailyGrossProfitGoal",
                  event.target.value,
                )
              }
              disabled={pending}
            />
          </label>

          <label className="form-field">
            <span>Vehicles Delivered Goal</span>

            <input
              type="number"
              min="0"
              step="1"
              value={form.dailyCarCountGoal}
              onChange={(event) =>
                updateField(
                  "dailyCarCountGoal",
                  event.target.value,
                )
              }
              disabled={pending}
            />
          </label>

          <label className="form-field">
            <span>Target ELR</span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.targetElr}
              onChange={(event) =>
                updateField("targetElr", event.target.value)
              }
              disabled={pending}
            />
          </label>

          <label className="form-field">
            <span>Labor GP Percentage</span>

            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.laborGrossProfitPercent}
              onChange={(event) =>
                updateField(
                  "laborGrossProfitPercent",
                  event.target.value,
                )
              }
              disabled={pending}
            />
          </label>
        </div>
      </section>

      <section className="panel settings-section">
        <div className="panel-heading">
          <div>
            <h2>Alert Thresholds</h2>
            <p>
              Control when FlowOps identifies operational
              bottlenecks
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <label className="form-field">
            <span>Dispatch Alert Minutes</span>

            <input
              type="number"
              min="0"
              step="1"
              value={form.minimumDispatchMinutes}
              onChange={(event) =>
                updateField(
                  "minimumDispatchMinutes",
                  event.target.value,
                )
              }
              disabled={pending}
            />
          </label>

          <label className="form-field">
            <span>Approval Alert Minutes</span>

            <input
              type="number"
              min="0"
              step="1"
              value={form.approvalAlertMinutes}
              onChange={(event) =>
                updateField(
                  "approvalAlertMinutes",
                  event.target.value,
                )
              }
              disabled={pending}
            />
          </label>

          <label className="form-field">
            <span>Technician Idle Alert Minutes</span>

            <input
              type="number"
              min="0"
              step="1"
              value={form.idleAlertMinutes}
              onChange={(event) =>
                updateField(
                  "idleAlertMinutes",
                  event.target.value,
                )
              }
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

      <div className="settings-actions">
        <button
          className="primary-button"
          type="submit"
          disabled={pending}
        >
          {pending
            ? "Saving Settings..."
            : "Save Shop Settings"}
        </button>
      </div>
    </form>
  );
}