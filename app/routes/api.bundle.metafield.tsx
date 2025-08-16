import type { ActionFunctionArgs } from "@remix-run/node";
import { adminGraphQL } from "../shopify.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const { shop, accessToken } = await context.shopify.session.get();
  const body = await request.json();
  const { productId } = body as { productId: string };

  const query = /* GraphQL */ `
    query GetBundleMf($id: ID!) {
      product(id: $id) { id metafield(namespace: "bundle", key: "components") { value } }
    }
  `;
  const resp = await adminGraphQL<any>(shop, accessToken, query, { id: productId });
  const value = resp?.data?.product?.metafield?.value;
  let components: any[] = [];
  try { components = JSON.parse(value || '[]'); } catch { components = []; }
  return new Response(JSON.stringify({ components }), { status: 200 });
}