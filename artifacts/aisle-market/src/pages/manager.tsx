import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { Show, useUser, useClerk, useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowDownRight, ArrowUpRight, Boxes, CircleDollarSign, Clock3, LogOut, PackageCheck, RefreshCw, ShieldAlert, Store, Tag, TrendingUp } from 'lucide-react';
import { useGetInventorySummary, useListInventoryActivity, useListLowStock, useListOrders, useListProducts, useUpdateProductPrice, useUpdateStock, getGetInventorySummaryQueryKey, getListInventoryActivityQueryKey, getListLowStockQueryKey, getListOrdersQueryKey, getListProductsQueryKey } from '@workspace/api-client-react';
import type { ActivityEvent, Product, StockLevel } from '@workspace/api-client-react';

const currency = (value: number) => `$${value.toFixed(2)}`;

export function ManagerPage() {
  const { isLoaded } = useAuth();
  if (!isLoaded) return <div className="manager-signedout"><div style={{ width:'min(620px,100%)', display:'grid', gap:12 }}><div className="eyebrow">Aisle Market · store team</div><div className="skeleton" style={{ height:100 }}/><div className="skeleton"/></div></div>;
  return <div className="manager-shell">
    <Show when="signed-in"><ManagerWorkspace/></Show>
    <Show when="signed-out"><div className="manager-signedout"><div className="receipt-card"><div className="eyebrow">Aisle Market · store team</div><h2>Behind the shelves.</h2><p style={{ color:'#667183', fontSize:13, lineHeight:1.6 }}>Sign in with your store account to see live stock, edit shelf quantities and prices, and keep an eye on the market.</p><Link className="button" href="/sign-in" data-testid="link-manager-sign-in">Sign in to manager view</Link><div style={{ marginTop:14 }}><Link href="/" className="nav-link" data-testid="link-return-market">Return to the market</Link></div></div></div></Show>
  </div>;
}

