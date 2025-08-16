import type { ActionFunctionArgs } from "@remix-run/node";
import { adminGraphQL, PRODUCT_LOOKUP_TITLES } from "../shopify.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const { shop, accessToken } = await context.shopify.session.get();
  const body = await request.json();
  const { ids } = body as { ids: string[] };
  if (!ids?.length) return new Response(JSON.stringify({}), { status: 200 });
  const resp = await adminGraphQL<any>(shop, accessToken, PRODUCT_LOOKUP_TITLES, { ids });
  const nodes = resp?.data?.nodes || [];
  const map: Record<string, string> = {};
  for (const n of nodes) {
    if (n?.__typename === 'ProductVariant') map[n.id] = `${n.product?.title || ''} - ${n.title || ''}`.trim();
    if (n?.__typename === 'Product') map[n.id] = n.title;
  }
  return new Response(JSON.stringify(map), { status: 200 });
}