

export const PRODUCT_BUNDLE_CREATE = /* GraphQL */ `
mutation ProductBundleCreate($input: ProductBundleCreateInput!) {
  productBundleCreate(input: $input) {
    product {
      id
      title
      status
      bundleComponents(first: 50) {
        edges { node { product { id title } quantity } }
      }
    }
    userErrors { field message }
  }
}
`;

export const PRODUCT_BUNDLE_UPDATE = /* GraphQL */ `
mutation ProductBundleUpdate($id: ID!, $input: ProductBundleUpdateInput!) {
  productBundleUpdate(id: $id, input: $input) {
    product {
      id
      title
      bundleComponents(first: 50) {
        edges { node { product { id title } quantity } }
      }
    }
    userErrors { field message }
  }
}
`;
