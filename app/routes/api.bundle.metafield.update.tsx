import type { ActionFunctionArgs } from "@remix-run/node";
import { adminGraphQL } from "../shopify.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const { shop, accessToken } = await context.shopify.session.get();
  const body = await request.json();
  const { productId, components } = body as {
    productId: string;
    components: Array<{ merchandiseId: string; quantity: number; price?: number }>;
  };

  const value = JSON.stringify(components || []);
  const query = /* GraphQL */ `
    mutation UpsertMetafield($ownerId: ID!, $namespace: String!, $key: String!, $value: String!) {
      metafieldsSet(metafields: [{ ownerId: $ownerId, namespace: $namespace, key: $key, type: "json", value: $value }]) {
        metafields { id key namespace value }
        userErrors { field message }
      }
    }
  `;
  const variables = { ownerId: productId, namespace: "bundle", key: "components", value };
  const resp = await adminGraphQL(shop, accessToken, query, variables);
  return new Response(JSON.stringify(resp), { status: 200 });
}