import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "arrived"
  | "late"
  | "cancelled"
  | "no_show"
  | "converted_to_ro";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateAppointmentRequest = {
  status?: AppointmentStatus;
  technicianId?: string | null;
  appointmentAt?: string;
  promisedAt?: string;
  estimatedHours?: string | number;
  notes?: string;
};

const allowedStatuses: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "arrived",
  "late",
  "cancelled",
  "no_show",
  "converted_to_ro",
];

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDateTime(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const body =
      (await request.json()) as UpdateAppointmentRequest;

    if (!body.status || !allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Select a valid appointment status.",
        },
        { status: 400 },
      );
    }

    const appointmentAt = parseDateTime(body.appointmentAt);
    const promisedAt = parseDateTime(body.promisedAt);
    const estimatedHours = Number(
      body.estimatedHours ?? 0,
    );

    if (!appointmentAt) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid appointment time is required.",
        },
        { status: 400 },
      );
    }

    if (
      Number.isNaN(estimatedHours) ||
      estimatedHours < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Estimated labor hours must be zero or greater.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("appointments")
      .update({
        status: body.status,
        assigned_technician_id:
          optionalText(body.technicianId),
        appointment_at: appointmentAt,
        promised_at: promisedAt,
        estimated_hours: estimatedHours,
        notes: optionalText(body.notes),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment updated successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unexpected appointment update error.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const supabase = createAdminClient();

    const { data: appointment, error: appointmentError } =
      await supabase
        .from("appointments")
        .select(`
          id,
          shop_id,
          customer_name,
          vehicle,
          service_description,
          advisor_name,
          promised_at,
          estimated_hours,
          priority,
          status,
          assigned_technician_id,
          repair_order_id
        `)
        .eq("id", id)
        .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        {
          success: false,
          message:
            appointmentError?.message ??
            "The appointment could not be found.",
        },
        { status: 404 },
      );
    }

    if (appointment.repair_order_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This appointment has already been converted.",
          repairOrderId: appointment.repair_order_id,
        },
        { status: 409 },
      );
    }

    const roNumber = `A${Date.now().toString().slice(-7)}`;

    const { data: repairOrder, error: repairOrderError } =
      await supabase
        .from("repair_orders")
        .insert({
          shop_id: appointment.shop_id,
          ro_number: roNumber,
          vehicle: appointment.vehicle,
          service_description:
            appointment.service_description,
          advisor_name: appointment.advisor_name,
          priority: appointment.priority,
          status: "waiting_dispatch",
          promised_at: appointment.promised_at,
          estimated_hours:
            Number(appointment.estimated_hours ?? 0),
          assigned_technician_id: null,
          waiting_since: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    if (repairOrderError || !repairOrder) {
      return NextResponse.json(
        {
          success: false,
          message:
            repairOrderError?.message ??
            "The repair order could not be created.",
        },
        { status: 500 },
      );
    }

    const { error: updateAppointmentError } = await supabase
      .from("appointments")
      .update({
        status: "converted_to_ro",
        repair_order_id: repairOrder.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateAppointmentError) {
      await supabase
        .from("repair_orders")
        .delete()
        .eq("id", repairOrder.id);

      return NextResponse.json(
        {
          success: false,
          message: updateAppointmentError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Appointment converted to RO ${roNumber}.`,
      repairOrderId: repairOrder.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unexpected appointment conversion error.",
      },
      { status: 500 },
    );
  }
}