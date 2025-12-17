import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, ArrowLeft, MapPin, Heart } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

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

const VipMembers = () => {
    const [vipUsers, setVipUsers] = useState<VipUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const navigate = useNavigate();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchVipUsers = async () => {
            try {
                const res = await fetch('/api/users/vip');
                const data = await res.json();
                if (data.success) {
                    setVipUsers(data.users || []);
                }
            } catch (err) { 
                console.error('VIP users fetch error:', err); 
            } finally {
                setIsLoading(false);
            }
        };
        fetchVipUsers();
    }, []);

    if (isLoading) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#000', 
                color: 'var(--gold-primary)' 
            }}>
                <Crown size={48} className="animate-pulse" />
                <h2 style={{ marginTop: '1rem', animation: 'pulse 2s infinite' }}>
                    VIP Üyeler Yükleniyor...
                </h2>
            </div>
        );
    }

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(180deg, #000 0%, #0a0a0a 100%)',
            paddingBottom: isMobile ? '80px' : '2rem'
        }}>
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.15) 0%, transparent 100%)',
                    padding: isMobile ? '1.5rem 1rem' : '2rem',
                    borderBottom: '1px solid rgba(212, 175, 55, 0.2)'
                }}
            >
                <div style={{ 
                    maxWidth: '1200px', 
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    {/* Back Button */}
                    <button 
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s'
                        }}
                    >
                        <ArrowLeft size={20} color="#fff" />
                    </button>

                    {/* Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, var(--gold-primary) 0%, #b8860b 100%)',
                            borderRadius: '14px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)'
                        }}>
                            <Crown size={28} color="#000" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 style={{ 
                                fontSize: isMobile ? '1.5rem' : '2rem', 
                                fontWeight: 800, 
                                background: 'linear-gradient(135deg, var(--gold-primary) 0%, #fff 50%, var(--gold-primary) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                margin: 0,
                                fontFamily: "'Outfit', sans-serif"
                            }}>
                                VIP Üyelerimiz
                            </h1>
                            <p style={{ 
                                margin: '0.3rem 0 0 0', 
                                fontSize: '0.85rem', 
                                color: 'rgba(212, 175, 55, 0.7)',
                                fontWeight: 500
                            }}>
                                {vipUsers.length} özel ayrıcalıklı üye
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* VIP Members Grid */}
            <div style={{ 
                maxWidth: '1200px', 
                margin: '0 auto',
                padding: isMobile ? '1.5rem 1rem' : '2rem'
            }}>
                {vipUsers.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '4rem 2rem',
                        color: '#888'
                    }}>
                        <Crown size={64} color="rgba(212, 175, 55, 0.3)" />
                        <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>
                            Henüz VIP üye bulunmuyor.
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile 
                            ? 'repeat(2, 1fr)' 
                            : 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: isMobile ? '1rem' : '1.5rem'
                    }}>
                        {vipUsers.map((vip, index) => (
                            <Link 
                                to={`/profile/${vip.username}`} 
                                key={vip.username}
                                style={{ textDecoration: 'none' }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05, duration: 0.4 }}
                                    style={{
                                        background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
                                        borderRadius: '20px',
                                        overflow: 'hidden',
                                        border: '1px solid rgba(212, 175, 55, 0.3)',
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                    whileHover={{ 
                                        scale: 1.03, 
                                        y: -5,
                                        boxShadow: '0 15px 40px rgba(0,0,0,0.5), 0 0 30px rgba(212, 175, 55, 0.15)'
                                    }}
                                >
                                    {/* Photo Container */}
                                    <div style={{ 
                                        width: '100%', 
                                        aspectRatio: isMobile ? '1/1.1' : '1/1', 
                                        background: '#111',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <img 
                                            src={vip.photos?.[0] || vip.avatar || 'https://via.placeholder.com/300'} 
                                            alt={vip.username}
                                            style={{ 
                                                width: '100%', 
                                                height: '100%', 
                                                objectFit: 'cover',
                                                transition: 'transform 0.5s ease'
                                            }}
                                            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                                            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                        />
                                        
                                        {/* VIP Crown Badge */}
                                        <div style={{
                                            position: 'absolute', 
                                            top: '12px', 
                                            right: '12px',
                                            background: 'linear-gradient(135deg, var(--gold-primary) 0%, #b8860b 100%)',
                                            borderRadius: '50%', 
                                            padding: '8px',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.5)'
                                        }}>
                                            <Crown size={18} color="#000" strokeWidth={2.5} />
                                        </div>

                                        {/* Gradient Overlay */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: '60%',
                                            background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                                            pointerEvents: 'none'
                                        }} />

                                        {/* User Info Overlay */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            padding: isMobile ? '1rem' : '1.2rem'
                                        }}>
                                            <h3 style={{ 
                                                margin: 0, 
                                                fontSize: isMobile ? '1rem' : '1.2rem', 
                                                color: '#fff', 
                                                fontWeight: 700,
                                                fontFamily: "'Outfit', sans-serif",
                                                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                                            }}>
                                                {vip.fullName || vip.username}
                                            </h3>
                                            
                                            {vip.location?.city && (
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.4rem',
                                                    marginTop: '0.4rem'
                                                }}>
                                                    <MapPin size={14} color="var(--gold-primary)" />
                                                    <span style={{ 
                                                        fontSize: '0.8rem', 
                                                        color: 'rgba(212, 175, 55, 0.9)',
                                                        fontWeight: 500
                                                    }}>
                                                        {vip.location.city}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div style={{ 
                                        padding: isMobile ? '0.8rem' : '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'linear-gradient(180deg, transparent, rgba(212, 175, 55, 0.05))',
                                        borderTop: '1px solid rgba(212, 175, 55, 0.1)'
                                    }}>
                                        {/* Details Chips */}
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            {vip.details?.gender && vip.details.gender !== 'Belirtilmedi' && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '0.3rem 0.6rem',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '8px',
                                                    color: '#aaa'
                                                }}>
                                                    {vip.details.gender}
                                                </span>
                                            )}
                                            {vip.details?.relationshipGoal && vip.details.relationshipGoal !== 'Belirtilmedi' && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '0.3rem 0.6rem',
                                                    background: 'rgba(212, 175, 55, 0.1)',
                                                    border: '1px solid rgba(212, 175, 55, 0.2)',
                                                    borderRadius: '8px',
                                                    color: 'var(--gold-primary)'
                                                }}>
                                                    <Heart size={10} style={{ marginRight: '4px' }} />
                                                    {vip.details.relationshipGoal}
                                                </span>
                                            )}
                                        </div>

                                        {/* View Profile Button */}
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--gold-primary)',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem'
                                        }}>
                                            Profili Gör →
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VipMembers;
