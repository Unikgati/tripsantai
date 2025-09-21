import React, { useState, useEffect, Suspense } from 'react';
import { ToastProvider } from './components/Toast';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { WishlistProvider } from './contexts/WishlistContext';
import { fetchDestinations, upsertDestination, deleteDestination as sbDeleteDestination, fetchBlogPosts, upsertBlogPost, deleteBlogPost as sbDeleteBlogPost, insertOrder, fetchOrders, updateOrder, fetchAppSettings, upsertAppSettings } from './lib/supabase';
import { Page, Destination, BlogPost, Order, OrderStatus, AppSettings } from './types';
import getSupabaseClient from './lib/supabase';
// Removed demo seed data import to rely solely on Supabase (or empty state)
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { StickyWhatsAppButton } from './components/StickyWhatsAppButton';
import { HomePage } from './pages/HomePage';
import { DestinationsPage } from './pages/DestinationsPage';
import { DestinationDetailPage } from './pages/DestinationDetailPage';
import { BlogPage } from './pages/BlogPage';
import { BlogDetailPage } from './pages/BlogDetailPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { WishlistPage } from './pages/WishlistPage';
import { ContactPage } from './pages/ContactPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import Loading from './components/Loading';
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout').then(module => ({ default: module.AdminLayout })));
import InvoicePage from './pages/admin/InvoicePage';

// Function to lighten/darken a color
const shadeColor = (color: string, percent: number) => {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);

    R = Math.min(255, Math.floor(R * (100 + percent) / 100));
    G = Math.min(255, Math.floor(G * (100 + percent) / 100));
    B = Math.min(255, Math.floor(B * (100 + percent) / 100));

    const RR = R.toString(16).padStart(2, '0');
    const GG = G.toString(16).padStart(2, '0');
    const BB = B.toString(16).padStart(2, '0');

    return `#${RR}${GG}${BB}`;
}

