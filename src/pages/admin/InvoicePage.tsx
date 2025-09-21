import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Order } from '../../types';
import Loading from '../../components/Loading';
import { fetchInvoiceById, fetchOrderById, fetchInvoiceByToken } from '../../lib/supabase';

interface InvoicePageProps {
    orders?: Order[];
    appSettings?: any;
}

export const InvoicePage: React.FC<InvoicePageProps> = ({ orders = [], appSettings }) => {
    const params = useParams();
    const navigate = useNavigate();
    const invoiceIdParam = params.invoiceId;
    const invoiceTokenParam = (params as any).token;
    const orderIdParam = params.orderId || params.id;

    const invoiceId = invoiceIdParam ? Number(invoiceIdParam) : NaN;
    const orderId = orderIdParam ? Number(orderIdParam) : NaN;
    const invoiceToken = invoiceTokenParam || null;

    const [invoiceRecord, setInvoiceRecord] = useState<any | null>(null);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            // If token present, prefer fetching by token (public link)
            if (invoiceToken) {
                const inv = await fetchInvoiceByToken(String(invoiceToken));
                if (!mounted) return;
                if (inv) {
                    setInvoiceRecord(inv);
                    const ord = await fetchOrderById(inv.order_id);
                    if (!mounted) return;
                    if (ord) setOrder(ord as Order);
                }
                setLoading(false);
                return;
            }

            // If invoiceId present, try to load invoice row from Supabase
            if (!Number.isNaN(invoiceId)) {
                const inv = await fetchInvoiceById(invoiceId);
                if (!mounted) return;
                if (inv) {
                    setInvoiceRecord(inv);
                    // Try to fetch the order referenced by invoice
                    const ord = await fetchOrderById(inv.order_id);
                    if (!mounted) return;
                    if (ord) setOrder(ord as Order);
                } else {
                    // If no invoice row, try to fetch order by the invoiceId (backwards compatible)
                    const ord = orders.find(o => o.id === invoiceId) || await fetchOrderById(invoiceId);
                    if (!mounted) return;
                    if (ord) setOrder(ord as Order);
                }
                setLoading(false);
                return;
            }

            // If orderId present, prefer that
            if (!Number.isNaN(orderId)) {
                const ord = orders.find(o => o.id === orderId) || await fetchOrderById(orderId);
                if (!mounted) return;
                if (ord) setOrder(ord as Order);
                setLoading(false);
                return;
            }

            setLoading(false);
        })();

        return () => { mounted = false; };
    }, [invoiceId, orderId, orders]);

    useEffect(() => {
        if (!loading && !order) {
            const t = setTimeout(() => navigate('/admin/orders'), 1200);
            return () => clearTimeout(t);
        }
    }, [loading, order, navigate]);

    if (loading) {
        return (
            <div className="page-container container">
                <Loading message="Memuat invoice..." size="large" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="page-container container">
                <h1>Invoice tidak ditemukan</h1>
                <p>Pesanan atau invoice tersebut tidak tersedia.</p>
            </div>
        );
    }

    const formattedDate = new Date(order.orderDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const totalFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.totalPrice);

    const handlePrint = () => window.print();

    return (
        <div className="invoice-page page-container container" style={{ paddingTop: 24, paddingBottom: 48 }}>

            <div className="invoice-sheet invoice-light" style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid var(--border-color)', maxWidth: 960, margin: '0 auto' }}>
                <header className="invoice-kop invoice-kop--grid" style={{ marginBottom: 16 }}>
                    <div className="invoice-kop-left" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {appSettings?.logoLightUrl || appSettings?.logoDarkUrl ? (
                                <img src={appSettings.logoLightUrl || appSettings.logoDarkUrl} alt={`${appSettings.brandName || 'Brand'} logo`} className="invoice-logo" />
                            ) : (
                                <div className="invoice-logo-fallback" style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent)' }}>
                                    {order.destinationTitle?.slice(0,2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* brand-name removed as requested */}

                        {appSettings?.address ? (
                            <div className="invoice-address" style={{ color: 'var(--text-secondary)' }}>{appSettings.address}</div>
                        ) : null}
                    </div>

                    <div className="invoice-kop-right" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <div className="invoice-number" style={{ fontWeight: 700 }}>#{order.id}</div>
                        <div className="invoice-customer" style={{ textAlign: 'right' }}>
                            <div className="customer-name" style={{ fontWeight: 700 }}>{order.customerName}</div>
                            <div className="customer-phone" style={{ color: 'var(--text-secondary)' }}>{order.customerPhone}</div>
                            <div className="invoice-date" style={{ color: 'var(--text-secondary)' }}>{formattedDate}</div>
                        </div>
                    </div>
                </header>

                <section style={{ marginBottom: 16 }}>
                    <table className="invoice-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>Deskripsi</th>
                                <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>Qty</th>
                                <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>Harga</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '12px 0' }}>{order.destinationTitle} - Paket</td>
                                <td style={{ textAlign: 'right' }}>{order.participants}</td>
                                <td style={{ textAlign: 'right' }}>{totalFormatted}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <footer style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-secondary)' }}>Total</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent)' }}>{totalFormatted}</div>
                    </div>
                </footer>
            </div>

            {/* Sticky action buttons (hidden in print) - removed Back button per request */}
            <div className="invoice-sticky-actions">
                <button className="btn-primary btn" onClick={handlePrint}>Print / Save PDF</button>
            </div>
        </div>
    );
};

export default InvoicePage;
