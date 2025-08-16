import type { ActionFunctionArgs } from "@remix-run/node";
import { adminGraphQL, PRODUCTS_SIMPLE_SEARCH } from "../shopify.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const { shop, accessToken } = await context.shopify.session.get();
  const body = await request.json();
  const { query } = body as { query: string };
  const resp = await adminGraphQL<any>(shop, accessToken, PRODUCTS_SIMPLE_SEARCH, { query: query || '' });
  const edges = resp?.data?.products?.edges || [];
  const products = edges.map((e: any) => ({ id: (e.node?.variants?.edges?.[0]?.node?.id) || e.node.id, title: e.node.title }));
  return new Response(JSON.stringify({ products }), { status: 200 });
}