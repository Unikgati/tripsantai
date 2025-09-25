import React, { useState, useEffect } from 'react';
import { fetchReviews, insertReview } from '../lib/supabase';
import ReviewCard from '../components/ReviewCard';

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchReviews();
        if (!mounted) return;
        setReviews(data || []);
      } catch (e) {
        console.warn('Failed to fetch reviews', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const initialsFrom = (full: string) => {
    if (!full) return '';
    const parts = full.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !content.trim()) { setError('Nama dan review tidak boleh kosong'); return; }
    setIsSubmitting(true);
    try {
      const initials = initialsFrom(name);
      const row = await insertReview({ name: name.trim(), initials, content: content.trim(), rating });
      setReviews(prev => [row, ...prev]);
      setName(''); setContent('');
      setRating(5);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Gagal menyimpan review');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Ulasan Pengunjung</h1>
        <p>Berikan pengalamanmu agar membantu pengunjung lain.</p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div className="container">
          <div className="admin-card reviews-form-card">
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="review-name">Nama</label>
              <input
                id="review-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nama Anda"
                aria-label="Nama"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="review-content">Ulasan</label>
              <textarea
                id="review-content"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Tulis review Anda di sini"
                aria-label="Review"
                rows={4}
                required
              />
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nilai:</div>
                  <div aria-hidden style={{ display: 'flex', gap: 6 }}>
                    { [1,2,3,4,5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRating(i)}
                        className={`btn ${rating >= i ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 8px', borderRadius: 6 }}
                        aria-label={`Rate ${i} stars`}
                      >{i <= rating ? '★' : '☆'}</button>
                    )) }
                  </div>
                </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                {error ? <div className="validation-error">{error}</div> : <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{content.length}/1000</div>}
                <div />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Mengirim...' : 'Kirim Ulasan'}</button>
            </div>
          </form>
          </div>
        </div>

        <section style={{ maxWidth: 1024, margin: '0 auto', display: 'grid', gap: '1rem' }}>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Belum ada ulasan. Jadilah yang pertama!</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
              {reviews.map(r => (
                <ReviewCard key={r.id} name={r.name} initials={r.initials} content={r.content} created_at={r.created_at} rating={r.rating} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReviewsPage;
