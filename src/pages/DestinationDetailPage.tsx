import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Destination, Page } from '../types';
import { ClockIcon, UsersIcon, CameraIcon, MapPinIcon, CheckCircleIcon } from '../components/Icons';
import { FacilitiesList } from '../components/FacilitiesList';
import { DestinationDetailSkeleton } from '../components/DetailSkeletons';

type Tab = 'about' | 'itinerary' | 'facilities';

interface DestinationDetailPageProps {
    destination: Destination;
    setPage: (page: Page) => void;
    onBookNow: (destination: Destination) => void;
}

export const DestinationDetailPage: React.FC<DestinationDetailPageProps> = ({ destination, setPage, onBookNow }) => {
    const [activeImage, setActiveImage] = useState(destination.imageUrl);
    const [activeTab, setActiveTab] = useState<Tab>('about');
    const [isLoading, setIsLoading] = useState(true);
    // refs for tracking touch/swipe gestures
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const touchEndRef = useRef<{ x: number; y: number } | null>(null);
    
    const tiers = Array.isArray(destination.priceTiers) && destination.priceTiers.length > 0 ? destination.priceTiers : [{ price: 0 }];
    const startingPrice = Math.min(...tiers.map(t => t?.price ?? 0));
    const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(startingPrice);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // set document title for better UX / SEO when viewing a destination
    useEffect(() => {
        try {
            // If appSettings.brandName is available via global state, we'd include it; fallback to destination title only
            document.title = destination.title;
        } catch (e) {}
    }, [destination.title]);

    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 350);
        return () => clearTimeout(t);
    }, []);

    if (isLoading) return <DestinationDetailSkeleton />;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'itinerary':
                return (
                    <section className="itinerary-section">
                        <div className="itinerary-timeline">
                            {(destination.itinerary ?? []).map(item => (
                                <div key={item.day} className="itinerary-item">
                                    <div className="itinerary-day-marker">Hari {item.day}</div>
                                        <div className="itinerary-content">
                                            <h4>{item.title}</h4>
                                            {/* Render rich text from editor: sanitize before injecting as HTML */}
                                            <div className="itinerary-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.description || '') }} />
                                        </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'facilities':
                return (
                    <section className="facilities-section">
                        <FacilitiesList facilities={destination.facilities} />
                    </section>
                );
            case 'about':
            default:
                return <div className="blog-detail-content" dangerouslySetInnerHTML={{ __html: destination.longDescription }} />;
        }
    };

    return (
        <div className="page-container destination-detail-page">
            <div className="container">
                <div className="page-header-with-back">
                    <h1>{destination.title}</h1>
                </div>

                <section className="gallery-container">
                    <div className="main-image" style={{ backgroundImage: `url(${activeImage})` }}>
                        {/* The image is now a background, so this div is empty */}
                    </div>
                    <div className="thumbnail-grid">

                        {(destination.galleryImages ?? []).map((img, index) => (
                            <button 
                                key={index} 
                                className={`thumbnail ${img === activeImage ? 'active' : ''}`}
                                onClick={() => setActiveImage(img)}
                                aria-label={`Lihat gambar ${index + 1}`}
                            >
                                <img src={img} alt={`Thumbnail ${index + 1}`} loading="lazy" decoding="async" />
                            </button>
                        ))}
                    </div>
                </section>
                
                <div className="destination-content-layout">
                    <main className="destination-main-content">
                        <div className="destination-tabs">
                            <div className="tab-list" role="tablist" aria-label="Informasi Destinasi">
                                <button
                                    id="tab-about"
                                    className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('about')}
                                    role="tab"
                                    aria-selected={activeTab === 'about'}
                                    aria-controls="panel-about"
                                >
                                    <span className="tab-button-icon" aria-hidden>
                                        <CameraIcon />
                                    </span>
                                    <span className="tab-button-label">Tentang</span>
                                </button>
                                <button
                                    id="tab-itinerary"
                                    className={`tab-button ${activeTab === 'itinerary' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('itinerary')}
                                    role="tab"
                                    aria-selected={activeTab === 'itinerary'}
                                    aria-controls="panel-itinerary"
                                >
                                    <span className="tab-button-icon" aria-hidden>
                                        <MapPinIcon />
                                    </span>
                                    <span className="tab-button-label">Itinerary</span>
                                </button>
                                <button
                                    id="tab-facilities"
                                    className={`tab-button ${activeTab === 'facilities' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('facilities')}
                                    role="tab"
                                    aria-selected={activeTab === 'facilities'}
                                    aria-controls="panel-facilities"
                                >
                                    <span className="tab-button-icon" aria-hidden>
                                        <CheckCircleIcon />
                                    </span>
                                    <span className="tab-button-label">Fasilitas</span>
                                </button>
                            </div>
                        </div>
                        
                        <div
                            id={`panel-${activeTab}`}
                            className="tab-panel"
                            role="tabpanel"
                            aria-labelledby={`tab-${activeTab}`}
                            onTouchStart={(e) => {
                                const t = e.touches[0];
                                touchStartRef.current = { x: t.clientX, y: t.clientY };
                                touchEndRef.current = null;
                            }}
                            onTouchMove={(e) => {
                                const t = e.touches[0];
                                touchEndRef.current = { x: t.clientX, y: t.clientY };
                            }}
                            onTouchEnd={() => {
                                const start = touchStartRef.current;
                                const end = touchEndRef.current;
                                if (!start || !end) return;
                                const dx = end.x - start.x;
                                const dy = end.y - start.y;
                                const absDx = Math.abs(dx);
                                const absDy = Math.abs(dy);
                                const SWIPE_THRESHOLD = 50; // px
                                if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
                                    // horizontal swipe
                                    const tabs: Tab[] = ['about', 'itinerary', 'facilities'];
                                    const currentIndex = tabs.indexOf(activeTab);
                                    if (dx < 0) {
                                        // swipe left => next tab
                                        const nextIndex = Math.min(tabs.length - 1, currentIndex + 1);
                                        if (nextIndex !== currentIndex) setActiveTab(tabs[nextIndex]);
                                    } else {
                                        // swipe right => previous tab
                                        const prevIndex = Math.max(0, currentIndex - 1);
                                        if (prevIndex !== currentIndex) setActiveTab(tabs[prevIndex]);
                                    }
                                }
                                touchStartRef.current = null;
                                touchEndRef.current = null;
                            }}
                        >
                            {renderTabContent()}
                        </div>

                    </main>

                    <aside className="info-sidebar">
                        <h3>Informasi Paket</h3>
                        <div className="info-item">
                            <ClockIcon />
                            <div>
                                <span>Durasi</span>
                                <strong>{destination.duration} Hari</strong>
                            </div>
                        </div>
                        <div className="info-item">
                            <UsersIcon />
                            <div>
                                <span>Minimal Peserta</span>
                                <strong>{destination.minPeople} Orang</strong>
                            </div>
                        </div>
                    </aside>
                </div>

            </div>
            <div className="sticky-booking-bar">
                <div className="container booking-bar-content">
                    <div>
                        <span className="booking-price-label">Mulai dari</span>
                        <span className="booking-price">{formattedPrice} <span>/ org</span></span>
                    </div>
                    <button className="btn btn-primary btn-large" onClick={() => onBookNow(destination)}>Pesan</button>
                </div>
            </div>
        </div>
    );
};