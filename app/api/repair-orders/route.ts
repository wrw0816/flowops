import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CreateRepairOrderRequest = {
  roNumber?: string;
  vehicle?: string;
  serviceDescription?: string;
  advisorName?: string;
  priority?: "urgent" | "high" | "normal";
  promisedAt?: string;
  estimatedHours?: string | number;
};

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as CreateRepairOrderRequest;

    const roNumber = body.roNumber?.trim();
    const vehicle = body.vehicle?.trim();
    const serviceDescription =
      body.serviceDescription?.trim();
    const advisorName = body.advisorName?.trim() || null;

    const priority =
      body.priority === "urgent" ||
      body.priority === "high"
        ? body.priority
        : "normal";

    const estimatedHours =
      Number(body.estimatedHours ?? 0);

    if (!roNumber || !vehicle || !serviceDescription) {
      return NextResponse.json(
        {
          success: false,
          message:
            "RO number, vehicle and work requested are required.",
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
            "Estimated labor hours must be a valid positive number.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: shop, error: shopError } =
      await supabase
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

    const promisedAt = body.promisedAt
      ? new Date(body.promisedAt).toISOString()
      : null;

    const { error: insertError } = await supabase
      .from("repair_orders")
      .insert({
        shop_id: shop.id,
        ro_number: roNumber,
        vehicle,
        service_description: serviceDescription,
        advisor_name: advisorName,
        priority,
        status: "waiting_dispatch",
        promised_at: promisedAt,
        estimated_hours: estimatedHours,
        waiting_since: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      const duplicate =
        insertError.code === "23505";

      return NextResponse.json(
        {
          success: false,
          message: duplicate
            ? `RO ${roNumber} already exists.`
            : insertError.message,
        },
        { status: duplicate ? 409 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `RO ${roNumber} was added to the dispatch queue.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected repair-order error.";

    console.error("FlowOps create RO error:", error);

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}