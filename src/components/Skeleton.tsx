
import React from 'react';

export const SkeletonCard = () => {
    return (
        <div style={{ 
            background: '#111', 
            borderRadius: '20px', 
            aspectRatio: '3/4', 
            overflow: 'hidden', 
            position: 'relative',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
        }}>
            {/* Image Placeholder */}
            <div className="skeleton" style={{ width: '100%', height: '100%' }} />
            
            {/* Content Placeholder */}
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 10 }}>
                <div className="skeleton" style={{ width: '70%', height: '24px', marginBottom: '12px', borderRadius: '4px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="skeleton" style={{ width: '60px', height: '16px', borderRadius: '4px' }} />
                    <div className="skeleton" style={{ width: '40px', height: '16px', borderRadius: '4px' }} />
                </div>
            </div>
            
            {/* Gradient Overlay Placeholder */}
             <div style={{ 
                position: 'absolute', inset: 0, 
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)',
                zIndex: 1
            }}></div>
        </div>
    );
};

export const SkeletonList = ({ count = 6, isMobile = false }) => {
    return (
        <div style={{ 
             display: 'grid', 
             gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', 
             gap: isMobile ? '10px' : '30px',
             width: '100%'
        }}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
};
