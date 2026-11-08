import React, { useCallback, useState } from 'react';
import {
  addToCart,
  formatPrice,
  placeOrder,
  searchProducts,
  signIn,
  signOut,
  validatePromo,
  type CartItem,
  type Order,
  type Product,
  type User,
} from './api';
import { loadFavourites, saveFavourites } from './favourites';

type Screen = 'signin' | 'home' | 'cart' | 'checkout' | 'confirmed';

interface Draft {
  fullName: string;
  phone: string;
  address: string;
  promoCode: string;
}

export function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('signin');
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [draft, setDraft] = useState<Draft>({ fullName: '', phone: '', address: '', promoCode: '' });
  const [discount, setDiscount] = useState(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshProducts = useCallback(async (q = '') => {
    setProducts(await searchProducts(q));
  }, []);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      setBusy(true);
      setError('');
      try {
        const { user: signedIn } = await signIn(email, password);
        setUser(signedIn);
        setDraft((prev) => ({ ...prev, fullName: signedIn.name }));
        setFavourites(loadFavourites(signedIn.id));
        await refreshProducts();
        setScreen('home');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Sign in failed');
      } finally {
        setBusy(false);
      }
    },
    [refreshProducts],
  );

  const toggleFavourite = useCallback(
    (productId: string) => {
      if (!user) return;
      setFavourites((prev) => {
        const next = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
        saveFavourites(user.id, next); // keep it on the device
        return next;
      });
    },
    [user],
  );

  const handleAddToCart = useCallback(async (product: Product) => {
    setError('');
    try {
      const result = await addToCart(product.id, 1);
      setCart(result.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add to cart');
    }
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const applyPromo = useCallback(async () => {
    const result = await validatePromo(draft.promoCode, subtotal);
    setDiscount(result.discount);
    if (!result.valid) setError('Promo code is not valid');
  }, [draft.promoCode, subtotal]);

  const handlePlaceOrder = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const placed = await placeOrder(cart, { ...draft, email: user?.email }, discount);
      setOrder(placed);
      setScreen('confirmed');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Order could not be placed');
    } finally {
      setBusy(false);
    }
  }, [cart, draft, discount, user]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
    setCart([]);
    setFavourites([]);
    setOrder(null);
    setScreen('signin');
  }, []);

  if (screen === 'signin') return <SignIn onSignIn={handleSignIn} busy={busy} error={error} />;

  return (
    <div className="app">
      <header className="bar">
        <strong>Foodly</strong>
        {user && <span className="loyalty">{user.name} · {user.loyaltyTier}</span>}
        <div className="spacer" />
        {screen !== 'cart' && (
          <button aria-label="Cart" onClick={() => setScreen('cart')}>Cart ({cart.length})</button>
        )}
        <button aria-label="Sign out" onClick={handleSignOut}>Sign out</button>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      {screen === 'home' && (
        <Home
          products={products}
          favourites={favourites}
          query={query}
          onQuery={setQuery}
          onSearch={() => refreshProducts(query)}
          onToggleFavourite={toggleFavourite}
          onAddToCart={handleAddToCart}
        />
      )}

      {screen === 'cart' && (
        <Cart
          cart={cart}
          onBack={() => setScreen('home')}
          onCheckout={() => setScreen('checkout')}
          onClear={() => setCart([])}
        />
      )}

      {screen === 'checkout' && (
        <Checkout
          draft={draft}
          subtotal={subtotal}
          discount={discount}
          busy={busy}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          onApplyPromo={applyPromo}
          onPlaceOrder={handlePlaceOrder}
          onBack={() => setScreen('cart')}
        />
      )}

      {screen === 'confirmed' && order && (
        <Confirmed order={order} onDone={() => setScreen('home')} />
      )}
    </div>
  );
}

function SignIn({ onSignIn, busy, error }: { onSignIn: (e: string, p: string) => void; busy: boolean; error: string }): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="app signin">
      <h1>Sign in to Foodly</h1>
      {error && <p className="error" role="alert">{error}</p>}
      <label>Email<input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Password<input aria-label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <button aria-label="Sign in" disabled={busy} onClick={() => onSignIn(email, password)}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </div>
  );
}

