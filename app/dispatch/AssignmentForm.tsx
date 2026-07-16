"use client";

import { useActionState } from "react";
import { assignRepairOrder } from "./actions";

type TechnicianOption = {
  id: string;
  name: string;
  status: "working" | "waiting" | "available" | "off";
};

type AssignmentFormProps = {
  repairOrderId: string;
  technicians: TechnicianOption[];
};

type ActionState = {
  success: boolean;
  message: string;
};

const initialState: ActionState = {
  success: false,
  message: "",
};

async function assignmentAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return assignRepairOrder(formData);
}

export default function AssignmentForm({
  repairOrderId,
  technicians,
}: AssignmentFormProps) {
  const [state, formAction, pending] = useActionState(
    assignmentAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <input
        type="hidden"
        name="repairOrderId"
        value={repairOrderId}
      />

      <div className="dispatch-card-actions">
        <select
          name="technicianId"
          defaultValue=""
          required
          disabled={pending}
        >
          <option value="" disabled>
            Select technician
          </option>

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

      {state.message ? (
        <p
          className={
            state.success
              ? "assignment-message success"
              : "assignment-message error"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}