function ManagerWorkspace() {
  const client = useQueryClient();
  const { user } = useUser();
  const { signOut } = useClerk();
  const summaryQ = useGetInventorySummary({ query: { queryKey: getGetInventorySummaryQueryKey(), refetchInterval: 30000 } });
  const lowQ = useListLowStock({ query: { queryKey: getListLowStockQueryKey(), refetchInterval: 30000 } });
  const activityQ = useListInventoryActivity({ query: { queryKey: getListInventoryActivityQueryKey(), refetchInterval: 30000 } });
  const productsQ = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey(), refetchInterval: 30000 } });
  const ordersQ = useListOrders({ limit: 6 }, { query: { queryKey: getListOrdersQueryKey({ limit: 6 }), refetchInterval: 30000 } });
  const updateStock = useUpdateStock();
  const updatePrice = useUpdateProductPrice();
  const summary = summaryQ.data;
  const [stockValues, setStockValues] = useState<Record<string, string>>({});
  const [priceValues, setPriceValues] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const products = productsQ.data ?? [];
  const lowStock = lowQ.data ?? [];
  const lastUpdate = useMemo(() => summaryQ.dataUpdatedAt ? new Date(summaryQ.dataUpdatedAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : 'Waiting for first sync', [summaryQ.dataUpdatedAt]);

  function refreshRelated() {
    void client.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
    void client.invalidateQueries({ queryKey: getListLowStockQueryKey() });
    void client.invalidateQueries({ queryKey: getListInventoryActivityQueryKey() });
    void client.invalidateQueries({ queryKey: getListProductsQueryKey() });
  }
  function saveStock(product: Product, quantity: number, reorderLevel = product.reorderLevel) {
    updateStock.mutate({ slotId: product.slotId, data: { quantity: Math.max(0, Math.min(10000, quantity)), reorderLevel } }, {
      onSuccess: () => { setNotice(`${product.name} shelf count updated.`); refreshRelated(); },
      onError: () => setNotice(`Could not update ${product.name}. Check your connection and try again.`),
    });
  }
  function restock(item: StockLevel, amount: number) {
    updateStock.mutate({ slotId: item.slotId, data: { quantity: Math.min(10000, item.quantity + amount), reorderLevel: item.reorderLevel } }, {
      onSuccess: () => { setNotice(`${item.productName} restocked by ${amount} ${item.category ? 'units' : 'items'}.`); refreshRelated(); },
      onError: () => setNotice(`Could not restock ${item.productName}. Try again.`),
    });
  }
  function savePrice(product: Product) {
    const value = Number(priceValues[product.id] ?? product.price);
    if (!Number.isFinite(value) || value < 0 || value > 99999) { setNotice('Enter a valid shelf price.'); return; }
    updatePrice.mutate({ productId: product.id, data: { price: value } }, {
      onSuccess: () => { setNotice(`${product.name} shelf price saved.`); setPriceValues((current) => ({ ...current, [product.id]: String(value) })); refreshRelated(); },
      onError: () => setNotice(`Could not update ${product.name} price. Try again.`),
    });
  }

  return <>
    <header className="manager-header">
      <Link href="/" className="brand" data-testid="link-manager-home"><span className="brand-mark">A</span><span>aisle market</span></Link>
      <span className="eyebrow" style={{ color:'#d7c9a4' }}>STORE DESK</span>
      <nav className="topnav"><Link href="/" className="nav-link" data-testid="link-shopper-view">Shopper view</Link><button className="button secondary" onClick={() => void signOut({ redirectUrl: '/' })} data-testid="button-manager-signout"><LogOut size={15}/> Sign out</button></nav>
    </header>
    <main className="manager-content">
      <div className="manager-title-row"><div><div className="eyebrow">Good shift, {user?.firstName || 'team'}</div><h1>Market floor report</h1><p>Inventory and demo orders, all in one place.</p></div><div className="freshness"><span className="live-dot"/>Polling every 30 sec · updated {lastUpdate}<button aria-label="Refresh manager data" onClick={() => { void summaryQ.refetch(); void productsQ.refetch(); void lowQ.refetch(); void activityQ.refetch(); void ordersQ.refetch(); }} style={{ border:0, background:'transparent', color:'inherit', padding:2, cursor:'pointer' }} data-testid="button-refresh-manager"><RefreshCw size={13}/></button></div></div>
      {notice && <div role="status" data-testid="status-manager-update" style={{ padding:'11px 14px', background:'#e6eee6', color:'#31583a', borderRadius:9, fontSize:12, marginBottom:14, display:'flex', justifyContent:'space-between' }}>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss update message" style={{ border:0, background:'transparent', cursor:'pointer', color:'inherit' }}>Dismiss</button></div>}
      {(summaryQ.isError || productsQ.isError) && <div role="alert" style={{ background:'#fbe9e5', color:'#a32c27', borderRadius:10, padding:14, marginBottom:14, fontSize:12 }}>Some market data could not be refreshed. Your edits are still available; retry the refresh.</div>}
      <section className="stat-grid" aria-label="Today's inventory summary">
        <Stat label="Units on shelves" value={summary?.totalUnits?.toLocaleString() ?? '—'} icon={<Boxes size={17}/>} loading={summaryQ.isLoading}/>
        <Stat label="Needs attention" value={summary?.lowStockCount?.toLocaleString() ?? '—'} icon={<ShieldAlert size={17}/>} alert={(summary?.lowStockCount ?? 0) > 0} loading={summaryQ.isLoading}/>
        <Stat label="Out of stock" value={summary?.outOfStockCount?.toLocaleString() ?? '—'} icon={<ArrowDownRight size={17}/>} alert={(summary?.outOfStockCount ?? 0) > 0} loading={summaryQ.isLoading}/>
        <Stat label="Inventory value" value={summary ? currency(summary.inventoryValue) : '—'} icon={<CircleDollarSign size={17}/>} loading={summaryQ.isLoading}/>
        <Stat label="Demo orders today" value={summary?.ordersToday?.toLocaleString() ?? '—'} icon={<TrendingUp size={17}/>} loading={summaryQ.isLoading}/>
        <Stat label="Demo revenue today" value={summary ? currency(summary.revenueToday) : '—'} icon={<CircleDollarSign size={17}/>} loading={summaryQ.isLoading}/>
      </section>
      <div className="manager-columns">
        <div>
          <section className="data-card">
            <div className="data-card-head"><div><h2>Product shelves</h2><p>Update what shoppers see in the market</p></div><span className="eyebrow">{products.length} PRODUCTS</span></div>
            {productsQ.isLoading ? <div style={{ padding:16 }}><div className="skeleton"/><div className="skeleton" style={{ marginTop:10 }}/></div> : <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Product / shelf</th><th>Stock</th><th>Reorder at</th><th>Price</th><th>Save</th></tr></thead><tbody>{products.map((p) => <tr key={p.id} data-testid={`row-inventory-${p.id}`}><td><span className="product-name">{p.name}</span><span style={{ display:'block', font:'9px DM Mono', color:'#89909b', marginTop:4 }}>{p.sku} · {p.aisleName}</span></td><td><input className="edit-input" aria-label={`${p.name} stock quantity`} type="number" min="0" max="10000" value={stockValues[p.id] ?? p.stockQuantity} onChange={(e) => setStockValues((v) => ({ ...v, [p.id]: e.target.value }))} data-testid={`input-stock-${p.id}`}/></td><td><input className="edit-input" aria-label={`${p.name} reorder level`} type="number" min="0" max="10000" value={stockValues[`reorder-${p.id}`] ?? p.reorderLevel} onChange={(e) => setStockValues((v) => ({ ...v, [`reorder-${p.id}`]: e.target.value }))} data-testid={`input-reorder-${p.id}`}/></td><td><input className="edit-input wide" aria-label={`${p.name} unit price`} type="number" min="0" max="99999" step="0.01" value={priceValues[p.id] ?? p.price} onChange={(e) => setPriceValues((v) => ({ ...v, [p.id]: e.target.value }))} data-testid={`input-price-${p.id}`}/></td><td><div style={{ display:'flex', gap:5 }}><button className="add-btn" style={{ width:34 }} disabled={updateStock.isPending} onClick={() => saveStock(p, Number(stockValues[p.id] ?? p.stockQuantity), Number(stockValues[`reorder-${p.id}`] ?? p.reorderLevel))} aria-label={`Save stock for ${p.name}`} title="Save stock" data-testid={`button-save-stock-${p.id}`}><PackageCheck size={15}/></button><button className="add-btn" style={{ width:34 }} disabled={updatePrice.isPending} onClick={() => savePrice(p)} aria-label={`Save price for ${p.name}`} title="Save price" data-testid={`button-save-price-${p.id}`}><Tag size={15}/></button></div></td></tr>)}</tbody></table>{products.length === 0 && <div className="empty-state">No products are on the floor yet.</div>}</div>}
          </section>
          <section className="data-card">
            <div className="data-card-head"><div><h2>Popular in the basket</h2><p>Today's most picked items</p></div><ArrowUpRight size={16} color="#77808c"/></div>
            <div className="low-stock-list">{summaryQ.isLoading ? <div className="skeleton"/> : summary?.topProducts?.length ? summary.topProducts.map((p, i) => <div className="low-stock-item" key={p.productId}><div style={{ display:'flex', alignItems:'center', gap:10 }}><span style={{ color:'#a1a6aa', font:'11px DM Mono' }}>{String(i+1).padStart(2,'0')}</span><div><strong>{p.name}</strong><small>{p.category}</small></div></div><span className="stock-badge">{p.unitsSold} picked</span></div>) : <div className="empty-state">No demo basket activity yet.</div>}</div>
          </section>
        </div>
        <div>
          <section className="data-card">
            <div className="data-card-head"><div><h2>Low-stock shelves</h2><p>Restock in a single tap</p></div><span className="stock-badge low">{lowStock.length} LOW</span></div>
            <div className="low-stock-list">{lowQ.isLoading ? <div className="skeleton"/> : lowStock.length ? lowStock.map((item) => <div className="low-stock-item" key={item.slotId} data-testid={`low-stock-${item.slotId}`}><div><strong>{item.productName}</strong><small>{item.aisleName} · {item.quantity} left · reorder at {item.reorderLevel}</small></div><button className="button secondary" style={{ minHeight:36, padding:'0 10px', fontSize:10 }} disabled={updateStock.isPending} onClick={() => restock(item, 12)} data-testid={`button-restock-${item.slotId}`}><ArrowUpRight size={13}/> +12</button></div>) : <div className="empty-state"><PackageCheck size={21} style={{ marginBottom:8 }}/><br/>All shelves are holding steady.</div>}</div>
          </section>
          <section className="data-card">
            <div className="data-card-head"><div><h2>Recent demo orders</h2><p>Recorded at the shopper's demo lane</p></div><Store size={16} color="#77808c"/></div>
            <div className="low-stock-list">{ordersQ.isLoading ? <div className="skeleton"/> : ordersQ.data?.length ? ordersQ.data.slice(0,6).map((order) => <div className="order-row" key={order.id} data-testid={`order-${order.id}`}><div><strong>{order.orderNumber}</strong><span style={{ display:'block', marginTop:4 }}>{order.itemCount} items · no charge</span></div><div style={{ textAlign:'right' }}><b>{currency(order.total)}</b><span style={{ display:'block', marginTop:4 }}>{new Date(order.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span></div></div>) : <div className="empty-state">No orders today. A quiet market can be a good thing.</div>}</div>
          </section>
          <section className="data-card">
            <div className="data-card-head"><div><h2>Market activity</h2><p>Recent changes across the store</p></div><Activity size={16} color="#77808c"/></div>
            <div className="activity-list">{activityQ.isLoading ? <div className="skeleton"/> : activityQ.data?.length ? activityQ.data.slice(0,8).map((event) => <ActivityRow event={event} key={event.id}/>) : <div className="empty-state">Nothing new to report.</div>}</div>
          </section>
        </div>
      </div>
      <div className="eyebrow" style={{ textAlign:'center', padding:12 }}>Prices and stock levels are shared live with the public shopper market.</div>
    </main>
  </>;
}

function Stat({ label, value, icon, alert, loading }: { label: string; value: string; icon: ReactNode; alert?: boolean; loading?: boolean }) {
  return <article className={`stat-card ${alert ? 'alert' : ''}`} data-testid={`stat-${label.toLowerCase().replace(/\s/g,'-')}`}><div className="stat-top"><span>{label}</span>{icon}</div><div className="stat-value">{loading ? <div className="skeleton" style={{ height:31, width:90 }}/> : value}</div></article>;
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const icon = event.kind === 'restock' ? <ArrowUpRight size={12}/> : event.kind === 'low_stock' ? <ArrowDownRight size={12}/> : event.kind === 'price_change' ? <Tag size={12}/> : <Clock3 size={12}/>;
  return <div className="activity-item" data-testid={`activity-${event.id}`}><span className={`activity-dot ${event.kind}`} style={{ display:'grid', placeItems:'center', width:18, height:18, color:'#fff' }}>{icon}</span><div><p>{event.description}</p><time>{new Date(event.createdAt).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</time></div></div>;
}
