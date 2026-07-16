import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      body.initials?.trim().toUpperCase().slice(0, 3) || null;

    const status =
      body.status && allowedStatuses.includes(body.status)
        ? body.status
        : "available";

    const displayOrder = Number(body.displayOrder ?? 0);
    const active = body.active !== false;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Technician name is required.",
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

    const { error: insertError } = await supabase
      .from("technicians")
      .insert({
        shop_id: shop.id,
        name,
        initials,
        status,
        active,
        display_order: displayOrder,
        current_ro: null,
        current_vehicle: null,
        current_operation: null,
        sold_hours: 0,
        elapsed_minutes: 0,
        next_ro: null,
        next_vehicle: null,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      return NextResponse.json(
        {
          success: false,
          message: insertError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `${name} was added to the technician roster.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected technician creation error.";

    console.error("FlowOps technician creation error:", error);

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}