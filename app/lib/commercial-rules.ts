export type CommercialRules = {
  freeDeliveryOwnBrands: number;
  freeDeliveryMixed: number;
};

function positiveAmount(value: string | undefined, fallback: number) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : fallback;
}

export function getCommercialRules(): CommercialRules {
  return {
    freeDeliveryOwnBrands: positiveAmount(process.env.DELIVERY_OWN_BRANDS_MINIMUM, 1000),
    freeDeliveryMixed: positiveAmount(process.env.DELIVERY_MIXED_MINIMUM, 1500),
  };
}
