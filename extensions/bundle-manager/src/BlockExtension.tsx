import {
	reactExtension,
	AdminBlock,
	Button,
	Box,
	InlineStack,
	Text,
	TextField,
	Divider,
	useApi,
} from "@shopify/ui-extensions-react/admin";
import { useEffect, useMemo, useState } from "react";

interface ComponentRow { id: string; title: string; quantity: number }

export default reactExtension("admin.product-details.block.render", () => <BundleManager />);

function BundleManager() {
	const { data: api } = useApi();
	const [components, setComponents] = useState<ComponentRow[]>([]);
	const [availableProducts, setAvailableProducts] = useState<ComponentRow[]>([]);
	const productId = api?.data?.selected?.product?.id;

	// Read bundle components metafield directly via Admin GraphQL
	useEffect(() => {
		(async () => {
			if (!productId || !api?.admin) return;
			const res: any = await api.admin.request(
				`query ProductBundle($id: ID!) {\n  product(id: $id) {\n    id\n    title\n    metafield(namespace: \"bundle\", key: \"components\") { value }\n  }\n}`,
				{ variables: { id: productId } }
			);
			const value = res?.data?.product?.metafield?.value;
			let arr: any[] = [];
			try { arr = JSON.parse(value || '[]'); } catch { arr = []; }

			// Try resolve titles of existing components
			let titlesMap: Record<string, string> = {};
			if (arr.length) {
				const ids = arr.map((c:any) => c.merchandiseId).filter(Boolean);
				const lookup: any = await api.admin.request(
					`query Lookup($ids:[ID!]!) { nodes(ids:$ids) { __typename ... on ProductVariant { id title product{ title } } ... on Product { id title } } }`,
					{ variables: { ids } }
				);
				for (const n of lookup?.data?.nodes || []) {
					if (n?.__typename === 'ProductVariant') titlesMap[n.id] = `${n.product?.title || ''} - ${n.title || ''}`.trim();
					if (n?.__typename === 'Product') titlesMap[n.id] = n.title;
				}
			}
			setComponents(arr.map((c:any) => ({ id: c.merchandiseId, title: titlesMap[c.merchandiseId] || c.merchandiseId, quantity: c.quantity || 1 })));
		})();
	}, [productId, api?.admin]);

	// Load available products (first 50, use first variant ID)
	useEffect(() => {
		(async () => {
			if (!api?.admin) return;
			const res: any = await api.admin.request(
				`query Products {\n  products(first: 50) { edges { node { id title variants(first:1){ edges{ node{ id title } } } } } }\n}`
			);
			const edges = res?.data?.products?.edges || [];
			const items = edges.map((e:any) => ({ id: e.node?.variants?.edges?.[0]?.node?.id || e.node.id, title: e.node.title }));
			setAvailableProducts(items.filter((p:any) => !components.find(c => c.id === p.id)));
		})();
	}, [components, api?.admin]);

	const totalItems = useMemo(() => components.reduce((acc, c) => acc + (c.quantity || 0), 0), [components]);

	const updateQuantity = (id: string, qty: number) => setComponents(prev => prev.map(c => c.id === id ? { ...c, quantity: qty } : c));
	const removeComponent = (id: string) => setComponents(prev => prev.filter(c => c.id !== id));
	const addComponent = (item: ComponentRow) => setComponents(prev => [...prev, { ...item, quantity: 1 }]);

	const save = async () => {
		if (!productId || !api?.admin) return;
		const payload = components.map(c => ({ merchandiseId: c.id, quantity: Math.max(1, Number(c.quantity || 1)) }));
		await api.admin.request(
			`mutation SetMf($ownerId: ID!, $value: String!) {\n  metafieldsSet(metafields:[{ ownerId: $ownerId, namespace: \"bundle\", key: \"components\", type: \"json\", value: $value }]) { metafields { id } userErrors { field message } }\n}`,
			{ variables: { ownerId: productId, value: JSON.stringify(payload) } }
		);
	};

	return (
		<AdminBlock title="Bundle components">
			<InlineStack align="space-between">
				<Text>Total items in bundle: {totalItems}</Text>
			</InlineStack>
			<Divider />

			<Box padding="tight">
				{components.length === 0 && <Text appearance="subdued">No components yet.</Text>}
				{components.map(c => (
					<InlineStack key={c.id} align="space-between">
						<Text>{c.title}</Text>
						<InlineStack>
							<TextField
								label="Qty"
								type="number"
								value={String(c.quantity)}
								onChange={v => updateQuantity(c.id, Number(v))}
								min={1}
							/>
							<Button kind="secondary" onPress={() => removeComponent(c.id)}>Remove</Button>
						</InlineStack>
					</InlineStack>
				))}
			</Box>

			<Divider />
			<Text>Add more products:</Text>
			<Box padding="tight">
				{availableProducts.map(p => (
					<InlineStack key={p.id} align="space-between">
						<Text>{p.title}</Text>
						<Button kind="primary" onPress={() => addComponent(p)}>Add</Button>
					</InlineStack>
				))}
			</Box>

			<Divider />
			<InlineStack>
				<Button kind="primary" onPress={save}>Save components</Button>
			</InlineStack>
		</AdminBlock>
	);
}
