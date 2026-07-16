import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveShopId } from "@/lib/shop-context";

type TechnicianStatus =
  | "working"
  | "waiting"
  | "available"
  | "off";

type CreateTechnicianRequest = {
  name?: string;
  initials?: string;
  status?: TechnicianStatus;
  displayOrder?: string | number;
  active?: boolean;
};

const allowedStatuses: TechnicianStatus[] = [
  "working",
  "waiting",
  "available",
  "off",
];

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as CreateTechnicianRequest;

    const name = body.name?.trim();

    const initials =
      body.initials
        ?.trim()
        .toUpperCase()
        .slice(0, 3) || null;

    const status =
      body.status &&
      allowedStatuses.includes(body.status)
        ? body.status
        : "available";

    const displayOrder = Number(
      body.displayOrder ?? 0,
    );

    const active = body.active !== false;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Technician name is required.",
        },
        { status: 400 },
      );
    }

    if (
      Number.isNaN(displayOrder) ||
      displayOrder < 0 ||
      !Number.isInteger(displayOrder)
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

    const supabase = createAdminClient();
    const shopId = getActiveShopId();
    const now = new Date().toISOString();

    const finalStatus = active
      ? status
      : "off";

    const { data: technician, error: insertError } =
      await supabase
        .from("technicians")
        .insert({
          shop_id: shopId,
          name,
          initials,
          status: finalStatus,
          active,
          display_order: displayOrder,
          current_ro: null,
          current_vehicle: null,
          current_operation: null,
          sold_hours: 0,
          elapsed_minutes: 0,
          next_ro: null,
          next_vehicle: null,
          status_changed_at: now,
          updated_at: now,
        })
        .select("id, name")
        .single();

    if (insertError || !technician) {
      return NextResponse.json(
        {
          success: false,
          message:
            insertError?.message ??
            "The technician could not be created.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `${technician.name} was added to the technician roster.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected technician creation error.";

    console.error(
      "FlowOps technician creation error:",
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