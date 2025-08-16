import type { ActionFunctionArgs } from "@remix-run/node";
import { adminGraphQL } from "../shopify.server";

export async function action({ request, context }: ActionFunctionArgs) {
	if (request.method === 'OPTIONS') {
		const origin = request.headers.get('Origin') || '*';
		return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
	}
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
	const origin = request.headers.get('Origin') || '*';
	return new Response(JSON.stringify({ components }), { status: 200, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin' } });
}