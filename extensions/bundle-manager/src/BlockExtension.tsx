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

  useEffect(() => {
    (async () => {
      if (!productId) return;
      // Fetch existing bundle components
      const resp = await fetch(`/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query($id: ID!) {
            product(id:$id) {
              id
              title
              bundleComponents(first:100) {
                edges { node { quantity product { id title } } }
              }
            }
          }`,
          variables: { id: productId },
        }),
      });
      const json = await resp.json();
      const edges = json?.data?.product?.bundleComponents?.edges || [];
      setComponents(edges.map((e: any) => ({ id: e.node.product.id, title: e.node.product.title, quantity: e.node.quantity ?? 1 })));
    })();
  }, [productId]);

  useEffect(() => {
    (async () => {
      // Fetch available products for selection (excluding already added)
      const resp = await fetch(`/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { products(first:50) { edges { node { id title } } } }`,
        }),
      });
      const json = await resp.json();
      const items = json?.data?.products?.edges?.map((e: any) => ({ id: e.node.id, title: e.node.title })) || [];
      setAvailableProducts(items.filter(p => !components.find(c => c.id === p.id)));
    })();
  }, [components]);

  const totalItems = useMemo(() => components.reduce((acc, c) => acc + (c.quantity || 0), 0), [components]);

  const updateQuantity = (id: string, qty: number) => setComponents(prev => prev.map(c => c.id === id ? { ...c, quantity: qty } : c));
  const removeComponent = (id: string) => setComponents(prev => prev.filter(c => c.id !== id));
  const addComponent = (item: ComponentRow) => setComponents(prev => [...prev, { ...item, quantity: 1 }]);

  const save = async () => {
    if (!productId) return;
    await fetch(`/api.bundle.update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        components: components.map(c => ({ productId: c.id, quantity: Math.max(1, Number(c.quantity || 1)) })),
      }),
    });
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
