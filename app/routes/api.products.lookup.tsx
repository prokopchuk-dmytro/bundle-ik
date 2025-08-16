import type { ActionFunctionArgs } from "@remix-run/node";
import { adminGraphQL, PRODUCT_LOOKUP_TITLES } from "../shopify.server";

export async function action({ request, context }: ActionFunctionArgs) {
	if (request.method === 'OPTIONS') {
		const origin = request.headers.get('Origin') || '*';
		return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
	}
	const { shop, accessToken } = await context.shopify.session.get();
	const body = await request.json();
	const { ids } = body as { ids: string[] };
	if (!ids?.length) {
		const origin = request.headers.get('Origin') || '*';
		return new Response(JSON.stringify({}), { status: 200, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin' } });
	}
	const resp = await adminGraphQL<any>(shop, accessToken, PRODUCT_LOOKUP_TITLES, { ids });
	const nodes = resp?.data?.nodes || [];
	const map: Record<string, string> = {};
	for (const n of nodes) {
		if (n?.__typename === 'ProductVariant') map[n.id] = `${n.product?.title || ''} - ${n.title || ''}`.trim();
		if (n?.__typename === 'Product') map[n.id] = n.title;
	}
	const origin = request.headers.get('Origin') || '*';
	return new Response(JSON.stringify(map), { status: 200, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin' } });
}