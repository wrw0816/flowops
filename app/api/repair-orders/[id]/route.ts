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

type UpdateRepairOrderRequest = {
  status?: RepairOrderStatus;
  technicianId?: string | null;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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

    const supabase = createAdminClient();

    const { data: repairOrder, error: repairOrderError } =
      await supabase
        .from("repair_orders")
        .select(`
          id,
          ro_number,
          vehicle,
          service_description,
          estimated_hours,
          status,
          assigned_technician_id
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

    const previousTechnicianId =
      repairOrder.assigned_technician_id;

    const newTechnicianId = body.technicianId || null;
    const now = new Date().toISOString();

    const shouldRemoveAssignment =
      body.status === "waiting_dispatch" ||
      body.status === "scheduled" ||
      body.status === "checked_in";

    const finalTechnicianId = shouldRemoveAssignment
      ? null
      : newTechnicianId;

    const { error: updateError } = await supabase
      .from("repair_orders")
      .update({
        status: body.status,
        assigned_technician_id: finalTechnicianId,
        waiting_since:
          body.status === "waiting_dispatch" ? now : undefined,
        updated_at: now,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message: updateError.message,
        },
        { status: 500 },
      );
    }

    if (
      previousTechnicianId &&
      previousTechnicianId !== finalTechnicianId
    ) {
      const { data: previousTechnician } = await supabase
        .from("technicians")
        .select(`
          id,
          current_ro,
          next_ro
        `)
        .eq("id", previousTechnicianId)
        .single();

      if (previousTechnician) {
        const roLabel = `RO ${repairOrder.ro_number}`;

        if (previousTechnician.current_ro === roLabel) {
          await supabase
            .from("technicians")
            .update({
              status: "available",
              current_ro: null,
              current_vehicle: null,
              current_operation: null,
              sold_hours: 0,
              elapsed_minutes: 0,
              updated_at: now,
            })
            .eq("id", previousTechnicianId);
        }

        if (previousTechnician.next_ro === roLabel) {
          await supabase
            .from("technicians")
            .update({
              next_ro: null,
              next_vehicle: null,
              updated_at: now,
            })
            .eq("id", previousTechnicianId);
        }
      }
    }

    if (finalTechnicianId) {
      const { data: technician, error: technicianError } =
        await supabase
          .from("technicians")
          .select(`
            id,
            name,
            current_ro,
            next_ro
          `)
          .eq("id", finalTechnicianId)
          .eq("active", true)
          .single();

      if (technicianError || !technician) {
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

      const roLabel = `RO ${repairOrder.ro_number}`;

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
            updated_at: now,
          })
          .eq("id", finalTechnicianId);
      } else if (
        body.status === "waiting_approval" ||
        body.status === "waiting_parts" ||
        body.status === "waiting_estimate"
      ) {
        await supabase
          .from("technicians")
          .update({
            status: "waiting",
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
      }

      if (
        body.status === "ready_delivery" ||
        body.status === "closed"
      ) {
        const { data: refreshedTechnician } = await supabase
          .from("technicians")
          .select(`
            current_ro,
            next_ro,
            next_vehicle
          `)
          .eq("id", finalTechnicianId)
          .single();

        if (
          refreshedTechnician?.current_ro === roLabel &&
          refreshedTechnician.next_ro
        ) {
          await supabase
            .from("technicians")
            .update({
              status: "working",
              current_ro: refreshedTechnician.next_ro,
              current_vehicle:
                refreshedTechnician.next_vehicle,
              current_operation: "Queued assignment",
              sold_hours: 0,
              elapsed_minutes: 0,
              next_ro: null,
              next_vehicle: null,
              updated_at: now,
            })
            .eq("id", finalTechnicianId);
        } else if (
          refreshedTechnician?.current_ro === roLabel
        ) {
          await supabase
            .from("technicians")
            .update({
              status: "available",
              current_ro: null,
              current_vehicle: null,
              current_operation: null,
              sold_hours: 0,
              elapsed_minutes: 0,
              updated_at: now,
            })
            .eq("id", finalTechnicianId);
        } else if (
          refreshedTechnician?.next_ro === roLabel
        ) {
          await supabase
            .from("technicians")
            .update({
              next_ro: null,
              next_vehicle: null,
              updated_at: now,
            })
            .eq("id", finalTechnicianId);
        }
      }
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