import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type TechnicianStatus = "working" | "waiting" | "available" | "off";

type UpdateTechnicianRequest = {
  name?: string;
  initials?: string;
  status?: TechnicianStatus;
  active?: boolean;
  displayOrder?: string | number;
  currentRo?: string;
  currentVehicle?: string;
  currentOperation?: string;
  soldHours?: string | number;
  elapsedMinutes?: string | number;
  nextRo?: string;
  nextVehicle?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const allowedStatuses: TechnicianStatus[] = [
  "working",
  "waiting",
  "available",
  "off",
];

function nullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const body =
      (await request.json()) as UpdateTechnicianRequest;

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Technician name is required.",
        },
        { status: 400 },
      );
    }

    const status =
      body.status && allowedStatuses.includes(body.status)
        ? body.status
        : "available";

    const displayOrder = Number(body.displayOrder ?? 0);
    const soldHours = Number(body.soldHours ?? 0);
    const elapsedMinutes = Number(body.elapsedMinutes ?? 0);

    if (
      !Number.isInteger(displayOrder) ||
      displayOrder < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Display order must be a valid whole number.",
        },
        { status: 400 },
      );
    }

    if (Number.isNaN(soldHours) || soldHours < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Sold hours must be zero or greater.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(elapsedMinutes) ||
      elapsedMinutes < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Minutes in status must be a valid whole number.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: existingTechnician, error: findError } =
      await supabase
        .from("technicians")
        .select("id, name")
        .eq("id", id)
        .single();

    if (findError || !existingTechnician) {
      return NextResponse.json(
        {
          success: false,
          message:
            findError?.message ??
            "The technician could not be found.",
        },
        { status: 404 },
      );
    }

    const currentRo = nullableText(body.currentRo);
    const currentVehicle = nullableText(body.currentVehicle);
    const currentOperation = nullableText(
      body.currentOperation,
    );

    const nextRo = nullableText(body.nextRo);
    const nextVehicle = nullableText(body.nextVehicle);

    let finalStatus = status;

    if (body.active === false) {
      finalStatus = "off";
    } else if (!currentRo && status === "working") {
      finalStatus = "available";
    }

    const { error: updateError } = await supabase
      .from("technicians")
      .update({
        name,
        initials:
          body.initials?.trim().toUpperCase().slice(0, 3) ||
          null,
        status: finalStatus,
        active: body.active !== false,
        display_order: displayOrder,
        current_ro: currentRo,
        current_vehicle: currentVehicle,
        current_operation: currentOperation,
        sold_hours: currentRo ? soldHours : 0,
        elapsed_minutes: currentRo
          ? elapsedMinutes
          : finalStatus === "available"
            ? elapsedMinutes
            : 0,
        next_ro: nextRo,
        next_vehicle: nextVehicle,
        updated_at: new Date().toISOString(),
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

    return NextResponse.json({
      success: true,
      message: `${name} was updated successfully.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected technician update error.";

    console.error("FlowOps technician update error:", error);

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}