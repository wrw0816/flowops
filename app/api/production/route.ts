import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveShopId } from "@/lib/shop-context";

type ProductionRequest = {
  productionDate?: string;
  laborHoursClosed?: string | number;
  laborSales?: string | number;
  grossProfit?: string | number;
  repairOrdersClosed?: string | number;
  vehiclesDelivered?: string | number;
  inspectionCount?: string | number;
  eligibleInspectionCount?: string | number;
  estimatesPresented?: string | number;
  estimatesApproved?: string | number;
  discounts?: string | number;
  notes?: string;
};

function parseNonNegativeNumber(value: unknown) {
  const parsed = Number(value ?? 0);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
}

function parseWholeNumber(value: unknown) {
  const parsed =
    parseNonNegativeNumber(value);

  if (
    parsed === null ||
    !Number.isInteger(parsed)
  ) {
    return null;
  }

  return parsed;
}

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0
    ? trimmed
    : null;
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as ProductionRequest;

    const productionDate =
      body.productionDate?.trim();

    if (
      !productionDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        productionDate,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A valid production date is required.",
        },
        { status: 400 },
      );
    }

    const laborHoursClosed =
      parseNonNegativeNumber(
        body.laborHoursClosed,
      );

    const laborSales =
      parseNonNegativeNumber(
        body.laborSales,
      );

    const grossProfit =
      parseNonNegativeNumber(
        body.grossProfit,
      );

    const discounts =
      parseNonNegativeNumber(
        body.discounts,
      );

    const repairOrdersClosed =
      parseWholeNumber(
        body.repairOrdersClosed,
      );

    const vehiclesDelivered =
      parseWholeNumber(
        body.vehiclesDelivered,
      );

    const inspectionCount =
      parseWholeNumber(
        body.inspectionCount,
      );

    const eligibleInspectionCount =
      parseWholeNumber(
        body.eligibleInspectionCount,
      );

    const estimatesPresented =
      parseWholeNumber(
        body.estimatesPresented,
      );

    const estimatesApproved =
      parseWholeNumber(
        body.estimatesApproved,
      );

    if (
      laborHoursClosed === null ||
      laborSales === null ||
      grossProfit === null ||
      discounts === null ||
      repairOrdersClosed === null ||
      vehiclesDelivered === null ||
      inspectionCount === null ||
      eligibleInspectionCount === null ||
      estimatesPresented === null ||
      estimatesApproved === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "All production values must be valid non-negative numbers.",
        },
        { status: 400 },
      );
    }

    if (
      inspectionCount >
      eligibleInspectionCount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Inspections completed cannot exceed eligible inspections.",
        },
        { status: 400 },
      );
    }

    if (
      estimatesApproved >
      estimatesPresented
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Estimates approved cannot exceed estimates presented.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const shopId = getActiveShopId();
    const now = new Date().toISOString();

    const { data: savedProduction, error } =
      await supabase
        .from("daily_production")
        .upsert(
          {
            shop_id: shopId,
            production_date: productionDate,
            labor_hours_closed:
              laborHoursClosed,
            labor_sales: laborSales,
            gross_profit: grossProfit,
            repair_orders_closed:
              repairOrdersClosed,
            vehicles_delivered:
              vehiclesDelivered,
            inspection_count:
              inspectionCount,
            eligible_inspection_count:
              eligibleInspectionCount,
            estimates_presented:
              estimatesPresented,
            estimates_approved:
              estimatesApproved,
            discounts,
            notes: optionalText(body.notes),
            updated_at: now,
          },
          {
            onConflict:
              "shop_id,production_date",
          },
        )
        .select(
          "id, production_date, updated_at",
        )
        .single();

    if (error || !savedProduction) {
      return NextResponse.json(
        {
          success: false,
          message:
            error?.message ??
            "The production record could not be saved.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Daily production results were saved.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected production update error.";

    console.error(
      "FlowOps production update error:",
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