import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
	if (request.method === 'OPTIONS') {
		const origin = request.headers.get('Origin') || '*';
		return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
	}
	return new Response("Method Not Allowed", { status: 405 });
}

export async function action({ request }: ActionFunctionArgs) {
	if (request.method === 'OPTIONS') {
		const origin = request.headers.get('Origin') || '*';
		return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
	}
	const { admin } = await authenticate.admin(request);
	const body = await request.json();
	const { query, variables } = (body || {}) as { query: string; variables?: Record<string, any> };
	if (!query) return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400 });
	const response = await admin.graphql(query, { variables });
	const json = await response.json();
	const origin = request.headers.get('Origin') || '*';
	return new Response(JSON.stringify(json), { status: 200, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin' } });
}