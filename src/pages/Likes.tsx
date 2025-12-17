import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, ExternalLink, ArrowLeft, X, Lock } from 'lucide-react';
import { SkeletonList } from '../components/Skeleton';

interface LikeUser {
    username: string;
    avatar: string;
    photos: string[];
    location?: { city: string };
    details?: {
        gender?: string;
        relationshipGoal?: string;
        smoking?: string;
        hobbies?: string[];
    };
}

const Likes = () => {
    const [likedUsers, setLikedUsers] = useState<LikeUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isMember, setIsMember] = useState(false); // Track if user is VIP
    const [activeTab, setActiveTab] = useState<'my-likes' | 'liked-me'>('my-likes');

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Check membership status
    useEffect(() => {
        const checkMembership = async () => {
            const token = localStorage.getItem('vault_token');
            if (!token) return;
            
            try {
                const res = await fetch('/api/auth/me', {
                    headers: { 'Authorization': token }
                });
                const data = await res.json();
                if (data.success && data.user) {
                    setIsMember(data.user.isMember || false);
                }
            } catch (err) {
                console.error('Membership check error:', err);
            }
        };
        checkMembership();
    }, []);

    useEffect(() => {
        const fetchLikes = async () => {
            setIsLoading(true);
            const token = localStorage.getItem('vault_token');
            
            // Only use backup for 'my-likes'
            let initialUsers: LikeUser[] = [];
            if (activeTab === 'my-likes') {
                const localBackupStr = localStorage.getItem('vault_likes_backup');
                if (localBackupStr) initialUsers = JSON.parse(localBackupStr);
            }
            // For 'liked-me', we don't have a backup yet, start empty (or could add one)

            setLikedUsers(initialUsers);

            if (token) {
                try {
                    const endpoint = activeTab === 'my-likes' ? '/api/users/my-likes' : '/api/users/liked-me';
                    const res = await fetch(endpoint, {
                        headers: { 'Authorization': token }
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        setLikedUsers(data.users);
                        // Update backup if my-likes
                        if (activeTab === 'my-likes') {
                            localStorage.setItem('vault_likes_backup', JSON.stringify(data.users));
                        }
                    }
                } catch (err) {
                    console.error("API Fetch Error:", err);
                }
            }
            setIsLoading(false);
        };

        fetchLikes();
    }, [activeTab]);

    const handleUnlike = async (username: string) => {
        if (activeTab !== 'my-likes') return;

        // Optimistic UI Update
        setLikedUsers(prev => prev.filter(u => u.username !== username));

        // Update Local Backup
        const localBackup = JSON.parse(localStorage.getItem('vault_likes_backup') || '[]');
        const updatedBackup = localBackup.filter((u: LikeUser) => u.username !== username);
        localStorage.setItem('vault_likes_backup', JSON.stringify(updatedBackup));

        // API Call
        const token = localStorage.getItem('vault_token');
        if (!token) return;

        try {
            await fetch(`/api/users/unlike/${username}`, {
                method: 'POST',
                headers: { 'Authorization': token }
            });
        } catch (err) {
            console.error(err);
        }
    };



    return (
        <div style={{ 
            minHeight: '100vh', 
            background: '#050505', 
            color: '#fff', 
            padding: isMobile ? '100px 10px 80px 10px' : '100px 40px 40px 40px', 
            fontFamily: "'Inter', sans-serif" 
        }}>
            
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                    maxWidth: '1400px', 
                    margin: '0 auto 2rem auto', 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '1.5rem'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ 
                            fontSize: isMobile ? '2.2rem' : '2.5rem', 
                            fontFamily: "'Outfit', sans-serif", 
                            fontWeight: 700,
                            letterSpacing: '1px',
                            background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%)', 
                            WebkitBackgroundClip: 'text', 
                            WebkitTextFillColor: 'transparent', 
                            margin: 0,
                            filter: 'drop-shadow(0 0 20px rgba(212, 175, 55, 0.3))'
                        }}>
                            Beğeni Sayfası
                        </h1>
                        <p style={{ color: '#666', marginTop: '0.5rem', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>
                            {activeTab === 'my-likes' 
                                ? `Koleksiyonunuzdaki ${likedUsers.length} özel profil.` 
                                : `Sizi beğenen ${likedUsers.length} kişi.`}
                        </p>
                    </div>
                    
                    <Link to="/home" style={{ 
                        textDecoration: 'none', color: '#D4AF37', 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        padding: '10px 20px', borderRadius: '50px', 
                        border: '1px solid rgba(212, 175, 55, 0.3)', background: 'rgba(212, 175, 55, 0.05)',
                        fontSize: '0.9rem', transition: 'all 0.3s'
                    }}>
                        <ArrowLeft size={18} /> <span>Keşfet</span>
                    </Link>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #222', paddingBottom: '0.5rem' }}>
                    <button 
                        onClick={() => setActiveTab('my-likes')}
                        style={{
                            background: 'none', border: 'none',
                            color: activeTab === 'my-likes' ? 'var(--gold-primary)' : '#666',
                            fontSize: '1.1rem', fontWeight: activeTab === 'my-likes' ? 600 : 400,
                            padding: '10px 20px', cursor: 'pointer',
                            borderBottom: activeTab === 'my-likes' ? '2px solid var(--gold-primary)' : '2px solid transparent',
                            transition: 'all 0.3s'
                        }}
                    >
                        Beğendiklerim
                    </button>
                    <button 
                        onClick={() => setActiveTab('liked-me')}
                        style={{
                            background: 'none', border: 'none',
                            color: activeTab === 'liked-me' ? 'var(--gold-primary)' : '#666',
                            fontSize: '1.1rem', fontWeight: activeTab === 'liked-me' ? 600 : 400,
                            padding: '10px 20px', cursor: 'pointer',
                            borderBottom: activeTab === 'liked-me' ? '2px solid var(--gold-primary)' : '2px solid transparent',
                            transition: 'all 0.3s'
                        }}
                    >
                        Beni Beğenenler
                    </button>
                </div>

            </motion.div>

            {/* Content Grid */}
            <AnimatePresence mode="wait">
                {isLoading && likedUsers.length === 0 ? (
                    <motion.div
                        key="skeleton"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <SkeletonList count={8} isMobile={isMobile} />
                    </motion.div>
                ) : likedUsers.length === 0 ? (
                    <motion.div 
                        key={`${activeTab}-empty`}
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ textAlign: 'center', marginTop: '10vh', color: '#444' }}
                    >
                        <Heart size={80} strokeWidth={1} style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
                        <h2 style={{ color: '#fff', fontSize: '2rem', marginBottom: '1rem', fontFamily: "'Playfair Display', serif" }}>
                            {activeTab === 'my-likes' ? 'Henüz Beğeniniz Yok' : 'Henüz Beğeni Almadınız'}
                        </h2>
                        <p style={{ fontSize: '1.1rem', marginBottom: '2.5rem', maxWidth: '400px', margin: '0 auto 2.5rem auto', lineHeight: '1.6', color: '#666' }}>
                            {activeTab === 'my-likes' 
                                ? 'Keşfet bölümünde beğendiğiniz profiller burada sergilenir.' 
                                : 'Profiliniz dikkat çekmeye başladığında sizi beğenenler burada görünecek.'}
                        </p>
                        {activeTab === 'my-likes' && (
                            <Link to="/home" style={{ background: 'var(--gold-primary)', color: '#000', padding: '16px 48px', borderRadius: '50px', textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.5px' }}>
                                Keşfete Başla
                            </Link>
                        )}
                    </motion.div>
                ) : (
                    <motion.div 
                        key={`${activeTab}-grid`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ 
                            display: 'grid', 
                            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', 
                            gap: isMobile ? '10px' : '30px', 
                            maxWidth: '1400px', margin: '0 auto' 
                        }}
                    >
                        {likedUsers.map((user, index) => {
                            const isBlurred = activeTab === 'liked-me' && !isMember;

                            return (
                                <motion.div
                                    key={user.username}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05, duration: 0.4 }}
                                    style={{ 
                                        background: '#111', borderRadius: '20px', 
                                        position: 'relative', overflow: 'hidden',
                                        aspectRatio: '3/4', // Fixed aspect ratio for gallery feel
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    {/* Full Height Image */}
                                    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                                        <img 
                                            src={user.photos && user.photos.length > 0 ? user.photos[0] : (user.avatar || 'https://via.placeholder.com/400x500')} 
                                            alt={user.username} 
                                            style={{ 
                                                width: '100%', height: '100%', objectFit: 'cover', 
                                                transition: 'transform 0.5s',
                                                filter: isBlurred ? 'blur(15px)' : 'none',
                                                transform: isBlurred ? 'scale(1.2)' : 'none'
                                            }}
                                            className="hover-zoom"
                                        />
                                        {isBlurred && (
                                            <div style={{
                                                position: 'absolute', inset: 0,
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                zIndex: 10, background: 'rgba(0,0,0,0.2)'
                                            }}>
                                                <div style={{ 
                                                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', 
                                                    padding: '1rem', borderRadius: '50%',
                                                    border: '1px solid rgba(255,215,0,0.5)',
                                                    marginBottom: '0.5rem', boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                                                }}>
                                                    <Lock size={24} color="#FFD700" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Dark Gradient Overlay */}
                                    <div style={{ 
                                        position: 'absolute', inset: 0, 
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, transparent 100%)',
                                        zIndex: 11
                                    }}></div>
                                    
                                    {/* Content Overlay */}
                                    <div style={{ 
                                        position: 'absolute', bottom: 0, left: 0, right: 0, 
                                        padding: '1.5rem', zIndex: 12
                                    }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.5rem', fontFamily: "'Playfair Display', serif", textTransform: 'capitalize' }}>
                                            {user.username.replace(/_/g, ' ')}
                                        </h3>
                                        
                                        {/* Quick Stats/Tags */}
                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', opacity: 0.8, flexWrap: 'wrap' }}>
                                            {user.location?.city && <span style={{ fontSize: '0.8rem', color: '#eee' }}>📍 {user.location.city}</span>}
                                            {user.details?.gender && <span style={{ fontSize: '0.8rem', color: '#ccc' }}>• {user.details.gender}</span>}
                                            {user.details?.relationshipGoal && <span style={{ fontSize: '0.8rem', color: 'var(--gold-primary)' }}>• {user.details.relationshipGoal.split(' ')[0]}</span>}
                                        </div>

                                        {/* Action Bar */}
                                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                                            {/* VIP Only: Message Button - Available in BOTH tabs if VIP */}
                                            {isMember && (
                                                <Link to={`/chat?user=${user.username}`} style={{ 
                                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
                                                    padding: '12px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
                                                    color: '#fff', textDecoration: 'none', borderRadius: '12px', 
                                                    fontWeight: 500, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.1)' 
                                                }}>
                                                    <MessageCircle size={18} /> <span style={{display: isMobile ? 'none' : 'inline'}}>Mesaj</span>
                                                </Link>
                                            )}
                                            
                                            {/* Profile Button - Always available */}
                                            <Link to={`/profile/${user.username}`} style={{ 
                                                width: isMember ? '45px' : '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                background: activeTab === 'my-likes' ? 'rgba(255,255,255,0.1)' : 'var(--gold-primary)', 
                                                backdropFilter: 'blur(10px)',
                                                color: activeTab === 'my-likes' ? '#fff' : '#000', 
                                                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                                                padding: isMember ? '0' : '12px',
                                                textDecoration: 'none', gap: '0.5rem', fontWeight: 600
                                            }}>
                                                {activeTab === 'my-likes' 
                                                    ? <ExternalLink size={20} /> 
                                                    : (
                                                        // For 'liked-me', main action is viewing profile to decide
                                                        <>
                                                            {!isMember && <span>Profili Gör</span>}
                                                            {isMember && <ExternalLink size={20} />}
                                                        </>
                                                    )
                                                }
                                            </Link>

                                            {/* Unlike Button - Only for 'my-likes' */}
                                            {activeTab === 'my-likes' && (
                                                <button onClick={(e) => { e.preventDefault(); handleUnlike(user.username); }} style={{ 
                                                    width: isMember ? '45px' : 'auto', 
                                                    flex: isMember ? 'none' : 1,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                    gap: isMember ? '0' : '0.5rem',
                                                    background: 'rgba(255,50,50,0.15)', backdropFilter: 'blur(10px)',
                                                    color: '#ff4444', borderRadius: '12px', border: '1px solid rgba(255,50,50,0.2)',
                                                    cursor: 'pointer', padding: isMember ? '0' : '12px'
                                                }}>
                                                    <X size={20} />
                                                    {!isMember && <span style={{ fontSize: '0.9rem' }}>Kaldır</span>}
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Info for Verified (non-VIP) users - Only in liked-me, maybe? Or both. */}
                                        {!isMember && activeTab === 'liked-me' && (
                                            <p style={{ 
                                                fontSize: '0.75rem', color: '#666', marginTop: '0.8rem', 
                                                textAlign: 'center', lineHeight: '1.4'
                                            }}>
                                                💎 VIP üye olarak bu fotoğrafları net görebilirsiniz.
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Likes;