function Home(props: {
  products: Product[];
  favourites: string[];
  query: string;
  onQuery: (q: string) => void;
  onSearch: () => void;
  onToggleFavourite: (id: string) => void;
  onAddToCart: (product: Product) => void;
}): React.JSX.Element {
  const favouriteProducts = props.products.filter((product) => props.favourites.includes(product.id));
  return (
    <main>
      <section className="search">
        <input aria-label="Search products" value={props.query} placeholder="Search…" onChange={(e) => props.onQuery(e.target.value)} />
        <button aria-label="Find" onClick={props.onSearch}>Find</button>
      </section>

      <section>
        <h2>Favourites</h2>
        {favouriteProducts.length === 0 ? (
          <p className="muted">Tap the heart on a product to keep it here.</p>
        ) : (
          favouriteProducts.map((product) => (
            <ProductRow key={product.id} product={product} favourite onToggleFavourite={props.onToggleFavourite} onAddToCart={props.onAddToCart} />
          ))
        )}
      </section>

      <section>
        <h2>Menu</h2>
        {props.products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            favourite={props.favourites.includes(product.id)}
            onToggleFavourite={props.onToggleFavourite}
            onAddToCart={props.onAddToCart}
          />
        ))}
      </section>
    </main>
  );
}

function ProductRow({ product, favourite, onToggleFavourite, onAddToCart }: {
  product: Product;
  favourite: boolean;
  onToggleFavourite: (id: string) => void;
  onAddToCart: (product: Product) => void;
}): React.JSX.Element {
  return (
    <div className="row">
      <div className="grow">
        <strong>{product.name}</strong>
        <span className="muted"> {formatPrice(product.price)}{product.inStock ? '' : ' · Sold out'}</span>
      </div>
      <button
        aria-label={favourite ? `Remove ${product.name} from favourites` : `Add ${product.name} to favourites`}
        onClick={() => onToggleFavourite(product.id)}
      >
        {favourite ? '♥' : '♡'}
      </button>
      <button aria-label={`Add ${product.name} to cart`} disabled={!product.inStock} onClick={() => onAddToCart(product)}>
        Add
      </button>
    </div>
  );
}

function Cart({ cart, onBack, onCheckout, onClear }: { cart: CartItem[]; onBack: () => void; onCheckout: () => void; onClear: () => void }): React.JSX.Element {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return (
    <main>
      <button aria-label="Back" onClick={onBack}>← Back</button>
      <h2>Your cart</h2>
      {cart.length === 0 ? (
        <p className="muted">Your cart is empty.</p>
      ) : (
        cart.map((item) => (
          <div className="row" key={item.productId}>
            <span className="grow">{item.name} × {item.quantity}</span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))
      )}
      <div className="row total"><span className="grow">Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
      <div className="row">
        <button aria-label="Clear cart" disabled={cart.length === 0} onClick={onClear}>Clear cart</button>
        <button aria-label="Checkout" disabled={cart.length === 0} onClick={onCheckout}>Checkout</button>
      </div>
    </main>
  );
}

function Checkout(props: {
  draft: Draft;
  subtotal: number;
  discount: number;
  busy: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onApplyPromo: () => void;
  onPlaceOrder: () => void;
  onBack: () => void;
}): React.JSX.Element {
  return (
    <main>
      <button aria-label="Back" onClick={props.onBack}>← Back</button>
      <h2>Checkout</h2>
      <label>Full name<input aria-label="Full name" value={props.draft.fullName} onChange={(e) => props.onChange({ fullName: e.target.value })} /></label>
      <label>Phone<input aria-label="Phone" value={props.draft.phone} onChange={(e) => props.onChange({ phone: e.target.value })} /></label>
      <label>Address<input aria-label="Address" value={props.draft.address} onChange={(e) => props.onChange({ address: e.target.value })} /></label>
      <div className="row">
        <input aria-label="Promo code" placeholder="Promo code" value={props.draft.promoCode} onChange={(e) => props.onChange({ promoCode: e.target.value })} />
        <button aria-label="Apply promo" onClick={props.onApplyPromo}>Apply</button>
      </div>
      <div className="row"><span className="grow">Subtotal</span><span>{formatPrice(props.subtotal)}</span></div>
      {props.discount > 0 && <div className="row"><span className="grow">Discount</span><span>-{formatPrice(props.discount)}</span></div>}
      <div className="row total"><span className="grow">Total</span><strong>{formatPrice(props.subtotal - props.discount)}</strong></div>
      <button aria-label="Place order" disabled={props.busy} onClick={props.onPlaceOrder}>
        {props.busy ? 'Placing…' : 'Place order'}
      </button>
    </main>
  );
}

function Confirmed({ order, onDone }: { order: Order; onDone: () => void }): React.JSX.Element {
  return (
    <main className="confirmed">
      <h2>Order confirmed</h2>
      <p>Order {order.id} · {formatPrice(order.total)}</p>
      <p className="muted">Your food is on the way.</p>
      <button aria-label="Back to menu" onClick={onDone}>Back to menu</button>
    </main>
  );
}
