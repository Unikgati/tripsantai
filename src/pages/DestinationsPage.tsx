import React, { useState, useMemo } from 'react';
import { Destination } from '../types';
import { DestinationCard } from '../components/DestinationCard';

interface AllDestinationsProps {
    allDestinations: Destination[];
    onViewDetail: (d: Destination) => void;
    onBookNow: (d: Destination) => void;
    isLoading?: boolean;
}

import DestinationSkeleton from '../components/DestinationSkeleton';

export const DestinationsPage: React.FC<AllDestinationsProps> = ({ allDestinations, onViewDetail, onBookNow, isLoading = false }) => {
    const [selectedCategory, setSelectedCategory] = useState('Semua');

    const categories = useMemo(() => {
        const allCats = allDestinations.flatMap(d => d.categories || []);
        const uniqueCats = ['Semua', ...Array.from(new Set(allCats)).sort()];
        return uniqueCats;
    }, [allDestinations]);

    const filteredDestinations = useMemo(() => {
        if (selectedCategory === 'Semua') {
            return allDestinations;
        }
        return allDestinations.filter(d => d.categories?.includes(selectedCategory));
    }, [allDestinations, selectedCategory]);

    return (
        <div className="page-container">
            <div className="container">
                <div className="page-header">
                    <h1>Semua Destinasi</h1>
                    <p>Temukan lebih banyak tempat menakjubkan untuk petualangan Anda berikutnya.</p>
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
                        {isLoading ? Array.from({ length: 6 }).map((_, i) => <DestinationSkeleton key={i} />) : filteredDestinations.map(dest => <DestinationCard key={dest.id} destination={dest} onViewDetail={onViewDetail} onBookNow={onBookNow} showCategories={false} />)}
                    </div>
                ) : (
                    <div className="no-results">
                        <p>Tidak ada destinasi yang cocok dengan kategori "{selectedCategory}".</p>
                    </div>
                )}
            </div>
        </div>
    );
};