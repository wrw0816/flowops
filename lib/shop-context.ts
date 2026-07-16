import "server-only";

export function getActiveShopId(): string {
  const shopId = process.env.FLOWOPS_SHOP_ID?.trim();

  if (!shopId) {
    throw new Error(
      "FLOWOPS_SHOP_ID is missing. Add it to .env.local and the Vercel environment variables.",
    );
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(shopId)) {
    throw new Error(
      "FLOWOPS_SHOP_ID is not a valid UUID.",
    );
  }

  return shopId;
}