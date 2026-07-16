"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type TechnicianOption = {
  id: string;
  name: string;
  status: "working" | "waiting" | "available" | "off";
};

type AssignmentFormProps = {
  repairOrderId: string;
  technicians: TechnicianOption[];
};

type AssignmentResponse = {
  success: boolean;
  message: string;
};

export default function AssignmentForm({
  repairOrderId,
  technicians,
}: AssignmentFormProps) {
  const router = useRouter();

  const [technicianId, setTechnicianId] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AssignmentResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!technicianId) {
      setResult({
        success: false,
        message: "Select a technician before assigning the RO.",
      });
      return;
    }

    setPending(true);
    setResult(null);

    try {
      const response = await fetch("/api/dispatch/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repairOrderId,
          technicianId,
        }),
      });

      const data = (await response.json()) as AssignmentResponse;

      setResult(data);

      if (!response.ok || !data.success) {
        return;
      }

      setTechnicianId("");
      router.refresh();
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "The assignment request failed.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="dispatch-card-actions">
        <select
          value={technicianId}
          onChange={(event) => setTechnicianId(event.target.value)}
          disabled={pending}
          aria-label="Select technician"
        >
          <option value="">Select technician</option>

          {technicians
            .filter((technician) => technician.status !== "off")
            .map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
        </select>

        <button
          className="dispatch-assign-button"
          type="submit"
          disabled={pending}
        >
          {pending ? "Assigning..." : "Assign RO"}
        </button>
      </div>

      {result ? (
        <p
          className={
            result.success
              ? "assignment-message success"
              : "assignment-message error"
          }
        >
          {result.message}
        </p>
      ) : null}
    </form>
  );
}