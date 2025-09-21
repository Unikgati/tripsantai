import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Destination, BlogPost, Page, HeroSlide, AppSettings } from '../types';
import { DestinationCard } from '../components/DestinationCard';
import { BlogCard } from '../components/BlogCard';
import DestinationSkeleton from '../components/DestinationSkeleton';
import BlogSkeleton from '../components/BlogSkeleton';
import { SearchIcon } from '../components/Icons';

interface HomePageProps {
    onSearch: (query: string) => void;
    onViewDetail: (destination: Destination) => void;
    onBookNow: (destination: Destination) => void;
    onViewBlogDetail: (post: BlogPost) => void;
    setPage: (page: Page) => void;
    destinations: Destination[];
    blogPosts: BlogPost[];
    appSettings: AppSettings;
    isLoading?: boolean;
}

const Hero = ({ onSearch, slides }: { onSearch: (query: string) => void; slides: HeroSlide[] }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isFading, setIsFading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const activeSlides = slides && slides.length > 0 ? slides : [{id: 0, title: 'Selamat Datang', subtitle: 'Atur hero section dari dashboard admin.', imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop' }];


    useEffect(() => {
        if (activeSlides.length <= 1) return;
        const timer = setTimeout(() => {
            setIsFading(true);
            setTimeout(() => {
                setCurrentSlide((prevSlide) => (prevSlide + 1) % activeSlides.length);
                setIsFading(false);
            }, 500); // Corresponds to CSS transition duration
        }, 5000); // Time between slide changes

        return () => clearTimeout(timer);
    }, [currentSlide, activeSlides.length]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onSearch(searchTerm.trim());
        }
    };

    return (
        <section className="hero">
            {activeSlides.map((slide, index) => (
                <div
                    key={slide.id}
                    className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
                    style={{ backgroundImage: `url(${slide.imageUrl})` }}
                    aria-hidden={index !== currentSlide}
                ></div>
            ))}
            <div className="hero-overlay"></div>
            <div className="container hero-content">
                <div className={`hero-text-content ${isFading ? 'fade' : ''}`}>
                    <h1>{activeSlides[currentSlide].title}</h1>
                    <p>{activeSlides[currentSlide].subtitle}</p>
                </div>
                <form className="search-bar" onSubmit={handleSearchSubmit}>
                    <input 
                        type="text" 
                        placeholder="Cari destinasi, misal 'Bali'" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" aria-label="Cari">
                        <SearchIcon />
                    </button>
                </form>
            </div>
        </section>
    );
};

const PopularDestinations = ({ destinations, onViewDetail, onBookNow, isLoading }: { destinations: Destination[]; onViewDetail: (d: Destination) => void; onBookNow: (d: Destination) => void; isLoading?: boolean }) => (
    <section className="destinations-section">
        <div className="container">
            <div className="section-header">
                <h2>Destinasi Populer</h2>
                <p>Paket wisata yang paling banyak diminati oleh para petualang seperti Anda.</p>
            </div>
            <div className="destinations-grid homepage-grid">
                {isLoading ? Array.from({ length: 3 }).map((_, i) => <DestinationSkeleton key={i} />) : destinations.slice(0, 3).map(dest => <DestinationCard key={dest.id} destination={dest} onViewDetail={onViewDetail} onBookNow={onBookNow} showCategories={false} />)}
            </div>
        </div>
    </section>
);

const AllDestinationsSection = ({ destinations, onViewDetail, onBookNow, setPage }: { destinations: Destination[]; onViewDetail: (d: Destination) => void; onBookNow: (d: Destination) => void; setPage: (page: Page) => void; }) => {
    const [selectedCategory, setSelectedCategory] = useState('Semua');
    const navigate = useNavigate();

    const categories = useMemo(() => {
        const allCats = destinations.flatMap(d => d.categories || []);
        const uniqueCats = ['Semua', ...Array.from(new Set(allCats)).sort()];
        return uniqueCats;
    }, [destinations]);

    const filteredDestinations = useMemo(() => {
        if (selectedCategory === 'Semua') {
            return destinations;
        }
        return destinations.filter(d => d.categories?.includes(selectedCategory));
    }, [destinations, selectedCategory]);

    return (
        <section className="destinations-section" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="container">
                <div className="section-header">
                    <h2>Jelajahi Semua Destinasi</h2>
                    <p>Dari pegunungan hingga lautan, temukan petualangan yang menanti Anda.</p>
                </div>

                {categories.length > 1 && (
                    <div className="category-filter-list">
                        {categories.map(cat => (
                            <button 
                                key={cat}
                                className={`category-filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}
                
                {filteredDestinations.length > 0 ? (
                    <div className="destinations-grid homepage-grid">
                        {filteredDestinations.slice(0, 6).map(dest => <DestinationCard key={dest.id} destination={dest} onViewDetail={onViewDetail} onBookNow={onBookNow} showCategories={false} />)}
                    </div>
                ) : (
                    <div className="no-results" style={{ padding: '1rem 0' }}>
                        <p>Tidak ada destinasi yang cocok dengan kategori "{selectedCategory}".</p>
                    </div>
                )}
                
                {destinations.length > 6 && (
                    <div className="section-footer">
                        <button className="btn btn-primary" onClick={() => { navigate('/destinations'); try { setPage && setPage('destinations'); } catch {} }}>Lihat Semua Destinasi</button>
                    </div>
                )}
            </div>
        </section>
    );
};


const BlogSection = ({ blogPosts, setPage, onViewDetail, isLoading }: { blogPosts: BlogPost[], setPage: (page: Page) => void, onViewDetail: (post: BlogPost) => void, isLoading?: boolean }) => {
    const navigate = useNavigate();
    return (
    <section className="blog-section">
        <div className="container">
            <div className="section-header">
                <h2>Blog & Berita Terbaru</h2>
                <p>Dapatkan inspirasi, tips, dan berita terbaru dari dunia traveling.</p>
            </div>
            <div className="blog-grid homepage-blog-grid">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <BlogSkeleton key={i} />)
                ) : (blogPosts && blogPosts.length > 0 ? (
                    blogPosts.slice(0, 4).map(post => <BlogCard key={post.id} post={post} onViewDetail={onViewDetail} />)
                ) : (
                    <div className="no-results" style={{ padding: '1rem 0' }}>
                        <p>Belum ada artikel. Tambahkan artikel dari dashboard admin.</p>
                    </div>
                ))}
            </div>
            <div className="section-footer">
                <button className="btn btn-primary" onClick={() => { navigate('/blog'); try { setPage && setPage('blog'); } catch {} }}>Lihat Semua Artikel</button>
            </div>
        </div>
    </section>
    );
}

export const HomePage: React.FC<HomePageProps> = ({ onSearch, onViewDetail, onBookNow, onViewBlogDetail, setPage, destinations, blogPosts, appSettings, isLoading = false }) => {
    return (
        <>
            <Hero onSearch={onSearch} slides={appSettings.heroSlides} />
            <PopularDestinations destinations={destinations} onViewDetail={onViewDetail} onBookNow={onBookNow} isLoading={isLoading} />
            <AllDestinationsSection 
                destinations={destinations} 
                onViewDetail={onViewDetail} 
                onBookNow={onBookNow}
                setPage={setPage}
            />
            <BlogSection blogPosts={blogPosts} setPage={setPage} onViewDetail={onViewBlogDetail} isLoading={isLoading} />
        </>
    );
};
