import type {
  CartTransformRunInput,
  CartTransformRunResult,
  Operation,
  LineExpandOperation,
  ExpandedItem,
} from "../generated/api";

const NO_CHANGES: CartTransformRunResult = {
  operations: [],
};

function parseComponentsFromMetafield(value?: string | null): Array<{ merchandiseId: string; quantity: number; price?: number }> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((c) => ({ merchandiseId: String(c.merchandiseId || c.variantId || c.id), quantity: Number(c.quantity || 1), price: c.price != null ? Number(c.price) : undefined }))
      .filter((c) => c.merchandiseId && c.quantity > 0);
  } catch {
    return [];
  }
}

export function cartTransformRun(input: CartTransformRunInput): CartTransformRunResult {
  const operations: Operation[] = [];

  for (const line of input.cart.lines) {
    const merchandise = line.merchandise as any;

    let componentsMf: string | null | undefined = undefined;

    if (merchandise?.__typename === "ProductVariant") {
      componentsMf = merchandise?.metafield?.value || merchandise?.product?.metafield?.value;
    }

    const components = parseComponentsFromMetafield(componentsMf);
    if (!components.length) continue;

    const expandedCartItems: ExpandedItem[] = components.map((c) => ({
      merchandiseId: c.merchandiseId,
      quantity: c.quantity * line.quantity,
      attributes: [{ key: "bundle_parent", value: line.id }],
      ...(c.price != null
        ? { price: { adjustment: { fixedPricePerUnit: { amount: String(c.price) } } } }
        : {}),
    }));

    const op: LineExpandOperation = {
      cartLineId: line.id,
      expandedCartItems,
    };
    operations.push({ lineExpand: op });
  }

  if (operations.length === 0) return NO_CHANGES;
  return { operations };
};