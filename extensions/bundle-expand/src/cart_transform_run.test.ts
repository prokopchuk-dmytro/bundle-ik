import { describe, it, expect } from 'vitest';
import { cartTransformRun } from './cart_transform_run';
import { CartTransformRunResult } from '../generated/api';

describe('cart transform function', () => {
  it('returns no operations when no bundle metafield', () => {
    const result = cartTransformRun({
      cart: {
        lines: [
          {
            id: 'line-1',
            quantity: 1,
            merchandise: { __typename: 'ProductVariant', id: 'var-1' } as any,
          } as any,
        ],
      },
    } as any);
    const expected: CartTransformRunResult = { operations: [] };

    expect(result).toEqual(expected);
  });

  it('expands a bundle into components with quantities', () => {
    const result = cartTransformRun({
      cart: {
        lines: [
          {
            id: 'line-1',
            quantity: 2,
            merchandise: {
              __typename: 'ProductVariant',
              id: 'var-1',
              metafield: { value: JSON.stringify([
                { merchandiseId: 'gid://shopify/ProductVariant/11', quantity: 3 },
                { merchandiseId: 'gid://shopify/ProductVariant/22', quantity: 1, price: 9.99 },
              ]) },
            },
          } as any,
        ],
      },
    } as any);

    expect(result.operations.length).toBe(1);
    const op = (result.operations[0] as any).lineExpand;
    expect(op.cartLineId).toBe('line-1');
    expect(op.expandedCartItems).toEqual([
      {
        merchandiseId: 'gid://shopify/ProductVariant/11',
        quantity: 6,
        attributes: [{ key: 'bundle_parent', value: 'line-1' }],
      },
      {
        merchandiseId: 'gid://shopify/ProductVariant/22',
        quantity: 2,
        attributes: [{ key: 'bundle_parent', value: 'line-1' }],
        price: { adjustment: { fixedPricePerUnit: { amount: '9.99' } } },
      },
    ]);
  });
});