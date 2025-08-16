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
      const resp = await fetch(`/api/bundle/metafield`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ productId }),
      });
      const json = await resp.json();
      const arr = Array.isArray(json?.components) ? json.components : [];
      // We need titles, fetch via search for now
      const titlesResp = await fetch(`/api/products/lookup`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ ids: arr.map((c:any)=>c.merchandiseId) })
      });
      const titles = await titlesResp.json();
      setComponents(arr.map((c:any) => ({ id: c.merchandiseId, title: titles[c.merchandiseId] || c.merchandiseId, quantity: c.quantity || 1 })));
    })();
  }, [productId]);

  useEffect(() => {
    (async () => {
      const resp = await fetch(`/api/products/search`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ query: '' }),
      });
      const json = await resp.json();
      const items = json?.products || [];
      setAvailableProducts(items.filter((p:any) => !components.find(c => c.id === p.id)));
    })();
  }, [components]);

  const totalItems = useMemo(() => components.reduce((acc, c) => acc + (c.quantity || 0), 0), [components]);

  const updateQuantity = (id: string, qty: number) => setComponents(prev => prev.map(c => c.id === id ? { ...c, quantity: qty } : c));
  const removeComponent = (id: string) => setComponents(prev => prev.filter(c => c.id !== id));
  const addComponent = (item: ComponentRow) => setComponents(prev => [...prev, { ...item, quantity: 1 }]);

  const save = async () => {
    if (!productId) return;
    await fetch(`/api/bundle/metafield/update`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        productId,
        components: components.map(c => ({ merchandiseId: c.id, quantity: Math.max(1, Number(c.quantity || 1)) })),
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
