import type { ActionFunctionArgs } from "@remix-run/node";
import { adminGraphQL } from "../shopify.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const { shop, accessToken } = await context.shopify.session.get();
  const body = await request.json();
  const { title, components } = body as {
    title: string;
    components: Array<{ merchandiseId: string; quantity: number; price?: number }>;
  };

  const createQuery = /* GraphQL */ `
    mutation CreateProduct($title: String!) {
      productCreate(input: { title: $title, status: DRAFT }) { product { id title } userErrors { field message } }
    }
  `;
  const createResp = await adminGraphQL<{ data: { productCreate: { product: { id: string } } } }>(shop, accessToken, createQuery, { title });
  const newId = (createResp as any)?.data?.productCreate?.product?.id;

  const value = JSON.stringify(components);
  const mfQuery = /* GraphQL */ `
    mutation UpsertMetafield($ownerId: ID!, $namespace: String!, $key: String!, $value: String!) {
      metafieldsSet(metafields: [{ ownerId: $ownerId, namespace: $namespace, key: $key, type: "json", value: $value }]) {
        metafields { id key namespace value }
        userErrors { field message }
      }
    }
  `;
  const mfResp = await adminGraphQL(shop, accessToken, mfQuery, { ownerId: newId, namespace: "bundle", key: "components", value });
  return new Response(JSON.stringify({ productId: newId, metafield: mfResp }), { status: 200 });
}