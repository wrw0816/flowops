import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveShopId } from "@/lib/shop-context";

type SettingsRequest = {
  name?: string;
  shopCode?: string;
  locationName?: string;
  timezone?: string;
  shopOpenTime?: string;
  shopCloseTime?: string;
  dailyLaborGoal?: string | number;
  dailyLaborSalesGoal?: string | number;
  dailyGrossProfitGoal?: string | number;
  dailyCarCountGoal?: string | number;
  targetElr?: string | number;
  laborGrossProfitPercent?: string | number;
  minimumDispatchMinutes?: string | number;
  approvalAlertMinutes?: string | number;
  idleAlertMinutes?: string | number;
};

function parseNonNegativeNumber(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseWholeNumber(value: unknown) {
  const parsed = parseNonNegativeNumber(value);

  if (parsed === null || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validTime(value: unknown) {
  return (
    typeof value === "string" &&
    /^\d{2}:\d{2}$/.test(value)
  );
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as SettingsRequest;

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Shop name is required.",
        },
        { status: 400 },
      );
    }

    if (
      !validTime(body.shopOpenTime) ||
      !validTime(body.shopCloseTime)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid opening and closing times are required.",
        },
        { status: 400 },
      );
    }

    if (body.shopOpenTime! >= body.shopCloseTime!) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Shop closing time must be later than opening time.",
        },
        { status: 400 },
      );
    }

    const dailyLaborGoal = parseNonNegativeNumber(
      body.dailyLaborGoal,
    );

    const dailyLaborSalesGoal = parseNonNegativeNumber(
      body.dailyLaborSalesGoal,
    );

    const dailyGrossProfitGoal = parseNonNegativeNumber(
      body.dailyGrossProfitGoal,
    );

    const dailyCarCountGoal = parseWholeNumber(
      body.dailyCarCountGoal,
    );

    const targetElr = parseNonNegativeNumber(body.targetElr);

    const laborGrossProfitPercent =
      parseNonNegativeNumber(
        body.laborGrossProfitPercent,
      );

    const minimumDispatchMinutes = parseWholeNumber(
      body.minimumDispatchMinutes,
    );

    const approvalAlertMinutes = parseWholeNumber(
      body.approvalAlertMinutes,
    );

    const idleAlertMinutes = parseWholeNumber(
      body.idleAlertMinutes,
    );

    if (
      dailyLaborGoal === null ||
      dailyLaborSalesGoal === null ||
      dailyGrossProfitGoal === null ||
      dailyCarCountGoal === null ||
      targetElr === null ||
      laborGrossProfitPercent === null ||
      minimumDispatchMinutes === null ||
      approvalAlertMinutes === null ||
      idleAlertMinutes === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "All settings must contain valid non-negative values.",
        },
        { status: 400 },
      );
    }

    if (laborGrossProfitPercent > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Labor gross profit percentage cannot exceed 100%.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const shopId = getActiveShopId();

    const { data: updatedShop, error } = await supabase
      .from("shops")
      .update({
        name,
        shop_code:
          body.shopCode
            ?.trim()
            .toUpperCase()
            .slice(0, 4) || null,
        location_name: optionalText(body.locationName),
        timezone:
          optionalText(body.timezone) ??
          "America/Indiana/Indianapolis",
        shop_open_time: body.shopOpenTime,
        shop_close_time: body.shopCloseTime,
        daily_labor_goal: dailyLaborGoal,
        daily_labor_sales_goal: dailyLaborSalesGoal,
        daily_gross_profit_goal: dailyGrossProfitGoal,
        daily_car_count_goal: dailyCarCountGoal,
        target_elr: targetElr,
        labor_gross_profit_percent:
          laborGrossProfitPercent,
        minimum_dispatch_minutes:
          minimumDispatchMinutes,
        approval_alert_minutes: approvalAlertMinutes,
        idle_alert_minutes: idleAlertMinutes,
      })
      .eq("id", shopId)
      .select(`
        id,
        name,
        shop_code,
        location_name
      `)
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 },
      );
    }

    if (!updatedShop) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No shop record was updated. Verify FLOWOPS_SHOP_ID.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `${updatedShop.name} settings were saved successfully.`,
    });
  } catch (error) {
    console.error("FlowOps settings update error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unexpected shop-settings error.",
      },
      { status: 500 },
    );
  }
}