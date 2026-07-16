"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

type AssignmentResult = {
  success: boolean;
  message: string;
};

export async function assignRepairOrder(
  formData: FormData,
): Promise<AssignmentResult> {
  const repairOrderId = formData.get("repairOrderId");
  const technicianId = formData.get("technicianId");

  if (
    typeof repairOrderId !== "string" ||
    typeof technicianId !== "string" ||
    !repairOrderId ||
    !technicianId
  ) {
    return {
      success: false,
      message: "A repair order and technician are required.",
    };
  }

  const supabase = createAdminClient();

  const { data: repairOrder, error: repairOrderError } = await supabase
    .from("repair_orders")
    .select(`
      id,
      ro_number,
      vehicle,
      service_description,
      estimated_hours
    `)
    .eq("id", repairOrderId)
    .single();

  if (repairOrderError || !repairOrder) {
    return {
      success: false,
      message:
        repairOrderError?.message ?? "The repair order could not be found.",
    };
  }

  const { data: technician, error: technicianError } = await supabase
    .from("technicians")
    .select(`
      id,
      name,
      status,
      current_ro
    `)
    .eq("id", technicianId)
    .single();

  if (technicianError || !technician) {
    return {
      success: false,
      message:
        technicianError?.message ?? "The technician could not be found.",
    };
  }

  const technicianHasCurrentWork = Boolean(technician.current_ro);

  const repairOrderUpdates = {
    assigned_technician_id: technicianId,
    status: technicianHasCurrentWork
      ? "ready_for_technician"
      : "in_progress",
    updated_at: new Date().toISOString(),
  };

  const { error: updateRepairOrderError } = await supabase
    .from("repair_orders")
    .update(repairOrderUpdates)
    .eq("id", repairOrderId);

  if (updateRepairOrderError) {
    return {
      success: false,
      message: updateRepairOrderError.message,
    };
  }

  const technicianUpdates = technicianHasCurrentWork
    ? {
        next_ro: `RO ${repairOrder.ro_number}`,
        next_vehicle: repairOrder.vehicle,
        updated_at: new Date().toISOString(),
      }
    : {
        status: "working",
        current_ro: `RO ${repairOrder.ro_number}`,
        current_vehicle: repairOrder.vehicle,
        current_operation: repairOrder.service_description,
        sold_hours: Number(repairOrder.estimated_hours ?? 0),
        elapsed_minutes: 0,
        next_ro: null,
        next_vehicle: null,
        updated_at: new Date().toISOString(),
      };

  const { error: updateTechnicianError } = await supabase
    .from("technicians")
    .update(technicianUpdates)
    .eq("id", technicianId);

  if (updateTechnicianError) {
    await supabase
      .from("repair_orders")
      .update({
        assigned_technician_id: null,
        status: "waiting_dispatch",
        updated_at: new Date().toISOString(),
      })
      .eq("id", repairOrderId);

    return {
      success: false,
      message: updateTechnicianError.message,
    };
  }

  revalidatePath("/");
  revalidatePath("/dispatch");

  return {
    success: true,
    message: `RO ${repairOrder.ro_number} was assigned to ${technician.name}.`,
  };
}