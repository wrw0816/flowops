import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RepairOrderStatus =
  | "scheduled"
  | "checked_in"
  | "waiting_dispatch"
  | "inspection"
  | "waiting_estimate"
  | "waiting_approval"
  | "approved"
  | "waiting_parts"
  | "ready_for_technician"
  | "in_progress"
  | "quality_check"
  | "ready_delivery"
  | "closed";

type DispatchEventType =
  | "assigned"
  | "reassigned"
  | "queued_next"
  | "started"
  | "status_changed"
  | "returned_to_dispatch"
  | "completed"
  | "unassigned";

type UpdateRepairOrderRequest = {
  status?: RepairOrderStatus;
  technicianId?: string | null;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TechnicianRecord = {
  id: string;
  name: string;
  current_ro: string | null;
  current_vehicle: string | null;
  current_operation: string | null;
  next_ro: string | null;
  next_vehicle: string | null;
};

const allowedStatuses: RepairOrderStatus[] = [
  "scheduled",
  "checked_in",
  "waiting_dispatch",
  "inspection",
  "waiting_estimate",
  "waiting_approval",
  "approved",
  "waiting_parts",
  "ready_for_technician",
  "in_progress",
  "quality_check",
  "ready_delivery",
  "closed",
];

function isWaitingStatus(status: RepairOrderStatus) {
  return [
    "waiting_estimate",
    "waiting_approval",
    "waiting_parts",
  ].includes(status);
}

function isPreDispatchStatus(status: RepairOrderStatus) {
  return [
    "scheduled",
    "checked_in",
    "waiting_dispatch",
  ].includes(status);
}

function isCompletedStatus(status: RepairOrderStatus) {
  return ["ready_delivery", "closed"].includes(status);
}

async function logDispatchEvent({
  supabase,
  shopId,
  repairOrderId,
  technicianId,
  previousTechnicianId,
  eventType,
  previousStatus,
  newStatus,
  note,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  shopId: string;
  repairOrderId: string;
  technicianId: string | null;
  previousTechnicianId: string | null;
  eventType: DispatchEventType;
  previousStatus: string | null;
  newStatus: string | null;
  note: string;
}) {
  const { error } = await supabase.from("dispatch_events").insert({
    shop_id: shopId,
    repair_order_id: repairOrderId,
    technician_id: technicianId,
    previous_technician_id: previousTechnicianId,
    event_type: eventType,
    previous_status: previousStatus,
    new_status: newStatus,
    note,
  });

  if (error) {
    console.error("FlowOps dispatch-event logging error:", error);
  }
}

async function clearRepairOrderFromTechnician({
  supabase,
  technicianId,
  roLabel,
  now,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  technicianId: string;
  roLabel: string;
  now: string;
}) {
  const { data } = await supabase
    .from("technicians")
    .select(`
      id,
      name,
      current_ro,
      current_vehicle,
      current_operation,
      next_ro,
      next_vehicle
    `)
    .eq("id", technicianId)
    .single();

  const technician = data as TechnicianRecord | null;

  if (!technician) {
    return;
  }

  if (technician.current_ro === roLabel) {
    if (technician.next_ro) {
      await supabase
        .from("technicians")
        .update({
          status: "working",
          current_ro: technician.next_ro,
          current_vehicle: technician.next_vehicle,
          current_operation: "Queued assignment",
          sold_hours: 0,
          elapsed_minutes: 0,
          next_ro: null,
          next_vehicle: null,
          status_changed_at: now,
          updated_at: now,
        })
        .eq("id", technicianId);
    } else {
      await supabase
        .from("technicians")
        .update({
          status: "available",
          current_ro: null,
          current_vehicle: null,
          current_operation: null,
          sold_hours: 0,
          elapsed_minutes: 0,
          status_changed_at: now,
          updated_at: now,
        })
        .eq("id", technicianId);
    }

    return;
  }

  if (technician.next_ro === roLabel) {
    await supabase
      .from("technicians")
      .update({
        next_ro: null,
        next_vehicle: null,
        updated_at: now,
      })
      .eq("id", technicianId);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const body =
      (await request.json()) as UpdateRepairOrderRequest;

    if (!body.status || !allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Select a valid workflow status.",
        },
        { status: 400 },
      );
    }

    const requestedTechnicianId =
      typeof body.technicianId === "string" &&
      body.technicianId.trim()
        ? body.technicianId.trim()
        : null;

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
          work_started_at,
          completed_at
        `)
        .eq("id", id)
        .single();

    if (repairOrderError || !repairOrder) {
      return NextResponse.json(
        {
          success: false,
          message:
            repairOrderError?.message ??
            "The repair order could not be found.",
        },
        { status: 404 },
      );
    }

    const previousStatus =
      repairOrder.status as RepairOrderStatus;

    const previousTechnicianId =
      repairOrder.assigned_technician_id as string | null;

    const roLabel = `RO ${repairOrder.ro_number}`;

    const removeTechnicianAssignment = isPreDispatchStatus(
      body.status,
    );

    const finalTechnicianId = removeTechnicianAssignment
      ? null
      : requestedTechnicianId;

    if (finalTechnicianId) {
      const { data: selectedTechnician, error: technicianError } =
        await supabase
          .from("technicians")
          .select("id, shop_id, active")
          .eq("id", finalTechnicianId)
          .eq("active", true)
          .single();

      if (technicianError || !selectedTechnician) {
        return NextResponse.json(
          {
            success: false,
            message:
              technicianError?.message ??
              "The assigned technician could not be found.",
          },
          { status: 404 },
        );
      }

      if (selectedTechnician.shop_id !== repairOrder.shop_id) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The technician and repair order belong to different shops.",
          },
          { status: 400 },
        );
      }
    }

    const repairOrderUpdates: Record<string, unknown> = {
      status: body.status,
      assigned_technician_id: finalTechnicianId,
      updated_at: now,
    };

    if (body.status === "waiting_dispatch") {
      repairOrderUpdates.waiting_since = now;
    }

    if (
      finalTechnicianId &&
      !repairOrder.dispatched_at &&
      !isPreDispatchStatus(body.status)
    ) {
      repairOrderUpdates.dispatched_at = now;
    }

    if (
      body.status === "in_progress" &&
      !repairOrder.work_started_at
    ) {
      repairOrderUpdates.work_started_at = now;
    }

    if (
      isCompletedStatus(body.status) &&
      !repairOrder.completed_at
    ) {
      repairOrderUpdates.completed_at = now;
    }

    if (!isCompletedStatus(body.status)) {
      repairOrderUpdates.completed_at = null;
    }

    const { error: updateError } = await supabase
      .from("repair_orders")
      .update(repairOrderUpdates)
      .eq("id", repairOrder.id);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message: updateError.message,
        },
        { status: 500 },
      );
    }

    const technicianChanged =
      previousTechnicianId !== finalTechnicianId;

    if (
      previousTechnicianId &&
      (technicianChanged ||
        removeTechnicianAssignment ||
        isCompletedStatus(body.status))
    ) {
      await clearRepairOrderFromTechnician({
        supabase,
        technicianId: previousTechnicianId,
        roLabel,
        now,
      });
    }

    if (finalTechnicianId) {
      const { data: technicianData, error: technicianError } =
        await supabase
          .from("technicians")
          .select(`
            id,
            name,
            current_ro,
            current_vehicle,
            current_operation,
            next_ro,
            next_vehicle
          `)
          .eq("id", finalTechnicianId)
          .single();

      if (technicianError || !technicianData) {
        return NextResponse.json(
          {
            success: false,
            message:
              technicianError?.message ??
              "The assigned technician could not be loaded.",
          },
          { status: 404 },
        );
      }

      const technician = technicianData as TechnicianRecord;

      if (body.status === "in_progress") {
        await supabase
          .from("technicians")
          .update({
            status: "working",
            current_ro: roLabel,
            current_vehicle: repairOrder.vehicle,
            current_operation:
              repairOrder.service_description,
            sold_hours: Number(
              repairOrder.estimated_hours ?? 0,
            ),
            elapsed_minutes: 0,
            status_changed_at: now,
            updated_at: now,
          })
          .eq("id", finalTechnicianId);
      } else if (isWaitingStatus(body.status)) {
        await supabase
          .from("technicians")
          .update({
            status: "waiting",
            status_changed_at: now,
            updated_at: now,
          })
          .eq("id", finalTechnicianId);
      } else if (
        body.status === "ready_for_technician" &&
        technician.current_ro !== roLabel
      ) {
        await supabase
          .from("technicians")
          .update({
            next_ro: roLabel,
            next_vehicle: repairOrder.vehicle,
            updated_at: now,
          })
          .eq("id", finalTechnicianId);
      } else if (
        body.status === "inspection" ||
        body.status === "approved" ||
        body.status === "quality_check"
      ) {
        await supabase
          .from("technicians")
          .update({
            status: "working",
            status_changed_at: now,
            updated_at: now,
          })
          .eq("id", finalTechnicianId);
      }

      if (isCompletedStatus(body.status)) {
        await clearRepairOrderFromTechnician({
          supabase,
          technicianId: finalTechnicianId,
          roLabel,
          now,
        });
      }
    }

    if (
      previousStatus !== body.status ||
      previousTechnicianId !== finalTechnicianId
    ) {
      let eventType: DispatchEventType = "status_changed";
      let eventNote = `RO ${repairOrder.ro_number} changed from ${previousStatus} to ${body.status}.`;

      if (body.status === "waiting_dispatch") {
        eventType = "returned_to_dispatch";
        eventNote = `RO ${repairOrder.ro_number} was returned to the dispatch queue.`;
      } else if (body.status === "in_progress") {
        eventType = "started";
        eventNote = `RO ${repairOrder.ro_number} was moved into active work.`;
      } else if (isCompletedStatus(body.status)) {
        eventType = "completed";
        eventNote = `RO ${repairOrder.ro_number} was marked ${body.status}.`;
      } else if (
        previousTechnicianId &&
        finalTechnicianId &&
        previousTechnicianId !== finalTechnicianId
      ) {
        eventType = "reassigned";
        eventNote = `RO ${repairOrder.ro_number} was reassigned to another technician.`;
      } else if (
        previousTechnicianId &&
        !finalTechnicianId
      ) {
        eventType = "unassigned";
        eventNote = `RO ${repairOrder.ro_number} was unassigned from its technician.`;
      } else if (
        !previousTechnicianId &&
        finalTechnicianId
      ) {
        eventType = "assigned";
        eventNote = `RO ${repairOrder.ro_number} was assigned through the RO workflow.`;
      }

      await logDispatchEvent({
        supabase,
        shopId: repairOrder.shop_id,
        repairOrderId: repairOrder.id,
        technicianId: finalTechnicianId,
        previousTechnicianId,
        eventType,
        previousStatus,
        newStatus: body.status,
        note: eventNote,
      });
    }

    return NextResponse.json({
      success: true,
      message: `RO ${repairOrder.ro_number} was updated successfully.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected repair-order update error.";

    console.error("FlowOps RO update error:", error);

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}