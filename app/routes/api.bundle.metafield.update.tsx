import type { ActionFunctionArgs } from "@remix-run/node";
import { adminGraphQL } from "../shopify.server";

export async function action({ request, context }: ActionFunctionArgs) {
	if (request.method === 'OPTIONS') {
		const origin = request.headers.get('Origin') || '*';
		return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
	}
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
	const origin = request.headers.get('Origin') || '*';
	return new Response(JSON.stringify(resp), { status: 200, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin' } });
}