const App = () => {
  const [page, setPage] = useState<Page>('home');
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [homeIsLoading, setHomeIsLoading] = useState(false);
  const [supabaseFetchStatus, setSupabaseFetchStatus] = useState<{ destinations?: string; blog?: string }>({});

  // Simulate initial home load for preview/demo of skeletons (1.5s)
  useEffect(() => {
    setHomeIsLoading(true);
    const t = setTimeout(() => setHomeIsLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  // Sync isAuthenticated with Supabase session
  useEffect(() => {
    const supabase = getSupabaseClient();
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data?.session) setIsAuthenticated(true);
      } catch (e) {
        // ignore
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      mounted = false;
      try { sub.subscription.unsubscribe(); } catch {}
    };
  }, []);
  
  // Data moved to state for mutability. Start empty so UI reflects Supabase state.
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // If Supabase env is configured, load remote data on mount
  useEffect(() => {
    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!useSupabase) return;

    let mounted = true;
    (async () => {
      try {
        const remoteDestinations = await fetchDestinations();
        const remoteBlog = await fetchBlogPosts();
  const remoteOrders = await fetchOrders();
        if (!mounted) return;
        // Always apply remote results even when empty arrays are returned. This ensures
        // the app mirrors Supabase state (empty) instead of silently keeping local seed data.
        if (Array.isArray(remoteDestinations)) {
    // debug log removed in production build
          setDestinations(remoteDestinations as unknown as Destination[]);
          setSupabaseFetchStatus(prev => ({ ...prev, destinations: `ok (${remoteDestinations.length})`}));
        } else {
          // debug log removed in production build
          setSupabaseFetchStatus(prev => ({ ...prev, destinations: 'invalid-shape' }));
        }

        if (Array.isArray(remoteBlog)) {
          // debug log removed in production build
          setBlogPosts(remoteBlog as unknown as BlogPost[]);
          setSupabaseFetchStatus(prev => ({ ...prev, blog: `ok (${remoteBlog.length})`}));
        } else {
          // debug log removed in production build
          setSupabaseFetchStatus(prev => ({ ...prev, blog: 'invalid-shape' }));
        }
        if (Array.isArray(remoteOrders)) {
          // debug log removed in production build
          setOrders(remoteOrders as unknown as Order[]);
          setSupabaseFetchStatus(prev => ({ ...prev, orders: `ok (${remoteOrders.length})`}));
        } else {
          // debug log removed in production build
          setSupabaseFetchStatus(prev => ({ ...prev, orders: 'invalid-shape' }));
        }
      } catch (err) {
        console.warn('Supabase fetch failed, keeping local seed data', err);
        setSupabaseFetchStatus({ destinations: 'error', blog: 'error' });
      }
    })();
    return () => { mounted = false; };
  }, []);

  // App Settings State - initialize synchronously from localStorage to avoid FOUC
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      theme: 'light',
      accentColor: '#3182ce',
      brandName: '',
      tagline: 'Jelajahi dunia tanpa batas.',
      logoLightUrl: '',
      logoDarkUrl: '',
      favicon16Url: '',
      favicon192Url: '',
      favicon512Url: '',
      email: 'contact@travelgo.com',
      address: 'Jl. Jend. Sudirman No. 123, Jakarta Pusat, Indonesia',
      whatsappNumber: '6281234567890',
      facebookUrl: '',
      instagramUrl: '',
      twitterUrl: '',
      bankName: '',
      bankAccountNumber: '',
      bankAccountHolder: '',
      heroSlides: [],
    };

    try {
      let stored: string | null = null;
      try { stored = localStorage.getItem('appSettings'); } catch (e) { stored = null; }
      let theme: string | null = null;
      try { theme = localStorage.getItem('theme'); } catch (e) { theme = null; }

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return { ...defaultSettings, ...parsed, theme: theme ?? parsed?.theme ?? defaultSettings.theme } as AppSettings;
        } catch (e) {
          return { ...defaultSettings, theme: theme ?? defaultSettings.theme };
        }
      }

      if (theme) return { ...defaultSettings, theme };
      return defaultSettings;
    } catch (e) {
      return {
        theme: 'light',
        accentColor: '#3182ce',
        brandName: '',
        tagline: 'Jelajahi dunia tanpa batas.',
        logoLightUrl: '',
        logoDarkUrl: '',
        favicon16Url: '',
        favicon192Url: '',
        favicon512Url: '',
        email: 'contact@travelgo.com',
        address: 'Jl. Jend. Sudirman No. 123, Jakarta Pusat, Indonesia',
        whatsappNumber: '6281234567890',
        facebookUrl: '',
        instagramUrl: '',
        twitterUrl: '',
        bankName: '',
        bankAccountNumber: '',
        bankAccountHolder: '',
        heroSlides: [],
      };
    }
  });

  // Load settings from localStorage on initial render
  useEffect(() => {
    let mounted = true;
    const storedSettings = (() => {
      try { return localStorage.getItem('appSettings'); } catch { return null; }
    })();
    const storedTheme = (() => {
      try { return localStorage.getItem('theme'); } catch { return null; }
    })();

    // If user has a saved theme preference in localStorage, apply it immediately
    if (storedTheme) {
      try { setAppSettings(prev => ({ ...prev, theme: storedTheme as any })); } catch {}
    }

    // If Supabase configured, attempt to load settings from DB first. Otherwise fallback to localStorage.
    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!useSupabase) {
      if (storedSettings) {
        try { setAppSettings(prev => ({ ...prev, ...JSON.parse(storedSettings) })); } catch (e) { console.error('Failed to parse app settings from localStorage', e); }
      }
      return;
    }

    (async () => {
      try {
        const remote = await fetchAppSettings();
        if (!mounted) return;
        if (remote) {
          // Preserve locally saved theme preference if present (localStorage is intentionally primary)
          setAppSettings(prev => ({ ...prev, ...remote, theme: storedTheme ?? remote.theme ?? prev.theme }));
          try { localStorage.setItem('appSettings', JSON.stringify(remote)); } catch {}
        } else if (storedSettings) {
          // fallback to localStorage if remote missing or access denied
          try { setAppSettings(prev => ({ ...prev, ...JSON.parse(storedSettings) })); } catch (e) { console.error('Failed to parse app settings from localStorage', e); }
        }
      } catch (err) {
        console.warn('[SUPABASE] failed to load app settings, falling back to localStorage', err);
        if (storedSettings) {
          try { setAppSettings(prev => ({ ...prev, ...JSON.parse(storedSettings) })); } catch (e) { console.error('Failed to parse app settings from localStorage', e); }
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Persist theme preference to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem('theme', appSettings.theme); } catch {}
  }, [appSettings.theme]);

  // Debug instrumentation: wrap history methods to log who is calling navigation
  useEffect(() => {
    try {
      const originalPush = window.history.pushState;
      const originalReplace = window.history.replaceState;

      // @ts-ignore
      window.history.pushState = function (...args: any[]) {
  // debug instrumentation removed for production
        // @ts-ignore
        return originalPush.apply(this, args);
      };

      // @ts-ignore
      window.history.replaceState = function (...args: any[]) {
  // debug instrumentation removed for production
        // @ts-ignore
        return originalReplace.apply(this, args);
      };

      return () => {
        // restore
        // @ts-ignore
        window.history.pushState = originalPush;
        // @ts-ignore
        window.history.replaceState = originalReplace;
      };
    } catch (e) {
      // ignore in non-browser env
    }
  }, []);

  // Note: location logging moved later where `location` is declared for layout decisions.

  // Centralized refresh handler for admin: refetch main collections without full page reload
  const handleRefresh = async () => {
    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!useSupabase) return;
    try {
      const [remoteDestinations, remoteBlog, remoteOrders] = await Promise.all([fetchDestinations(), fetchBlogPosts(), fetchOrders()]);
      if (Array.isArray(remoteDestinations)) setDestinations(remoteDestinations as unknown as Destination[]);
      if (Array.isArray(remoteBlog)) setBlogPosts(remoteBlog as unknown as BlogPost[]);
      if (Array.isArray(remoteOrders)) setOrders(remoteOrders as unknown as Order[]);
      setSupabaseFetchStatus(prev => ({ ...prev, destinations: `refreshed`, blog: `refreshed`, orders: `refreshed` }));
    } catch (err) {
      console.warn('[SUPABASE] refresh failed', err);
    }
  };

  // Apply theme, colors, and favicon whenever appSettings change
  useEffect(() => {
    document.body.className = appSettings.theme;

    const root = document.documentElement;
    root.style.setProperty('--accent', appSettings.accentColor);
    root.style.setProperty('--accent-hover', shadeColor(appSettings.accentColor, -15));
    
    const setFavicon = (id: string, url: string) => {
        const link = document.getElementById(id) as HTMLLinkElement | null;
        if (link && url) {
            link.href = url;
        }
    };
    setFavicon('favicon-16', appSettings.favicon16Url);
    setFavicon('favicon-192', appSettings.favicon192Url);
    setFavicon('favicon-512', appSettings.favicon512Url);
    setFavicon('favicon-apple', appSettings.favicon512Url);
  }, [appSettings]);

  // Set document title from appSettings to keep page title consistent and editable via admin
  useEffect(() => {
    try {
      const brand = appSettings.brandName || '';
      const tagline = appSettings.tagline || '';
      const title = brand ? (tagline ? `${brand} - ${tagline}` : brand) : (tagline || '');
      if (title) document.title = title;
    } catch (e) {
      // ignore
    }
  }, [appSettings.brandName, appSettings.tagline]);
  
  // Scroll to top on page change (also sync legacy page state when route changes)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  // Note: legacy `page` state is kept for compatibility, but we intentionally do not auto-sync it
  // back to routes here. Navigation should be performed explicitly via `navigate(...)` where
  // appropriate (most handlers already call navigate). Auto-syncing caused unexpected
  // redirects on direct URL loads, so it was removed.

  const handleLogin = () => {
    setIsAuthenticated(true);
    try { navigate('/admin'); } catch (e) {}
  };
  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      try { await supabase.auth.signOut(); } catch (e) { console.warn('supabase signOut failed', e); }
    } catch (e) {
      // ignore
    }
    setIsAuthenticated(false);
    try { navigate('/admin'); } catch (e) {}
  };

  const handleSearch = (query: string) => {
  setSearchQuery(query);
  setPage('search');
  try { navigate('/search'); } catch (e) { /* no-op */ }
  };
  
  const handleViewDetail = (destination: Destination) => {
    setSelectedDestination(destination);
    setPage('destinationDetail');
    try {
  // navigation debug removed
      navigate(`/destinations/${destination.slug || destination.id}`);
    } catch (e) {
  // navigation debug removed
    }
  };

  const handleBookNow = (destination: Destination) => {
    setSelectedDestination(destination);
    setIsBookingModalOpen(true);
  };
  
  const handleViewBlogDetail = (post: BlogPost) => {
    setSelectedPost(post);
    setPage('blogDetail');
    try {
  // navigation debug removed
      navigate(`/blog/${post.slug || post.id}`);
    } catch (e) {
  // navigation debug removed
    }
  };
  
  // CRUD Handlers for Destinations
  const handleSaveDestination = async (dest: Destination) => {
    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!useSupabase) {
      if (dest.id === 0) {
        const newDest = { ...dest, id: Date.now() };
        setDestinations(prev => [...prev, newDest]);
        return newDest;
      } else {
        setDestinations(prev => prev.map(d => d.id === dest.id ? dest : d));
        return dest;
      }
    }

    try {
      const saved = await upsertDestination(dest);
      if (saved) {
        // upsert returns the saved row; replace or add
        setDestinations(prev => {
          const exists = prev.some(d => d.id === saved.id);
          if (exists) return prev.map(d => d.id === saved.id ? (saved as Destination) : d);
          return [...prev, (saved as Destination)];
        });
        return saved;
      }
    } catch (err) {
      console.error('Failed to save destination to Supabase, falling back to local state', err);
      // Keep a local fallback so UI remains responsive, but propagate the error to caller
      if (dest.id === 0) {
        const newDest = { ...dest, id: Date.now() };
        setDestinations(prev => [...prev, newDest]);
      } else {
        setDestinations(prev => prev.map(d => d.id === dest.id ? dest : d));
      }
      // Rethrow so caller (UI) can show a toast and allow retry
      throw err;
    }
  };

  const handleDeleteDestination = async (id: number) => {
    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!useSupabase) {
      setDestinations(prev => prev.filter(d => d.id !== id));
      return;
    }
    try {
      await sbDeleteDestination(id);
      setDestinations(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed to delete destination from Supabase, falling back to local delete', err);
      setDestinations(prev => prev.filter(d => d.id !== id));
    }
  };

  // CRUD Handlers for Blog Posts
  const handleSaveBlogPost = async (post: BlogPost) => {
    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!useSupabase) {
      if (post.id === 0) {
        const newPost = { ...post, id: Date.now(), date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) };
        setBlogPosts(prev => [...prev, newPost]);
      } else {
        setBlogPosts(prev => prev.map(p => p.id === post.id ? post : p));
      }
      return;
    }
    try {
      const saved = await upsertBlogPost(post);
      if (saved) {
        setBlogPosts(prev => {
          const exists = prev.some(p => p.id === saved.id);
          if (exists) return prev.map(p => p.id === saved.id ? (saved as BlogPost) : p);
          return [...prev, (saved as BlogPost)];
        });
      }
    } catch (err) {
      console.error('Failed to save blog post to Supabase, falling back to local state', err);
      if (post.id === 0) {
        const newPost = { ...post, id: Date.now(), date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) };
        setBlogPosts(prev => [...prev, newPost]);
      } else {
        setBlogPosts(prev => prev.map(p => p.id === post.id ? post : p));
      }
    }
  };

  const handleDeleteBlogPost = async (id: number) => {
    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!useSupabase) {
      setBlogPosts(prev => prev.filter(p => p.id !== id));
      return;
    }
    try {
      await sbDeleteBlogPost(id);
      setBlogPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete blog post from Supabase, falling back to local delete', err);
      setBlogPosts(prev => prev.filter(p => p.id !== id));
    }
  };

  // Handlers for Orders
  const handleCreateOrder = (orderData: { customerName: string; customerPhone: string; participants: number; destination: Destination; departureDate?: string; totalPrice: number; }) => {
    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

    const newOrder: Order = {
      id: Date.now(),
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      participants: orderData.participants,
      destinationId: orderData.destination.id,
      destinationTitle: orderData.destination.title,
      orderDate: new Date().toISOString(),
      departureDate: orderData.departureDate,
      status: 'Baru',
      totalPrice: orderData.totalPrice // Use pre-calculated price from modal
    };

    // Optimistically add to local state first so UI responds immediately
    setOrders(prev => [newOrder, ...prev]);

    // Try persisting via serverless endpoint which uses SERVICE_ROLE_KEY (no client auth needed).
    // Fall back to client-side insertOrder if endpoint unavailable.
    (async () => {
      try {
        const resp = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: newOrder.customerName,
            customerPhone: newOrder.customerPhone,
            destinationId: newOrder.destinationId,
            destinationTitle: newOrder.destinationTitle,
            participants: newOrder.participants,
            departureDate: newOrder.departureDate,
            totalPrice: newOrder.totalPrice,
            notes: null,
          })
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => null);
          console.warn('[CREATE_ORDER] server endpoint failed', resp.status, text);
          // fallback: try client-side insert if Supabase anon is configured
          if (useSupabase) {
            try { await insertOrder(newOrder); } catch (e) { console.warn('[SUPABASE] fallback insertOrder failed', e); }
          }
          return;
        }

        const json = await resp.json();
        const saved = json?.data ?? null;
        if (saved) {
          // Replace optimistic order with persisted row (map DB fields to app shape)
          setOrders(prev => prev.map(o => o.id === newOrder.id ? ({
            id: saved.id ?? newOrder.id,
            customerName: saved.customer_name ?? saved.customerName ?? newOrder.customerName,
            customerPhone: saved.customer_phone ?? saved.customerPhone ?? newOrder.customerPhone,
            participants: saved.participants ?? newOrder.participants,
            destinationId: saved.destination_id ?? newOrder.destinationId,
            destinationTitle: saved.destination_title ?? newOrder.destinationTitle,
            orderDate: saved.order_date ?? newOrder.orderDate,
            departureDate: saved.departure_date ?? newOrder.departureDate,
            status: saved.status ?? newOrder.status,
            totalPrice: saved.total_price ?? newOrder.totalPrice,
          } as Order) : o));
        }
      } catch (err) {
        console.warn('[CREATE_ORDER] endpoint call failed, falling back to insertOrder', err);
        if (useSupabase) {
          try { await insertOrder(newOrder); } catch (e) { console.warn('[SUPABASE] fallback insertOrder failed', e); }
        }
      }
    })();
  };

  const handleUpdateOrderStatus = (orderId: number, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!useSupabase) return;
    (async () => {
      try {
        await updateOrder(orderId, { status });
  // debug log removed in production build
      } catch (err) {
        console.warn('[SUPABASE] failed to update order status', err);
      }
    })();
  };
  
  const handleUpdateOrderDepartureDate = (orderId: number, date: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, departureDate: date } : o));
    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!useSupabase) return;
    (async () => {
      try {
        await updateOrder(orderId, { departureDate: date });
  // debug log removed in production build
      } catch (err) {
        console.warn('[SUPABASE] failed to update departure date', err);
      }
    })();
  };

  const handleUpdateOrderParticipants = async (orderId: number, participants: number) => {
    // Find the order and destination to recalculate price
    const order = orders.find(o => o.id === orderId);
    if (!order) return Promise.reject('Order not found');
    const destination = destinations.find(d => d.id === order.destinationId);
    let totalPrice = order.totalPrice;
      if (destination) {
      const safeTiers = Array.isArray(destination.priceTiers) && destination.priceTiers.length > 0 ? destination.priceTiers : [{ price: 0, minPeople: 1 }];
      // Find best price tier for participants
      const sortedTiers = [...safeTiers].sort((a, b) => b.minPeople - a.minPeople);
      const applicableTier = sortedTiers.find(tier => participants >= tier.minPeople);
      const perPerson = applicableTier ? applicableTier.price : Math.min(...safeTiers.map(t => t.price));
      totalPrice = perPerson * participants;
    }
    // Update local state optimistically
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, participants, totalPrice } : o));

    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!useSupabase) return Promise.resolve({ ...order, participants, totalPrice });

    try {
      // Update both participants and totalPrice in Supabase
      const updated = await updateOrder(orderId, { participants, totalPrice });
  // debug log removed in production build
      if (updated) {
        setOrders(prev => prev.map(o => o.id === orderId ? (updated as unknown as any) : o));
        return updated;
      }
      return { ...order, participants, totalPrice };
    } catch (err) {
      console.warn('[SUPABASE] failed to update participants/totalPrice', err);
      return Promise.reject(err);
    }
  };


  const handleConfirmPayment = (orderId: number, paymentDetails: { paymentStatus: 'DP' | 'Lunas', paymentAmount: number, notes: string }) => {
    // Optimistically update local state to reflect payment immediately
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const newPaymentRecord = {
          amount: paymentDetails.paymentAmount,
          date: new Date().toISOString(),
          notes: paymentDetails.notes,
        };

        const existingHistory = o.paymentHistory || [];
        const updatedHistory = [...existingHistory, newPaymentRecord];

        const totalPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);

        const newPaymentStatus = totalPaid >= o.totalPrice ? 'Lunas' : 'DP';

        // Only mark 'Siap Jalan' when fully paid; otherwise keep 'Menunggu Pembayaran'
        const newStatus: OrderStatus = newPaymentStatus === 'Lunas' ? 'Siap Jalan' : 'Menunggu Pembayaran';

        return {
          ...o,
          status: newStatus,
          paymentStatus: newPaymentStatus,
          paymentHistory: updatedHistory,
        };
      }
      return o;
    }));

    const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!useSupabase) return;

    (async () => {
      try {
        // Recreate the patch similar to local update (same as Web App Lama)
        const prev = orders.find(o => o.id === orderId) ?? null;
        const newPaymentRecord = {
          amount: paymentDetails.paymentAmount,
          date: new Date().toISOString(),
          notes: paymentDetails.notes,
        };
        const existingHistory = prev?.paymentHistory || [];
        const updatedHistory = [...existingHistory, newPaymentRecord];
        const totalPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
        const newPaymentStatus = totalPaid >= (prev?.totalPrice ?? 0) ? 'Lunas' : 'DP';
        const newStatus: OrderStatus = newPaymentStatus === 'Lunas' ? 'Siap Jalan' : 'Menunggu Pembayaran';

        const updated = await updateOrder(orderId, { paymentStatus: newPaymentStatus, paymentHistory: updatedHistory, status: newStatus });
        if (updated) {
          setOrders(prev => prev.map(o => o.id === orderId ? (updated as Order) : o));
        }
      } catch (err) {
        console.warn('[SUPABASE] failed to persist payment update via updateOrder', err);
      }
    })();
  };

  const handleDeleteOrder = (orderId: number) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
      setAppSettings(newSettings);
      try { localStorage.setItem('appSettings', JSON.stringify(newSettings)); } catch {}

      const useSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!useSupabase) return;

      (async () => {
        try {
          const saved = await upsertAppSettings(newSettings);
          if (saved) {
            setAppSettings(prev => ({ ...prev, ...saved }));
            try { localStorage.setItem('appSettings', JSON.stringify(saved)); } catch {}
          }
    // debug log removed in production build
        } catch (err) {
          console.warn('[SUPABASE] failed to save app settings', err);
        }
      })();
  };


  // Route wrappers for direct URL access to details
  const DestinationDetailWrapper: React.FC = () => {
    const params = useParams();
    const slug = params.slug || '';
    const id = Number(slug.split('-')[0]);
    const dest = destinations.find(d => d.id === id || d.slug === slug) || null;
    useEffect(() => { if (dest) try { setPage && setPage('destinationDetail'); } catch {} }, [dest]);
    return dest ? <DestinationDetailPage destination={dest} setPage={setPage} onBookNow={handleBookNow} /> : <div className="page-container container"><h1>Destinasi tidak ditemukan</h1></div>;
  };

  const BlogDetailWrapper: React.FC = () => {
    const params = useParams();
    const slug = params.slug || '';
    const id = Number(slug.split('-')[0]);
    const post = blogPosts.find(p => p.id === id || p.slug === slug) || null;
    useEffect(() => { if (post) try { setPage && setPage('blogDetail'); } catch {} }, [post]);
    return post ? <BlogDetailPage post={post} setPage={setPage} /> : <div className="page-container container"><h1>Artikel tidak ditemukan</h1></div>;
  };

  // New routing using react-router while keeping legacy `setPage` for compatibility
  const renderRoutes = () => (
    <Routes>
  <Route path="/" element={<HomePage onSearch={handleSearch} onViewDetail={handleViewDetail} onBookNow={handleBookNow} onViewBlogDetail={handleViewBlogDetail} setPage={setPage} destinations={destinations} blogPosts={blogPosts} appSettings={appSettings} isLoading={homeIsLoading} />} />
  <Route path="/destinations" element={<DestinationsPage allDestinations={destinations} onViewDetail={handleViewDetail} onBookNow={handleBookNow} isLoading={homeIsLoading} />} />
  <Route path="/destinations/:slug" element={<DestinationDetailWrapper />} />
  <Route path="/blog" element={<BlogPage blogPosts={blogPosts} onViewDetail={handleViewBlogDetail} isLoading={homeIsLoading} brandName={appSettings.brandName} />} />
  <Route path="/blog/:slug" element={<BlogDetailWrapper />} />
      <Route path="/search" element={<SearchResultsPage query={searchQuery} setPage={setPage} onViewDetail={handleViewDetail} onBookNow={handleBookNow} allDestinations={destinations} />} />
      <Route path="/wishlist" element={<WishlistPage setPage={setPage} onViewDetail={handleViewDetail} onBookNow={handleBookNow} allDestinations={destinations} />} />
      <Route path="/contact" element={<ContactPage />} />
  <Route path="/admin/*" element={isAuthenticated ? (
        <Suspense fallback={<Loading message="Memuat dashboard admin..." size="large" />}>
          <AdminLayout 
            setPage={setPage}
            onLogout={handleLogout}
            onRefresh={handleRefresh}
            destinations={destinations}
            blogPosts={blogPosts}
            orders={orders}
            onSaveDestination={handleSaveDestination}
            onDeleteDestination={handleDeleteDestination}
            onSaveBlogPost={handleSaveBlogPost}
            onDeleteBlogPost={handleDeleteBlogPost}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateOrderDepartureDate={handleUpdateOrderDepartureDate}
            onUpdateOrderParticipants={handleUpdateOrderParticipants}
            onDeleteOrder={handleDeleteOrder}
            onConfirmPayment={handleConfirmPayment}
            appSettings={appSettings}
            setAppSettings={setAppSettings}
            onSaveSettings={handleSaveSettings}
          />
        </Suspense>
      ) : <AdminLoginPage onLogin={handleLogin} /> } />
  {/* Public invoice route for shareable links */}
  <Route path="/invoice/:invoiceId" element={<InvoicePage orders={orders} appSettings={appSettings} />} />
  <Route path="/invoice/token/:token" element={<InvoicePage orders={orders} appSettings={appSettings} />} />
      <Route path="*" element={<HomePage onSearch={handleSearch} onViewDetail={handleViewDetail} onBookNow={handleBookNow} onViewBlogDetail={handleViewBlogDetail} setPage={setPage} destinations={destinations} blogPosts={blogPosts} appSettings={appSettings} />} />
    </Routes>
  );
  
  const currentLocation = useLocation();
  // Hide header/footer for admin routes and public invoice pages
  const showHeaderFooter = !currentLocation.pathname.startsWith('/admin') && !currentLocation.pathname.startsWith('/invoice');

  return (
    <ToastProvider>
      <WishlistProvider>
    {showHeaderFooter && <Header setPage={setPage} appSettings={appSettings} setAppSettings={setAppSettings} isAuthenticated={isAuthenticated} />}
      <main>
        {renderRoutes()}
      </main>
      {showHeaderFooter && <Footer setPage={setPage} appSettings={appSettings} />}
  {showHeaderFooter && appSettings.whatsappNumber && currentLocation.pathname === '/' && (
          <StickyWhatsAppButton
              whatsappNumber={appSettings.whatsappNumber}
          />
      )}
  {isBookingModalOpen && selectedDestination && (
        <BookingModal 
          destination={selectedDestination} 
          onClose={() => setIsBookingModalOpen(false)}
          onCreateOrder={handleCreateOrder} 
        />
      )}
    </WishlistProvider>
    </ToastProvider>
  );
};

export default App;