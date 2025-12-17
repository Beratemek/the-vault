import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Lock, X, Heart, MessageCircle, Crown } from 'lucide-react'
import { Link } from 'react-router-dom'

interface SearchResult {
    _id: string;
    username: string;
    fullName: string;
    avatar: string;
    bio: string;
}

interface GalleryItem {
    username: string;
    photo: string;
    avatar?: string;
    location?: { city: string };
    details?: {
        gender?: string;
        relationshipGoal?: string;
        smoking?: string;
        hobbies?: string[];
    };
}

interface VipUser {
    username: string;
    fullName?: string;
    avatar?: string;
    photos?: string[];
    location?: { city: string };
    details?: {
        gender?: string;
        relationshipGoal?: string;
    };
}

const Home = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryItem[]>([]);
  const [matchUser, setMatchUser] = useState<GalleryItem | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [vipUsers, setVipUsers] = useState<VipUser[]>([]);
  
  // User has access if they are VIP (isMember) OR verified
  const hasAccess = isMember || isVerified;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      const checkMembership = async () => {
          const token = localStorage.getItem('vault_token');
          if (!token) {
              window.location.href = '/login';
              return;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          try {
              const res = await fetch('/api/auth/me', {
                  headers: { 'Authorization': token },
                  signal: controller.signal
              });
              clearTimeout(timeoutId);
              
              if (!res.ok) throw new Error('Auth failed');

              const data = await res.json();
              if (data.success && data.user) {
                  setIsMember(data.user.isMember);
                  setIsVerified(data.user.isVerified);
                  fetchGallery(); // Fetch initial stack
                  fetchVipUsers(); // Fetch VIP members
              }
          } catch (error) {
              console.error("Auth error:", error);
          } finally {
              setIsLoading(false);
          }
      };
      checkMembership();
  }, []);

  const fetchGallery = async () => {
      const token = localStorage.getItem('vault_token');
      try {
          // Send auth token to exclude seen users
          const res = await fetch('/api/users/photos/random', {
              headers: token ? { 'Authorization': token } : {}
          });
          const data = await res.json();
          if (data.success) {
              setGalleryPhotos(prev => [...prev, ...data.photos]);
          }
      } catch (err) { console.error(err); }
  };

  const fetchVipUsers = async () => {
      try {
          const res = await fetch('/api/users/vip');
          const data = await res.json();
          if (data.success) {
              setVipUsers(data.users || []);
          }
      } catch (err) { console.error('VIP users fetch error:', err); }
  };

  // Search debounce effect
  useEffect(() => {
    if (query.trim()) {
      const timer = setTimeout(() => {
        performSearch();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
        const response = await fetch(`/api/users/search?q=${query}`);
        const data = await response.json();
        if (data.success) {
            setResults(data.users);
        }
    } catch (err) {
        console.error('Search error:', err);
    } finally {
        setIsSearching(false);
    }
  };

  const handleSwipe = async (action: 'like' | 'pass') => {
      const currentItem = galleryPhotos[0];
      if (!currentItem) return;

      // Optimistically remove card
      setGalleryPhotos(prev => prev.slice(1));
      
      // If running low, fetch more
      if (galleryPhotos.length < 3) fetchGallery();

      // BACKUP TO LOCAL STORAGE (Reliability Layer)
      if (action === 'like') {
           try {
               const localBackup = JSON.parse(localStorage.getItem('vault_likes_backup') || '[]');
               if (!localBackup.find((u:any) => u.username === currentItem.username)) {
                   // Ensure we save enough data for the card
                   localBackup.push({
                       username: currentItem.username,
                       photo: currentItem.photo, // Map single photo
                       photos: [currentItem.photo], // Map array for Likes page
                       avatar: currentItem.avatar,
                       details: currentItem.details
                   });
                   localStorage.setItem('vault_likes_backup', JSON.stringify(localBackup));
               }
           } catch(e) { console.error('Backup error', e); }
      }

      const token = localStorage.getItem('vault_token');
      if (!token) return;

      try {
          console.log(`[SWIPE] Action: ${action}, User: ${currentItem.username}`);
          const endpoint = action === 'like' ? 'like' : 'pass';
          const res = await fetch(`/api/users/${endpoint}/${currentItem.username}`, {
              method: 'POST',
              headers: { 'Authorization': token }
          });
          console.log(`[SWIPE] Response Status: ${res.status}`);
          const data = await res.json();
          
          if (!data.success) {
              alert(`HATA: Beğeni kaydedilemedi! \nServer: ${data.error}`);
              setGalleryPhotos(prev => [currentItem, ...prev]); // Rollback
          } else {
              if (action === 'like' && data.match) {
                  setMatchUser(currentItem);
              }
          }
      } catch (err) {
          console.error(err);
          alert("Bağlantı Hatası! Lütfen tekrar deneyin.");
          setGalleryPhotos(prev => [currentItem, ...prev]); // Rollback
      }
  };

  const handleReset = async () => {
      const token = localStorage.getItem('vault_token');
      if (!token) return;
      try {
          await fetch('/api/users/discover/reset', {
              method: 'POST',
              headers: { 'Authorization': token }
          });
          setGalleryPhotos([]);
          fetchGallery();
      } catch (err) { console.error(err); }
  };

  if (isLoading) {
      return (
          <div style={{ 
              height: '100vh', width: '100%', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              background: '#000', color: 'var(--gold-primary)' 
          }}>
              <h2 style={{ animation: 'pulse 2s infinite' }}>Yükleniyor...</h2>
          </div>
      );
  }

  return (
    <div className="home-page-container">
      
      {/* MATCH MODAL */}
      {matchUser && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
            <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ textAlign: 'center' }}
            >
                <h1 style={{ fontSize: '4rem', fontFamily: 'serif', fontStyle: 'italic', color: 'var(--gold-primary)', marginBottom: '1rem', textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}>
                    Eşleşme!
                </h1>
                <p style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '2rem' }}>
                    @{matchUser.username} ile eşleştiniz.
                </p>
                
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'center', marginBottom: '2rem' }}>
                     <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--gold-primary)' }}>
                          <img src={matchUser.avatar || matchUser.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button 
                         onClick={() => setMatchUser(null)}
                         className="btn-secondary"
                         style={{ padding: '1rem 2rem' }}
                    >
                        Devam Et
                    </button>
                    <Link 
                         to={`/chat?user=${matchUser.username}`}
                         className="btn-primary"
                         style={{ padding: '1rem 2rem', textDecoration: 'none' }}
                    >
                         Mesaj Gönder
                    </Link>
                </div>
            </motion.div>
        </div>
      )}

      {/* ACCESS WALL - Show if NOT isMember AND NOT isVerified */}
       {!hasAccess && (
          <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 50,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
              padding: '2rem', textAlign: 'center'
          }}>
              <Lock size={64} color="var(--gold-primary)" style={{ marginBottom: '1.5rem' }} />
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#fff' }}>Erişim Kısıtlı</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>
                  Keşfet bölümüne erişmek için VIP üye olun veya hesabınızı doğrulayın.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                  <Link to="/join/member" className="btn-primary">
                      VIP Ol
                  </Link>
                  <Link to="/join/apply" className="btn-secondary">
                      Doğrula
                  </Link>
              </div>
          </div>
      )}

      <div className="container" style={{ 
          maxWidth: isMobile ? '450px' : '1100px', 
          width: '100%', flex: 1, display: 'flex', flexDirection: 'column',
          filter: !hasAccess ? 'blur(15px)' : 'none',
          pointerEvents: !hasAccess ? 'none' : 'auto',
          userSelect: 'none',
          padding: isMobile ? '0 1rem' : '2rem',
          margin: '0 auto'
      }}>

        {/* VIP MEMBERS SECTION - Premium Design */}
        {vipUsers.length > 0 && (
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ 
                    marginBottom: '2rem', 
                    marginTop: isMobile ? '1rem' : '0',
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(0, 0, 0, 0.4) 100%)',
                    borderRadius: '24px',
                    padding: isMobile ? '1.2rem' : '1.5rem',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    boxShadow: '0 8px 32px rgba(212, 175, 55, 0.1)'
                }}
            >
                {/* Section Header */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '1.2rem',
                    flexWrap: 'wrap',
                    gap: '0.8rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, var(--gold-primary) 0%, #b8860b 100%)',
                            borderRadius: '12px',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
                        }}>
                            <Crown size={22} color="#000" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 style={{ 
                                fontSize: isMobile ? '1.2rem' : '1.4rem', 
                                fontWeight: 800, 
                                background: 'linear-gradient(135deg, var(--gold-primary) 0%, #fff 50%, var(--gold-primary) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                margin: 0,
                                fontFamily: "'Outfit', sans-serif",
                                letterSpacing: '0.5px'
                            }}>
                                VIP Üyelerimiz
                            </h3>
                            <p style={{ 
                                margin: '0.2rem 0 0 0', 
                                fontSize: '0.75rem', 
                                color: 'rgba(212, 175, 55, 0.7)',
                                fontWeight: 500
                            }}>
                                Özel ayrıcalıklara sahip üyeler
                            </p>
                        </div>
                    </div>
                    
                    {/* VIP Hesapları Gör Button */}
                    <Link 
                        to="/vip-members"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: isMobile ? '0.6rem 1rem' : '0.7rem 1.2rem',
                            background: 'linear-gradient(135deg, var(--gold-primary) 0%, #b8860b 100%)',
                            borderRadius: '12px',
                            color: '#000',
                            fontWeight: 700,
                            fontSize: isMobile ? '0.8rem' : '0.85rem',
                            textDecoration: 'none',
                            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                            transition: 'all 0.3s ease',
                            fontFamily: "'Outfit', sans-serif"
                        }}
                    >
                        <span>VIP Hesapları Gör</span>
                        <Crown size={16} />
                    </Link>
                </div>

                {/* Horizontal Scroll - VIP Cards */}
                <div style={{ 
                    display: 'flex', 
                    gap: isMobile ? '0.8rem' : '1rem', 
                    overflowX: 'auto', 
                    paddingBottom: '0.5rem',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}>
                    {vipUsers.slice(0, 6).map((vip, index) => (
                        <Link 
                            to={`/profile/${vip.username}`} 
                            key={vip.username}
                            style={{ textDecoration: 'none' }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: index * 0.08, duration: 0.4 }}
                                style={{
                                    minWidth: isMobile ? '130px' : '150px',
                                    background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
                                    borderRadius: '18px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(212, 175, 55, 0.4)',
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.4), 0 0 20px rgba(212, 175, 55, 0.1)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                whileHover={{ 
                                    scale: 1.05, 
                                    y: -8,
                                    boxShadow: '0 15px 35px rgba(0,0,0,0.5), 0 0 30px rgba(212, 175, 55, 0.2)'
                                }}
                            >
                                {/* Photo Container */}
                                <div style={{ 
                                    width: '100%', 
                                    aspectRatio: '1/1', 
                                    background: '#111',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <img 
                                        src={vip.photos?.[0] || vip.avatar || 'https://via.placeholder.com/150'} 
                                        alt={vip.username}
                                        style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover',
                                            transition: 'transform 0.4s ease'
                                        }}
                                        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                                        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                    />
                                    {/* VIP Crown Badge */}
                                    <div style={{
                                        position: 'absolute', 
                                        top: '8px', 
                                        right: '8px',
                                        background: 'linear-gradient(135deg, var(--gold-primary) 0%, #b8860b 100%)',
                                        borderRadius: '50%', 
                                        padding: '6px',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 10px rgba(212, 175, 55, 0.5)'
                                    }}>
                                        <Crown size={14} color="#000" strokeWidth={2.5} />
                                    </div>
                                    {/* Gradient Overlay */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '50%',
                                        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                        pointerEvents: 'none'
                                    }} />
                                </div>

                                {/* User Info */}
                                <div style={{ 
                                    padding: '0.8rem', 
                                    textAlign: 'center',
                                    background: 'linear-gradient(180deg, transparent, rgba(212, 175, 55, 0.05))'
                                }}>
                                    <p style={{ 
                                        margin: 0, 
                                        fontSize: isMobile ? '0.85rem' : '0.9rem', 
                                        color: '#fff', 
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis',
                                        fontFamily: "'Outfit', sans-serif"
                                    }}>
                                        {vip.fullName || vip.username}
                                    </p>
                                    {vip.location?.city && (
                                        <p style={{ 
                                            margin: '0.3rem 0 0 0', 
                                            fontSize: '0.7rem', 
                                            color: 'rgba(212, 175, 55, 0.7)',
                                            fontWeight: 500
                                        }}>
                                            📍 {vip.location.city}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                    
                    {/* "Tümünü Gör" Card */}
                    {vipUsers.length > 6 && (
                        <Link 
                            to="/vip-members"
                            style={{ textDecoration: 'none' }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                style={{
                                    minWidth: isMobile ? '130px' : '150px',
                                    aspectRatio: '1/1.3',
                                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(0,0,0,0.8) 100%)',
                                    borderRadius: '18px',
                                    border: '2px dashed rgba(212, 175, 55, 0.4)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                whileHover={{ 
                                    scale: 1.05,
                                    borderColor: 'var(--gold-primary)'
                                }}
                            >
                                <Crown size={32} color="var(--gold-primary)" />
                                <p style={{ 
                                    margin: '0.8rem 0 0 0', 
                                    fontSize: '0.85rem', 
                                    color: 'var(--gold-primary)',
                                    fontWeight: 700,
                                    textAlign: 'center'
                                }}>
                                    +{vipUsers.length - 6} Daha
                                </p>
                                <p style={{ 
                                    margin: '0.3rem 0 0 0', 
                                    fontSize: '0.7rem', 
                                    color: '#888'
                                }}>
                                    Tümünü Gör
                                </p>
                            </motion.div>
                        </Link>
                    )}
                </div>
            </motion.div>
        )}
        
        {/* Search Bar - Compact */}
        <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass"
            style={{ padding: '0.8rem', borderRadius: '24px', marginBottom: '1.5rem', marginTop: isMobile ? '1rem' : '0', display: 'flex', alignItems: 'center' }}
        >
             <Search color="var(--text-secondary)" size={18} style={{ marginRight: '0.5rem' }} />
             <input 
                 type="text" 
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder="Kullanıcı ara..."
                 style={{ 
                     flex: 1, background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '1rem'
                 }} 
             />
             {query && <button onClick={() => setQuery('')} style={{ color: 'var(--text-secondary)', background: 'none', border:'none', cursor:'pointer' }}>X</button>}
        </motion.div>

        {query.trim() ? (
             <div style={{ display: 'grid', gap: '0.5rem', overflowY: 'auto' }}>
                {isSearching ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Aranıyor...
                    </div>
                ) : (
                    results.map((user) => (
                        <motion.div 
                            key={user._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="glass"
                            style={{ padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}
                        >
                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--gold-primary)' }}>
                                <img 
                                    src={user.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0' }}>{user.fullName || 'İsimsiz'}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>@{user.username}</p>
                            </div>
                            <Link to={`/profile/${user.username}`} className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                                Gör
                            </Link>
                        </motion.div>
                    ))
                )}
            </div>
        ) : (
             // CARD STACK / SWIPE UI
             <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
                 
                 {galleryPhotos.length > 0 ? (
                     <div style={{ flex: 1, position: 'relative' }}>
                         {/* Display only the top card (index 0) */}
                         <SwipeCard 
                            item={galleryPhotos[0]} 
                            onAction={handleSwipe} 
                            isMobile={isMobile}
                         />
                     </div>
                 ) : (
                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                         <div style={{ fontSize: '4rem' }}>👀</div>
                         <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Kimse kalmadı.</p>
                         <button onClick={handleReset} className="btn-secondary" style={{ marginTop: '1rem' }}>Yenile</button>
                     </div>
                 )}

             </div>
        )}
      </div>
    </div>
  )
}

// Sub-component for the card
const SwipeCard = ({ item, onAction, isMobile = true }: { item: GalleryItem, onAction: (a: 'like' | 'pass') => void, isMobile?: boolean }) => {
    
    // Layout Styles based on isMobile
    // Layout Styles based on isMobile
    const containerStyle: React.CSSProperties = isMobile ? {
        // MOBILE: Scrollable Vertical Stack
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', gap: '10px',
        overflowY: 'auto', // Enable full card scrolling
        overflowX: 'hidden',
        paddingBottom: '50px', 
        transform: 'translate3d(0,0,0)', 
        backfaceVisibility: 'hidden',
        WebkitOverflowScrolling: 'touch'
    } : {
        // PC: Landscape Split
        position: 'relative', width: '100%', height: '600px',
        display: 'flex', flexDirection: 'row', 
        background: '#0a0a0a', borderRadius: '32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden'
    };

    const photoStyle: React.CSSProperties = isMobile ? {
        // MOBILE
        width: '100%',
        height: '45vh', // Slightly smaller to fit buttons on first screen
        borderRadius: '24px', 
        overflow: 'hidden', 
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        flexShrink: 0,
        background: '#000',
        transform: 'translateZ(0)'
    } : {
        // PC
        width: '50%', height: '100%',
        position: 'relative', background: '#000'
    };

    const detailsStyle: React.CSSProperties = isMobile ? {
        // MOBILE - Natural Height
        width: '100%',
        background: 'linear-gradient(180deg, #111 0%, #000 100%)',
        borderRadius: '24px',
        padding: '1.5rem',
        color: '#fff',
        display: 'flex', alignContent: 'flex-start', flexWrap: 'wrap', gap: '0.6rem',
        marginTop: '0.5rem',
        boxShadow: '0 -5px 20px rgba(0,0,0,0.5)',
        borderTop: '1px solid #222'
    } : {
        // PC
        width: '50%', height: '100%',
        background: 'linear-gradient(135deg, #111 0%, #0a0a0a 100%)',
        padding: '3rem',
        color: '#fff',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        borderLeft: '1px solid #333'
    };

    // Mobile Action layout
    const mobileActionsStyle: React.CSSProperties = {
        display: 'flex', justifyContent: 'center', gap: '2rem',
        padding: '10px 0', zIndex: 30,
        flexShrink: 0
    };

    return (
        <motion.div 
            key={item.username} 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ x: isMobile ? -200 : -400, opacity: 0 }} 
            transition={{ duration: 0.3 }}
            style={containerStyle}
        >
            {/* Header - Name */}
            {isMobile && (
                <div style={{ textAlign: 'center', flexShrink: 0, marginTop: '10px' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Inter', sans-serif", textTransform: 'capitalize', letterSpacing: '-0.5px', color: '#fff', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                        {item.username.replace(/_/g, ' ')}
                    </h1>
                </div>
            )}

            {/* Photo Section */}
            <div style={photoStyle}>
                <img src={item.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Mobile Actions - NOW BETWEEN PHOTO AND DETAILS */}
            {isMobile && (
                <div style={mobileActionsStyle}>
                    <button onClick={() => onAction('pass')} className="swipe-action-btn pass" style={{ background: '#222', border: '1px solid #333' }}>
                        <X size={30} strokeWidth={3} color="#ff4444" />
                    </button>
                    <button onClick={() => onAction('like')} className="swipe-action-btn like" style={{ background: '#222', border: '1px solid #333' }}>
                        <Heart size={30} strokeWidth={3} fill="#00e676" color="#00e676" fillOpacity={0.2} />
                    </button>
                    <Link to={`/chat?user=${item.username}`} className="swipe-action-btn message" style={{ background: '#222', border: '1px solid #333' }}>
                        <MessageCircle size={30} strokeWidth={2.5} color="#2196f3" />
                    </Link>
                </div>
            )}

            {/* Details Section */}
            <div style={detailsStyle}>
                
                {/* PC Header inside Details */}
                {!isMobile && (
                    <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Inter', sans-serif", textTransform: 'capitalize', color: '#fff', margin: 0 }}>
                            {item.username.replace(/_/g, ' ')}
                        </h1>
                    </div>
                )}

                <h3 style={{ width: '100%', fontSize: '1.1rem', marginBottom: '0.8rem', color: 'var(--gold-primary)', fontWeight: 700, fontFamily: "'Inter', sans-serif", letterSpacing: '0.5px', textTransform: 'uppercase' }}>Hakkımda</h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignContent: 'flex-start' }}>
                    {item.location?.city && (
                        <div style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#ddd', borderRadius: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                             <span style={{ opacity: 0.7 }}>📍</span> {item.location.city}
                        </div>
                    )}
                    {item.details?.gender && item.details.gender !== 'Belirtilmedi' && (
                        <div style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#ddd', borderRadius: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                            <span style={{ opacity: 0.7 }}>👤</span> {item.details.gender}
                        </div>
                    )}
                    {item.details?.relationshipGoal && item.details.relationshipGoal !== 'Belirtilmedi' && (
                        <div style={{ padding: '0.6rem 1rem', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', color: 'var(--gold-primary)', borderRadius: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                            <span>❤️</span> {item.details.relationshipGoal}
                        </div>
                    )}
                    {item.details?.smoking && item.details.smoking !== 'Belirtilmedi' && (
                        <div style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#ddd', borderRadius: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                            <span style={{ opacity: 0.7 }}>🚬</span> {item.details.smoking}
                        </div>
                    )}
                    {item.details?.hobbies?.map((hobby, i) => (
                        <div key={i} style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,215,0,0.2)', color: '#eee', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 500 }}>
                            {hobby}
                        </div>
                    ))}
                </div>

                {/* PC Action Buttons */}
                {!isMobile && (
                    <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                         <button onClick={() => onAction('pass')} className="swipe-action-btn pass" style={{ background: '#222', border: '1px solid #333', width: '60px', height: '60px', cursor: 'pointer' }}>
                            <X size={24} strokeWidth={3} color="#ff4444" />
                        </button>
                        <button onClick={() => onAction('like')} className="swipe-action-btn like" style={{ background: '#222', border: '1px solid #333', width: '60px', height: '60px', cursor: 'pointer' }}>
                            <Heart size={24} strokeWidth={3} fill="#00e676" color="#00e676" fillOpacity={0.2} />
                        </button>
                        <Link to={`/chat?user=${item.username}`} className="swipe-action-btn message" style={{ background: '#222', border: '1px solid #333', width: '60px', height: '60px', cursor: 'pointer', display: 'flex', padding: 0 }}>
                            <MessageCircle size={24} strokeWidth={2.5} color="#2196f3" />
                        </Link>
                    </div>
                )}
            </div>

            </motion.div>
    );
}
export default Home
