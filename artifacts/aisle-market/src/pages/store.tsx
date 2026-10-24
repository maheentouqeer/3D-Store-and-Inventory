import { useMemo, useState, type CSSProperties } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronRight, CircleHelp, Compass, LocateFixed, Minus, Plus, Search, ShoppingBag, ShoppingCart, X } from 'lucide-react';
import { getListProductsQueryKey, getListAislesQueryKey, getListOrdersQueryKey, getGetInventorySummaryQueryKey, getListLowStockQueryKey, getListInventoryActivityQueryKey, getHealthCheckQueryKey, useCreateOrder, useHealthCheck, useListAisles, useListProducts } from '@workspace/api-client-react';
import type { Aisle, Order, Product } from '@workspace/api-client-react';
import { MarketScene, type SceneCommand } from '../components/market-scene';

type BasketLine = { product: Product; quantity: number };
const money = (amount: number) => `$${amount.toFixed(2)}`;

export function StorePage() {
  const queryClient = useQueryClient();
  const productQuery = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey(), refetchInterval: 30000 } });
  const aisleQuery = useListAisles({ query: { queryKey: getListAislesQueryKey(), refetchInterval: 60000 } });
  const healthQuery = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000 } });
  const createOrder = useCreateOrder();
  const products = productQuery.data ?? [];
  const aisles = aisleQuery.data ?? [];
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All shelves');
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [sceneCommand, setSceneCommand] = useState<SceneCommand>({ id: 0, type: 'reset' });
  const [lookOn, setLookOn] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const filtered = useMemo(() => products.filter((p) => {
    const matchesSearch = !search || `${p.name} ${p.category} ${p.sku}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All shelves' || p.category.toLowerCase() === category.toLowerCase();
    return matchesSearch && matchesCategory;
  }), [products, search, category]);
  const categories = useMemo(() => ['All shelves', ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const itemCount = basket.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = basket.reduce((sum, line) => sum + (line.product.salePrice ?? line.product.price) * line.quantity, 0);
  const tax = subtotal * 0.08;

  function addToBasket(product: Product) {
    if (product.stockQuantity <= 0) return;
    setBasket((current) => {
      const found = current.find((line) => line.product.id === product.id);
      if (found) return current.map((line) => line.product.id === product.id ? { ...line, quantity: Math.min(25, product.stockQuantity, line.quantity + 1) } : line);
      return [...current, { product, quantity: 1 }];
    });
    setSelected(product);
  }
  function adjust(productId: string, delta: number) {
    setBasket((current) => current.flatMap((line) => line.product.id !== productId ? [line] : line.quantity + delta <= 0 ? [] : [{ ...line, quantity: Math.min(25, line.product.stockQuantity, line.quantity + delta) }]));
  }
  function goAisle(aisle?: Aisle) {
    if (!aisle) return;
    setCategory(aisle.category);
    setSceneCommand((previous) => ({ id: previous.id + 1, type: 'focus', aisleId: aisle.id }));
  }
  function aimAtProduct(product?: Product) {
    if (!product) return;
    const aisle = aisles.find((a) => a.id === product.aisleId);
    if (aisle) goAisle(aisle);
  }
  function move(direction: string) {
    setSceneCommand((previous) => ({ id: previous.id + 1, type: 'move', direction }));
  }
  function resetScene() {
    setCategory('All shelves');
    setSceneCommand((previous) => ({ id: previous.id + 1, type: 'reset' }));
  }
  function checkout() {
    setCheckoutError('');
    createOrder.mutate({ data: { items: basket.map(({ product, quantity }) => ({ productId: product.id, quantity })) } }, {
      onSuccess: (order) => {
        setReceipt(order);
        setBasket([]);
        setCartOpen(false);
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getListAislesQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getListLowStockQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getListInventoryActivityQueryKey() });
      },
      onError: () => setCheckoutError('We could not complete this demo order. Your basket is still here—please try again.'),
    });
  }
  return <div className="app-shell">
    <header className="topbar">
      <Link href="/" className="brand" data-testid="link-home"><span className="brand-mark">A</span><span>aisle market</span></Link>
      <div className="topnav"><Link href="/manager" className="nav-link" data-testid="link-manager">Store manager</Link><button className="button secondary" onClick={() => setCartOpen(true)} data-testid="button-open-basket"><ShoppingBag size={16}/> Basket <span>{itemCount}</span></button></div>
    </header>
    <main>
      {receipt ? <section style={{ padding: '52px 18px', minHeight: '76vh', display: 'grid', alignItems: 'center' }}><div className="receipt-card">
        <div className="eyebrow">Aisle Market · Demo receipt</div><h2>Thanks for stopping by.</h2><p style={{ color: '#636c7b', fontSize: 13 }}>Order <strong>{receipt.orderNumber}</strong> is on the shelf. No payment was collected.</p>
        <div className="receipt-rule" />{receipt.items.map((line) => <div className="receipt-item" key={line.productId}><span>{line.quantity} × {line.name}</span><span>{money(line.lineTotal)}</span></div>)}
        <div className="receipt-rule" /><div className="summary-line"><span>Subtotal</span><span>{money(receipt.subtotal)}</span></div><div className="summary-line"><span>Tax</span><span>{money(receipt.tax)}</span></div><div className="summary-line total"><span>Total · demo</span><span>{money(receipt.total)}</span></div>
        <div className="demo-notice">Demo order only. This checkout does not charge a card or collect payment.</div>
        <button className="button" onClick={() => setReceipt(null)} data-testid="button-back-to-market"><Compass size={16}/> Back to the market</button>
      </div></section> : <>
        <section className="shop-hero">
          <div><div className="eyebrow">Good morning from your neighborhood market</div><h1>Take a little walk.</h1><p>Wander the aisles, spot something good, and drop it in your basket. Every shelf reflects what is actually in stock.</p></div>
          <div className="store-stamp"><strong>OPEN FOR A BROWSE</strong>6 aisles · locally stocked<br/>Inventory updates as you shop</div>
        </section>
        <section className="store-layout" aria-label="Explore the virtual market">
          <div className="market-stage" tabIndex={0} aria-label="Walkable 3D market scene. Use WASD or arrow keys to move." data-testid="scene-market">
            <MarketScene
              products={products}
              aisles={aisles}
              command={sceneCommand}
              lookEnabled={lookOn}
              onProductSelect={setSelected}
              onAisleSelect={goAisle}
            />
            <div className="stage-topline"><span className="live-pill"><span className="live-dot"/>{healthQuery.data?.status === 'ok' ? 'SHELVES LIVE' : 'MARKET FLOOR'}</span><span className="stage-help">WASD / arrows to wander · drag to look</span></div>
            <div className="reticle"/>
            <div className="stage-controls"><button onClick={() => setLookOn((v) => !v)} data-testid="button-toggle-look"><LocateFixed size={13} style={{ verticalAlign: 'middle', marginRight: 5 }}/>{lookOn ? 'Look around: on' : 'Look around'}</button><button onClick={resetScene} data-testid="button-reset-view">Reset view</button></div>
            <div className="touch-pad" aria-label="Touch movement controls">
              <button aria-label="Move forward" onClick={() => move('forward')} data-testid="touch-forward"><ArrowUp size={17}/></button><button aria-label="Turn left" onClick={() => move('turn-left')} data-testid="touch-turn-left"><ArrowLeft size={17}/></button><button aria-label="Turn right" onClick={() => move('turn-right')} data-testid="touch-turn-right"><ArrowRight size={17}/></button><button aria-label="Move backward" onClick={() => move('back')} data-testid="touch-back"><ArrowDown size={17}/></button>
            </div>
            {selected && <div style={{ position:'absolute', left:'50%', top:'52%', transform:'translate(-50%,-50%)', zIndex:8, background:'#F6F4EE', border:'1px solid #d8d5cc', borderRadius:12, width:250, padding:14, boxShadow:'0 8px 28px rgba(20,33,61,.22)' }}>
              <button className="icon-button" style={{ position:'absolute', right:8, top:8, width:32, height:32 }} onClick={() => setSelected(null)} aria-label="Close product detail"><X size={16}/></button>
              <div className="product-swatch" style={{ '--pack': selected.packageColor, width:50, height:54 } as CSSProperties}/><div className="eyebrow" style={{ marginTop:12 }}>{selected.category} · {selected.aisleName}</div><strong style={{ display:'block', fontSize:14, marginTop:5, paddingRight:30 }}>{selected.name}</strong><p style={{ fontSize:11, color:'#707987', lineHeight:1.45 }}>{selected.description || `${selected.unit} · ${selected.stockQuantity} on shelf`}</p><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><strong style={{ color:'#0B2A6F', fontFamily:'DM Mono' }}>{money(selected.salePrice ?? selected.price)}</strong><button className="button" onClick={() => { addToBasket(selected); setSelected(null); }} disabled={selected.stockQuantity <= 0} data-testid={`button-add-inspected-${selected.id}`}><Plus size={15}/> Add to basket</button></div>
            </div>}
          </div>
          <aside className="shop-panel" aria-label="Product browse and search">
            <div className="panel-head"><div><div className="eyebrow">The shelves</div><h2>Find your next good thing</h2></div><span className="eyebrow">{filtered.length} items</span></div>
            <div className="search-wrap"><div className="search-box"><Search size={16}/><input className="search-input" type="search" placeholder="Search the market" value={search} onChange={(e) => { setSearch(e.target.value); const match = products.find((p) => `${p.name} ${p.category} ${p.sku}`.toLowerCase().includes(e.target.value.toLowerCase())); aimAtProduct(match); }} aria-label="Search products" data-testid="input-search-products"/></div></div>
            <div className="category-list" aria-label="Product categories">{categories.map((c) => <button key={c} className={`category-chip ${category === c ? 'selected' : ''}`} onClick={() => { setCategory(c); const aisle = aisles.find((a) => a.category.toLowerCase() === c.toLowerCase()); if (aisle) goAisle(aisle); }} data-testid={`filter-category-${c.replace(/\W/g,'-').toLowerCase()}`}>{c}</button>)}</div>
            <div className="product-list" aria-live="polite">
              {productQuery.isLoading ? <><div className="skeleton" style={{ margin:'7px 4px' }}/><div className="skeleton" style={{ margin:'7px 4px' }}/><div className="skeleton" style={{ margin:'7px 4px' }}/></> : productQuery.isError ? <div className="empty-state">The shelf list is taking a breather. <button className="button ghost" onClick={() => void productQuery.refetch()}>Try again</button></div> : filtered.length === 0 ? <div className="empty-state">No matches on this pass. Try another shelf or search.</div> : filtered.map((p) => <div className="product-row" key={p.id} data-testid={`product-row-${p.id}`}><div className="product-swatch" style={{ '--pack': p.packageColor } as CSSProperties}/><div><div className="product-title">{p.name}</div><div className="product-meta">{p.aisleName} · {p.stockQuantity > 0 ? `${p.stockQuantity} in stock` : 'just sold out'}</div></div><div className="product-action"><div className="product-price">{money(p.salePrice ?? p.price)}{p.salePrice != null && <><span className="old-price">{money(p.price)}</span><span className="sale-tag">MARKET SPECIAL</span></>}</div><button className="add-btn" aria-label={`Add ${p.name} to basket`} disabled={p.stockQuantity <= 0} onClick={() => addToBasket(p)} data-testid={`button-add-${p.id}`}><Plus size={16}/></button></div></div>)}
            </div>
            <button className="cart-bar" onClick={() => setCartOpen(true)} data-testid="button-open-basket-panel"><span><ShoppingCart size={16} style={{ verticalAlign:'middle', marginRight:8 }}/>Your basket · {itemCount} {itemCount === 1 ? 'item' : 'items'}</span><small>{money(subtotal)} <ChevronRight size={14} style={{ verticalAlign:'middle' }}/></small></button>
          </aside>
        </section>
        <section className="below-store">
          <article className="note-card"><div className="eyebrow">A map for the curious</div><h3>Pick a shelf. We’ll meet you there.</h3><p>Choose an aisle to bring it into view and filter the shelves beside you. You can still browse the complete product list with a screen reader or keyboard.</p><div className="aisle-nav">{aisles.map((a) => <button key={a.id} onClick={() => goAisle(a)} data-testid={`button-go-aisle-${a.id}`}>Aisle {String(a.number).padStart(2,'0')} · {a.name}</button>)}</div></article>
          <article className="note-card"><div className="eyebrow">A note at checkout</div><h3>A basket, not a bill.</h3><p>This is a no-charge demo checkout. Your basket creates a demo order so the market shelves can update together—no card details, no payment.</p><button className="button ghost" style={{ marginTop:10 }} onClick={() => setCartOpen(true)} data-testid="button-demo-checkout-info"><CircleHelp size={15}/> See how demo checkout works</button></article>
        </section>
      </>}
    </main>
    {cartOpen && <div className="cart-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setCartOpen(false); }}>
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your basket">
        <div className="drawer-title"><div><div className="eyebrow">Before you head to the lane</div><h2>Your basket <span style={{ fontSize:13, color:'#737b87' }}>({itemCount})</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close basket" data-testid="button-close-basket"><X size={18}/></button></div>
        <div className="cart-lines">{basket.length ? basket.map(({ product, quantity }) => <div className="cart-line" key={product.id}><div className="product-swatch" style={{ '--pack': product.packageColor } as CSSProperties}/><div><div className="product-title">{product.name}</div><div className="product-meta">{money(product.salePrice ?? product.price)} each</div><div className="qty-controls"><button onClick={() => adjust(product.id,-1)} aria-label={`Remove one ${product.name}`} data-testid={`button-decrease-${product.id}`}><Minus size={13}/></button><span style={{ fontFamily:'DM Mono', fontSize:11 }}>{quantity}</span><button onClick={() => adjust(product.id,1)} aria-label={`Add one ${product.name}`} disabled={quantity >= 25} data-testid={`button-increase-${product.id}`}><Plus size={13}/></button></div></div><strong style={{ font: '11px DM Mono', color:'#0B2A6F' }}>{money((product.salePrice ?? product.price) * quantity)}</strong></div>) : <div className="empty-state" style={{ marginTop:50 }}><ShoppingBag size={26} style={{ marginBottom:12, color:'#0B2A6F' }}/><br/>Nothing in the basket yet.<br/>The good stuff is just down the aisle.</div>}</div>
        <div className="cart-summary"><div className="summary-line"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="summary-line"><span>Estimated tax</span><span>{money(tax)}</span></div><div className="summary-line total"><span>Demo total</span><span>{money(subtotal + tax)}</span></div><div className="demo-notice"><strong>Demo / no charge.</strong> This lane records a demo order and updates stock. It does not collect payment.</div>{checkoutError && <div role="alert" style={{ color:'#bc332e', fontSize:11, marginBottom:10 }}>{checkoutError}</div>}<button className="button drawer-checkout" disabled={!basket.length || createOrder.isPending} onClick={checkout} data-testid="button-demo-checkout">{createOrder.isPending ? 'Recording demo order…' : <><Check size={16}/> Continue to demo lane · no charge</>}</button></div>
      </aside>
    </div>}
  </div>;
}
