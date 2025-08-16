import type { ActionFunctionArgs } from "@remix-run/node";
import { adminGraphQL } from "../shopify.server";
import { PRODUCT_BUNDLE_UPDATE } from "../graphql";

export async function action({ request, context }: ActionFunctionArgs) {
  const { shop, accessToken } = await context.shopify.session.get();
  const body = await request.json();
  const { productId, components } = body as {
    productId: string;
    components: Array<{productId: string; quantity: number}>;
  };

  const variables = {
    id: productId,
    input: { components: components.map(c => ({ productId: c.productId, quantity: c.quantity })) },
  };

  const resp = await adminGraphQL(shop, accessToken, PRODUCT_BUNDLE_UPDATE, variables);
  return new Response(JSON.stringify(resp), { status: 200 });
}