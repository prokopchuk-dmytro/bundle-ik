import type { ActionFunctionArgs } from "@remix-run/node";
import { adminGraphQL } from "../shopify.server";
import { PRODUCT_BUNDLE_CREATE } from "../graphql"; // place GQL strings under app/graphql.ts

export async function action({ request, context }: ActionFunctionArgs) {
  const { shop, accessToken } = await context.shopify.session.get();
  const body = await request.json();
  const { title, components } = body as {
    title: string;
    components: Array<{productId: string; quantity: number}>;
  };

  const variables = {
    input: {
      title,
      components: components.map(c => ({ productId: c.productId, quantity: c.quantity })),
    },
  };

  const resp = await adminGraphQL(shop, accessToken, PRODUCT_BUNDLE_CREATE, variables);
  return new Response(JSON.stringify(resp), { status: 200 });
}