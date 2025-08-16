export * from './cart_transform_run';
import {
  CartLinesExpandFunction,
  CartLine,
} from '@shopify/functions';

export interface BundleComponent {
  id: string;
  quantity: number;
  price?: number;
}

export interface BundleMeta {
  components: BundleComponent[];
  discount: number;
}

// Expand cart lines: розкладає бандл у його складові
const expand: CartLinesExpandFunction = (cart) => {
  const expanded: CartLine[] = [];

  for (const line of cart.lines) {
    const merchandise = line.merchandise as any;

    if (merchandise.bundle) {
      const bundle: BundleMeta = merchandise.bundle;

      const discountMultiplier = 1 - bundle.discount / 100;

      for (const comp of bundle.components) {
        expanded.push({
          merchandiseId: comp.id,
          quantity: comp.quantity * line.quantity,
          attributes: [
            { key: "bundle_parent", value: line.id },
          ],
          cost: {
            amountPerQuantity: (comp.price ?? line.cost.amountPerQuantity) * discountMultiplier,
          },
        });
      }
    } else {
      expanded.push(line);
    }
  }

  return { expandedCartLines: expanded };
};

export default expand;
