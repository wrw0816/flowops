import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AssignmentRequest = {
  repairOrderId?: string;
  technicianId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AssignmentRequest;

    const repairOrderId = body.repairOrderId?.trim();
    const technicianId = body.technicianId?.trim();

    if (!repairOrderId || !technicianId) {
      return NextResponse.json(
        {
          success: false,
          message: "Select a technician before assigning the RO.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: repairOrder, error: repairOrderError } = await supabase
      .from("repair_orders")
      .select(
        `
          id,
          ro_number,
          vehicle,
          service_description,
          estimated_hours,
          status
        `,
      )
      .eq("id", repairOrderId)
      .single();

    if (repairOrderError || !repairOrder) {
      return NextResponse.json(
        {
          success: false,
          message:
            repairOrderError?.message ??
            "The selected repair order could not be found.",
        },
        { status: 404 },
      );
    }

    if (repairOrder.status !== "waiting_dispatch") {
      return NextResponse.json(
        {
          success: false,
          message: `RO ${repairOrder.ro_number} is no longer waiting for dispatch.`,
        },
        { status: 409 },
      );
    }

    const { data: technician, error: technicianError } = await supabase
      .from("technicians")
      .select(
        `
          id,
          name,
          status,
          current_ro
        `,
      )
      .eq("id", technicianId)
      .eq("active", true)
      .single();

    if (technicianError || !technician) {
      return NextResponse.json(
        {
          success: false,
          message:
            technicianError?.message ??
            "The selected technician could not be found.",
        },
        { status: 404 },
      );
    }

    const hasCurrentAssignment = Boolean(technician.current_ro);

    const repairOrderStatus = hasCurrentAssignment
      ? "ready_for_technician"
      : "in_progress";

    const { error: repairOrderUpdateError } = await supabase
      .from("repair_orders")
      .update({
        assigned_technician_id: technician.id,
        status: repairOrderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", repairOrder.id)
      .eq("status", "waiting_dispatch");

    if (repairOrderUpdateError) {
      return NextResponse.json(
        {
          success: false,
          message: `RO update failed: ${repairOrderUpdateError.message}`,
        },
        { status: 500 },
      );
    }

    const technicianUpdates = hasCurrentAssignment
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

    const { error: technicianUpdateError } = await supabase
      .from("technicians")
      .update(technicianUpdates)
      .eq("id", technician.id);

    if (technicianUpdateError) {
      await supabase
        .from("repair_orders")
        .update({
          assigned_technician_id: null,
          status: "waiting_dispatch",
          updated_at: new Date().toISOString(),
        })
        .eq("id", repairOrder.id);

      return NextResponse.json(
        {
          success: false,
          message: `Technician update failed: ${technicianUpdateError.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `RO ${repairOrder.ro_number} assigned to ${technician.name}.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected assignment error.";

    console.error("FlowOps assignment error:", error);

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}