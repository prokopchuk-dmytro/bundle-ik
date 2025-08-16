import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export async function adminGraphQL<T>(shop: string, accessToken: string, query: string, variables?: Record<string, any>) {
  const resp = await fetch(`https://${shop}/admin/api/2025-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await resp.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  const ue = json.data?.productBundleCreate?.userErrors || json.data?.productBundleUpdate?.userErrors;
  if (ue?.length) throw new Error(JSON.stringify(ue));
  return json as T;
}

export const PRODUCT_BUNDLE_CREATE = /* GraphQL */ `
mutation ProductBundleCreate($input: ProductBundleCreateInput!) {
  productBundleCreate(input: $input) {
    product { id title status bundleComponents(first: 50) { edges { node { product { id title } quantity } } } }
    userErrors { field message }
  }
}`;

export const PRODUCT_BUNDLE_UPDATE = /* GraphQL */ `
mutation ProductBundleUpdate($id: ID!, $input: ProductBundleUpdateInput!) {
  productBundleUpdate(id: $id, input: $input) {
    product { id title bundleComponents(first: 50) { edges { node { product { id title } quantity } } } }
    userErrors { field message }
  }
}`;

export const PRODUCT_COMPONENTS_QUERY = /* GraphQL */ `
query ProductComponents($id: ID!) {
  product(id: $id) {
    id
    title
    bundleComponents(first: 100) {
      edges { node { id quantity product { id title } } }
    }
    variants(first: 50) { edges { node { id title sku } } }
  }
}`;

export const PRODUCTS_SEARCH = /* GraphQL */ `
query ProductsSearch($query: String!) {
  products(first: 20, query: $query) {
    edges { node { id title status variants(first: 1) { edges { node { id } } } } }
  }
}`;

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
