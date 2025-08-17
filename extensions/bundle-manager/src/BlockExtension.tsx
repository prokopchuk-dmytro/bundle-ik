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
	const { data, admin } = useApi();
	const [components, setComponents] = useState<ComponentRow[]>([]);
	const [availableProducts, setAvailableProducts] = useState<ComponentRow[]>([]);
	const productId = data?.selected?.product?.id;
	const [search, setSearch] = useState("");
	const [loadingComponents, setLoadingComponents] = useState(false);
	const [loadingSearch, setLoadingSearch] = useState(false);

	useEffect(() => {
		(async () => {
			if (!productId || !admin) return;
			setLoadingComponents(true);
			try {
				const res: any = await admin.request(
					`query ProductBundle($id: ID!) {\n  product(id: $id) {\n    id\n    title\n    metafield(namespace: \"bundle\", key: \"components\") { value }\n  }\n}`,
					{ variables: { id: productId } }
				);
				const value = res?.data?.product?.metafield?.value;
				let arr: any[] = [];
				try { arr = JSON.parse(value || '[]'); } catch { arr = []; }

				let titlesMap: Record<string, string> = {};
				if (arr.length) {
					const ids = arr.map((c:any) => c.merchandiseId).filter(Boolean);
					const lookup: any = await admin.request(
						`query Lookup($ids:[ID!]!) { nodes(ids:$ids) { __typename ... on ProductVariant { id title product{ title } } ... on Product { id title } } }`,
						{ variables: { ids } }
					);
					for (const n of lookup?.data?.nodes || []) {
						if (n?.__typename === 'ProductVariant') titlesMap[n.id] = `${n.product?.title || ''} - ${n.title || ''}`.trim();
						if (n?.__typename === 'Product') titlesMap[n.id] = n.title;
					}
				}
				setComponents(arr.map((c:any) => ({ id: c.merchandiseId, title: titlesMap[c.merchandiseId] || c.merchandiseId, quantity: c.quantity || 1 })));
			} finally {
				setLoadingComponents(false);
			}
		})();
	}, [productId, admin]);

	useEffect(() => {
		(async () => {
			if (!admin) return;
			setLoadingSearch(true);
			try {
				const res: any = await admin.request(
					`query Products($q: String) {\n  products(first: 50, query: $q) { edges { node { id title variants(first:1){ edges{ node{ id title } } } } } }\n}`,
					{ variables: { q: search || null } }
				);
				const edges = res?.data?.products?.edges || [];
				const items = edges.map((e:any) => ({ id: e.node?.variants?.edges?.[0]?.node?.id || e.node.id, title: e.node.title }));
				setAvailableProducts(items.filter((p:any) => !components.find(c => c.id === p.id)).slice(0, 10));
			} finally {
				setLoadingSearch(false);
			}
		})();
	}, [components, admin, search]);

	const totalItems = useMemo(() => components.reduce((acc, c) => acc + (c.quantity || 0), 0), [components]);

	const updateQuantity = (id: string, qty: number) => setComponents(prev => prev.map(c => c.id === id ? { ...c, quantity: qty } : c));
	const removeComponent = (id: string) => setComponents(prev => prev.filter(c => c.id !== id));
	const addComponent = (item: ComponentRow) => setComponents(prev => [...prev, { ...item, quantity: 1 }]);
	const clearAll = () => setComponents([]);

	const save = async () => {
		if (!productId || !admin) return;
		const payload = components.map(c => ({ merchandiseId: c.id, quantity: Math.max(1, Number(c.quantity || 1)) }));
		await admin.request(
			`mutation SetMf($ownerId: ID!, $value: String!) {\n  metafieldsSet(metafields:[{ ownerId: $ownerId, namespace: \"bundle\", key: \"components\", type: \"json\", value: $value }]) { metafields { id } userErrors { field message } }\n}`,
			{ variables: { ownerId: productId, value: JSON.stringify(payload) } }
		);
	};

	return (
		<AdminBlock title="Bundle components">
			{/* Header */}
			<InlineStack align="space-between">
				<Text>Total items: {totalItems}</Text>
				<InlineStack>
					<Button kind="secondary" onPress={clearAll} disabled={components.length === 0}>Clear</Button>
					<Button kind="primary" onPress={save}>Save</Button>
				</InlineStack>
			</InlineStack>
			<Divider />

			{/* Search */}
			<Box padding="tight">
				<TextField label="Search products" placeholder="Start typing..." value={search} onChange={(v)=>setSearch(v)} />
			</Box>
			<Divider />

			{/* Components list */}
			<Text>Components</Text>
			<Box padding="tight" maxBlockSize="240px" overflow="auto" borderWidth="025" borderRadius="200">
				{loadingComponents && <Text appearance="subdued">Loading...</Text>}
				{!loadingComponents && components.length === 0 && <Text appearance="subdued">No components yet.</Text>}
				{components.map((c, idx) => (
					<Box key={c.id}>
						<InlineStack align="space-between">
							<Text>{c.title}</Text>
							<InlineStack>
								<TextField label="Qty" type="number" value={String(c.quantity)} onChange={v => updateQuantity(c.id, Number(v))} min={1} />
								<Button kind="secondary" onPress={() => removeComponent(c.id)}>Remove</Button>
							</InlineStack>
						</InlineStack>
						{idx < components.length - 1 && <Divider />}
					</Box>
				))}
			</Box>

			<Divider />
			{/* Search results */}
			<Text>Results</Text>
			<Box padding="tight" maxBlockSize="240px" overflow="auto" borderWidth="025" borderRadius="200">
				{loadingSearch && <Text appearance="subdued">Searching...</Text>}
				{!loadingSearch && availableProducts.length === 0 && <Text appearance="subdued">Nothing found</Text>}
				{availableProducts.map((p, idx) => (
					<Box key={p.id}>
						<InlineStack align="space-between">
							<Text>{p.title}</Text>
							<Button kind="primary" onPress={() => addComponent(p)}>Add</Button>
						</InlineStack>
						{idx < availableProducts.length - 1 && <Divider />}
					</Box>
				))}
			</Box>
		</AdminBlock>
	);
}
