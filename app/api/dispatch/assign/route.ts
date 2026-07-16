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
    const now = new Date().toISOString();

    const { data: repairOrder, error: repairOrderError } =
      await supabase
        .from("repair_orders")
        .select(`
          id,
          shop_id,
          ro_number,
          vehicle,
          service_description,
          estimated_hours,
          status,
          assigned_technician_id,
          dispatched_at,
          work_started_at
        `)
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

    const { data: technician, error: technicianError } =
      await supabase
        .from("technicians")
        .select(`
          id,
          shop_id,
          name,
          status,
          current_ro,
          current_vehicle,
          current_operation,
          next_ro,
          next_vehicle,
          active
        `)
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

    if (technician.shop_id !== repairOrder.shop_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The technician and repair order do not belong to the same shop.",
        },
        { status: 400 },
      );
    }

    const technicianHasCurrentWork = Boolean(
      technician.current_ro,
    );

    const newRepairOrderStatus = technicianHasCurrentWork
      ? "ready_for_technician"
      : "in_progress";

    const repairOrderUpdates = {
      assigned_technician_id: technician.id,
      status: newRepairOrderStatus,
      dispatched_at: repairOrder.dispatched_at ?? now,
      work_started_at: technicianHasCurrentWork
        ? repairOrder.work_started_at
        : repairOrder.work_started_at ?? now,
      updated_at: now,
    };

    const { data: updatedRepairOrder, error: updateRepairOrderError } =
      await supabase
        .from("repair_orders")
        .update(repairOrderUpdates)
        .eq("id", repairOrder.id)
        .eq("status", "waiting_dispatch")
        .select("id")
        .single();

    if (updateRepairOrderError || !updatedRepairOrder) {
      return NextResponse.json(
        {
          success: false,
          message:
            updateRepairOrderError?.message ??
            "The repair order could not be assigned.",
        },
        { status: 500 },
      );
    }

    const technicianUpdates = technicianHasCurrentWork
      ? {
          next_ro: `RO ${repairOrder.ro_number}`,
          next_vehicle: repairOrder.vehicle,
          updated_at: now,
        }
      : {
          status: "working",
          current_ro: `RO ${repairOrder.ro_number}`,
          current_vehicle: repairOrder.vehicle,
          current_operation: repairOrder.service_description,
          sold_hours: Number(
            repairOrder.estimated_hours ?? 0,
          ),
          elapsed_minutes: 0,
          next_ro: null,
          next_vehicle: null,
          status_changed_at: now,
          updated_at: now,
        };

    const { error: updateTechnicianError } = await supabase
      .from("technicians")
      .update(technicianUpdates)
      .eq("id", technician.id);

    if (updateTechnicianError) {
      await supabase
        .from("repair_orders")
        .update({
          assigned_technician_id:
            repairOrder.assigned_technician_id,
          status: repairOrder.status,
          dispatched_at: repairOrder.dispatched_at,
          work_started_at: repairOrder.work_started_at,
          updated_at: now,
        })
        .eq("id", repairOrder.id);

      return NextResponse.json(
        {
          success: false,
          message: `Technician update failed: ${updateTechnicianError.message}`,
        },
        { status: 500 },
      );
    }

    const eventType = technicianHasCurrentWork
      ? "queued_next"
      : "assigned";

    const { error: eventError } = await supabase
      .from("dispatch_events")
      .insert({
        shop_id: repairOrder.shop_id,
        repair_order_id: repairOrder.id,
        technician_id: technician.id,
        previous_technician_id:
          repairOrder.assigned_technician_id,
        event_type: eventType,
        previous_status: repairOrder.status,
        new_status: newRepairOrderStatus,
        note: technicianHasCurrentWork
          ? `RO ${repairOrder.ro_number} queued as the next assignment for ${technician.name}.`
          : `RO ${repairOrder.ro_number} assigned to ${technician.name} and started.`,
      });

    if (eventError) {
      console.error(
        "FlowOps dispatch event logging error:",
        eventError,
      );
    }

    if (!technicianHasCurrentWork) {
      const { error: startedEventError } = await supabase
        .from("dispatch_events")
        .insert({
          shop_id: repairOrder.shop_id,
          repair_order_id: repairOrder.id,
          technician_id: technician.id,
          previous_technician_id:
            repairOrder.assigned_technician_id,
          event_type: "started",
          previous_status: repairOrder.status,
          new_status: "in_progress",
          note: `RO ${repairOrder.ro_number} work started with ${technician.name}.`,
        });

      if (startedEventError) {
        console.error(
          "FlowOps started event logging error:",
          startedEventError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: technicianHasCurrentWork
        ? `RO ${repairOrder.ro_number} was queued next for ${technician.name}.`
        : `RO ${repairOrder.ro_number} was assigned to ${technician.name}.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected assignment error.";

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