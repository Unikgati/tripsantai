import React from 'react';

const ReviewCard: React.FC<{ name: string; initials: string; content: string; created_at?: string; rating?: number }> = ({ name, initials, content, created_at, rating = 5 }) => {
  return (
    <article className="review-card" style={{ borderRadius: 12, padding: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }} aria-hidden>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
            <strong style={{ fontSize: '1rem' }}>{name}</strong>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4 }} aria-hidden>
                { [1,2,3,4,5].map(i => (
                  <span key={i} style={{ color: i <= rating ? 'var(--accent)' : 'var(--text-secondary)' }}>{i <= rating ? '★' : '☆'}</span>
                )) }
              </div>
              {created_at && <small style={{ color: 'var(--text-secondary)' }}>{new Date(created_at).toLocaleDateString()}</small>}
            </div>
          </div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>{content}</p>
        </div>
      </div>
    </article>
  );
};

export default ReviewCard;
