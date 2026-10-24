import { useEffect, useRef } from 'react';
import { ClerkProvider, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { StorePage } from '@/pages/store';
import { ManagerPage } from '@/pages/manager';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: {
    colorPrimary: '#0B2A6F', colorForeground: '#14213D', colorMutedForeground: '#626d80', colorDanger: '#E5322D',
    colorBackground: '#F6F4EE', colorInput: '#FBFAF6', colorInputForeground: '#14213D', colorNeutral: '#d6d2c8',
    fontFamily: 'DM Sans, sans-serif', borderRadius: '12px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#F6F4EE] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#0B2A6F] font-bold', headerSubtitle: 'text-[#626d80]',
    socialButtonsBlockButtonText: 'text-[#14213D] font-semibold', formFieldLabel: 'text-[#263650] font-semibold',
    footerActionLink: 'text-[#0B2A6F] font-bold', footerActionText: 'text-[#626d80]', dividerText: 'text-[#626d80]',
    identityPreviewEditButton: 'text-[#0B2A6F]', formFieldSuccessText: 'text-[#416649]', alertText: 'text-[#14213D]',
    logoBox: 'rounded-xl', logoImage: 'rounded-xl', socialButtonsBlockButton: 'border-[#d6d2c8] rounded-xl',
    formButtonPrimary: 'bg-[#0B2A6F] hover:bg-[#173c86] rounded-xl', formFieldInput: 'rounded-xl border-[#d6d2c8] bg-[#FBFAF6]',
    footerAction: 'border-t border-[#e2dfd6]', dividerLine: 'bg-[#dedbd1]', alert: 'rounded-xl',
    otpCodeFieldInput: 'rounded-lg border-[#d6d2c8]', formFieldRow: 'gap-2', main: 'gap-5',
  },
};

function AuthInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const current = user?.id ?? null;
    if (previous.current !== undefined && previous.current !== current) client.clear();
    previous.current = current;
  }), [addListener, client]);
  return null;
}

function AuthPages() {
  return <Switch>
    <Route path="/"><StorePage /></Route>
    <Route path="/manager"><ManagerPage /></Route>
    <Route path="/sign-in/*?">
      <div className="auth-page"><section className="auth-story"><Link className="brand" href="/" data-testid="link-auth-home"><span className="brand-mark">A</span><span style={{ color: '#f6f4ee' }}>aisle market</span></Link><div><div className="eyebrow" style={{ color: '#d7c9a4' }}>A neighborhood market, online</div><h1>Good things are just down the aisle.</h1><p>Sign in to carry your basket between visits. The shop stays open to everyone, account or not.</p></div><span className="eyebrow" style={{ color: '#d7c9a4' }}>Explore at your own pace · aisle market</span></section><div className="auth-form-zone"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div></div>
    </Route>
    <Route path="/sign-up/*?">
      <div className="auth-page"><section className="auth-story"><Link className="brand" href="/" data-testid="link-auth-home"><span className="brand-mark">A</span><span style={{ color: '#f6f4ee' }}>aisle market</span></Link><div><div className="eyebrow" style={{ color: '#d7c9a4' }}>Your local, reimagined</div><h1>Make room in the basket.</h1><p>Create an account to keep your shopping simple. Browse the market first—there is no account required to explore.</p></div><span className="eyebrow" style={{ color: '#d7c9a4' }}>Fresh finds and familiar favorites</span></section><div className="auth-form-zone"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div></div>
    </Route>
    <Route component={NotFound} />
  </Switch>;
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Step back into your market account' } }, signUp: { start: { title: 'Join the neighborhood', subtitle: 'A little more room in your basket' } } }}
    routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <AuthInvalidator />
    <AuthPages />
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <QueryClientProvider client={queryClient}><WouterRouter base={basePath}><ClerkRoutes /></WouterRouter></QueryClientProvider>;
}

export default App;
