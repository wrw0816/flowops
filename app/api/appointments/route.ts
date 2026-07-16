import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "arrived"
  | "late";

type AppointmentPriority = "urgent" | "high" | "normal";

type CreateAppointmentRequest = {
  customerName?: string;
  vehicle?: string;
  serviceDescription?: string;
  advisorName?: string;
  appointmentAt?: string;
  promisedAt?: string;
  estimatedHours?: string | number;
  priority?: AppointmentPriority;
  status?: AppointmentStatus;
  technicianId?: string;
  notes?: string;
};

const allowedStatuses: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "arrived",
  "late",
];

const allowedPriorities: AppointmentPriority[] = [
  "urgent",
  "high",
  "normal",
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as CreateAppointmentRequest;

    const vehicle = body.vehicle?.trim();
    const serviceDescription =
      body.serviceDescription?.trim();

    const appointmentAt = parseDateTime(body.appointmentAt);
    const promisedAt = parseDateTime(body.promisedAt);

    const estimatedHours = Number(
      body.estimatedHours ?? 0,
    );

    const status =
      body.status && allowedStatuses.includes(body.status)
        ? body.status
        : "scheduled";

    const priority =
      body.priority && allowedPriorities.includes(body.priority)
        ? body.priority
        : "normal";

    if (!vehicle || !serviceDescription || !appointmentAt) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vehicle, service requested and appointment time are required.",
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

    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("id")
      .eq("name", "Alderman Automotive")
      .limit(1)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        {
          success: false,
          message:
            shopError?.message ??
            "The FlowOps shop could not be found.",
        },
        { status: 404 },
      );
    }

    const technicianId =
      optionalText(body.technicianId);

    if (technicianId) {
      const { data: technician, error: technicianError } =
        await supabase
          .from("technicians")
          .select("id")
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
    }

    const { error: insertError } = await supabase
      .from("appointments")
      .insert({
        shop_id: shop.id,
        customer_name: optionalText(body.customerName),
        vehicle,
        service_description: serviceDescription,
        advisor_name: optionalText(body.advisorName),
        appointment_at: appointmentAt,
        promised_at: promisedAt,
        estimated_hours: estimatedHours,
        priority,
        status,
        assigned_technician_id: technicianId,
        notes: optionalText(body.notes),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      const duplicate = insertError.code === "23505";

      return NextResponse.json(
        {
          success: false,
          message: duplicate
            ? "An appointment already exists for that vehicle at that time."
            : insertError.message,
        },
        { status: duplicate ? 409 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "The appointment was created successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected appointment creation error.";

    console.error(
      "FlowOps appointment creation error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}