import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Landing from './pages/Landing'
import VaultSignup from './pages/VaultSignup'
import AestheticSignup from './pages/AestheticSignup'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Profile from './pages/Profile'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Chat from './pages/Chat'
import Likes from './pages/Likes'
import VipMembers from './pages/VipMembers'
import './App.css'

import { Home as HomeIcon, MessageCircle, User, Crown, Shield, Heart, Bell, Trash2 } from 'lucide-react';

// Notification interface
interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  body: string;
  sender: string;
  data?: { chatUser?: string };
  isRead: boolean;
  createdAt: string;
}

const Navbar = () => {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    const token = localStorage.getItem('vault_token');
    if (!token) return;

    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('vault_token');
    if (token) {
      fetchNotifications();
      // Poll every 10 seconds
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const checkAuth = async () => {
        const token = localStorage.getItem('vault_token');
        setIsLoggedIn(!!token);

        if (token) {
            try {
                const res = await fetch('/api/auth/me', { headers: { 'Authorization': token } });
                const data = await res.json();
                if (data.success && data.user && data.user.username === 'admin') {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch (e) {
                console.error(e);
                setIsAdmin(false);
            }
        } else {
            setIsAdmin(false);
        }
    };
    checkAuth();
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('vault_token');
    window.location.href = '/';
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem('vault_token');
    if (!token) return;

    try {
      await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { 
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ markAll: true })
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark notifications as read:', e);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    const token = localStorage.getItem('vault_token');
    if (!token) return;

    // Mark as read
    if (!notif.isRead) {
      try {
        await fetch('/api/notifications/read', {
          method: 'PUT',
          headers: { 
            'Authorization': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notificationId: notif._id })
        });
        setNotifications(prev => prev.map(n => 
          n._id === notif._id ? { ...n, isRead: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) {
        console.error(e);
      }
    }

    // Navigate to chat if it's a message notification
    if (notif.data?.chatUser) {
      setShowNotificationPanel(false);
      window.location.href = `/chat?user=${encodeURIComponent(notif.data.chatUser)}`;
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation(); // Prevent triggering the parent click
    const token = localStorage.getItem('vault_token');
    if (!token) return;

    try {
      await fetch(`/api/notifications/${notifId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      // Remove from state
      const deletedNotif = notifications.find(n => n._id === notifId);
      setNotifications(prev => prev.filter(n => n._id !== notifId));
      // Update unread count if the deleted notification was unread
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}dk önce`;
    if (diffHours < 24) return `${diffHours}sa önce`;
    return `${diffDays}g önce`;
  };

  const isActive = (path: string) => location.pathname === path;

  const linkStyle = (path: string) => ({
      color: isActive(path) ? '#fff' : 'var(--text-secondary)',
      textShadow: isActive(path) ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
      transition: 'all 0.3s ease',
      fontWeight: isActive(path) ? 500 : 400,
      cursor: 'pointer'
  });

  return (
    <>
        {/* TOP NAVBAR (Desktop & Mobile Header) */}
        <motion.nav 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="glass" 
            style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50 }}
        >
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '80px' }}>
                <Link to={isLoggedIn ? "/home" : "/"} style={{ textDecoration: 'none' }}>
                    <div className="logo text-gradient-gold">
                    THE VAULT
                    </div>
                </Link>

                {/* DESKTOP LINKS */}
                <div className="nav-links desktop-only" style={{ gap: '2.5rem', alignItems: 'center' }}>
                    {!isLoggedIn ? (
                        <>
                            <Link to="/login" style={linkStyle('/login')}>GİRİŞ YAP</Link>
                            <Link to="/register" style={linkStyle('/register')}>KAYIT OL</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/home" style={linkStyle('/home')}>KEŞFET</Link>
                            <Link to="/likes" style={linkStyle('/likes')}>BEĞENİLENLER</Link>
                            <Link to="/chat" style={linkStyle('/chat')}>MESAJLAR</Link>
                            <Link to="/join/member" style={linkStyle('/join/member')}>ÜYELİK</Link>
                            <Link to="/join/apply" style={linkStyle('/join/apply')}>DOĞRULAMA</Link>
                            <Link to="/profile" style={linkStyle('/profile')}>PROFİL</Link>
                            
                            {/* Notification Bell - Desktop */}
                            <div style={{ position: 'relative' }}>
                                <div 
                                    onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                                    style={{ cursor: 'pointer', color: unreadCount > 0 ? 'var(--gold-primary)' : '#888', position: 'relative' }}
                                >
                                    <Bell size={22} />
                                    {unreadCount > 0 && (
                                        <span style={{ 
                                            position: 'absolute', top: -5, right: -5, 
                                            minWidth: '18px', height: '18px', 
                                            backgroundColor: '#ff3b30', borderRadius: '50%', 
                                            fontSize: '0.7rem', fontWeight: 'bold',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff'
                                        }}>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </div>

                                {/* Notification Dropdown Panel */}
                                {showNotificationPanel && (
                                    <div 
                                        style={{
                                            position: 'absolute', top: '100%', right: 0, marginTop: '0.75rem',
                                            width: '360px', maxHeight: '480px', overflowY: 'auto',
                                            background: 'rgba(20, 20, 20, 0.98)', backdropFilter: 'blur(20px)',
                                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                                            boxShadow: '0 15px 50px rgba(0,0,0,0.7)',
                                            zIndex: 100
                                        }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {/* Header */}
                                        <div style={{ 
                                            padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>Bildirimler</h4>
                                            {unreadCount > 0 && (
                                                <button 
                                                    onClick={handleMarkAllRead}
                                                    style={{ 
                                                        background: 'none', border: 'none', 
                                                        color: 'var(--gold-primary)', fontSize: '0.8rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Tümünü okundu işaretle
                                                </button>
                                            )}
                                        </div>

                                        {/* Notification List */}
                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#666' }}>
                                                <Bell size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                                                <p>Henüz bildirim yok</p>
                                            </div>
                                        ) : (
                                            notifications.slice(0, 20).map(notif => (
                                                <div 
                                                    key={notif._id}
                                                    onClick={() => handleNotificationClick(notif)}
                                                    style={{ 
                                                        padding: '1rem 1.25rem', 
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        cursor: 'pointer',
                                                        background: notif.isRead ? 'transparent' : 'rgba(212, 175, 55, 0.05)',
                                                        transition: 'background 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(212, 175, 55, 0.05)'}
                                                >
                                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                                        {/* Icon */}
                                                        <div style={{ 
                                                            width: '40px', height: '40px', borderRadius: '50%',
                                                            background: notif.type === 'admin_broadcast' 
                                                                ? 'linear-gradient(135deg, var(--gold-primary), #e6be8a)' 
                                                                : 'rgba(255,255,255,0.1)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}>
                                                            {notif.type === 'admin_broadcast' ? (
                                                                <Shield size={18} color="#000" />
                                                            ) : (
                                                                <MessageCircle size={18} color="#fff" />
                                                            )}
                                                        </div>

                                                        {/* Content */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                                <span style={{ 
                                                                    fontWeight: notif.isRead ? 400 : 600, 
                                                                    color: notif.isRead ? '#aaa' : '#fff',
                                                                    fontSize: '0.9rem'
                                                                }}>
                                                                    {notif.title}
                                                                </span>
                                                                <span style={{ fontSize: '0.7rem', color: '#666' }}>
                                                                    {formatTime(notif.createdAt)}
                                                                </span>
                                                            </div>
                                                            <p style={{ 
                                                                margin: 0, fontSize: '0.85rem', 
                                                                color: notif.isRead ? '#666' : '#999',
                                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                            }}>
                                                                {notif.body}
                                                            </p>
                                                        </div>

                                                        {/* Delete Button & Unread indicator */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                            <button
                                                                onClick={(e) => handleDeleteNotification(e, notif._id)}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: '#666',
                                                                    cursor: 'pointer',
                                                                    padding: '4px',
                                                                    borderRadius: '4px',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
                                                                onMouseLeave={e => e.currentTarget.style.color = '#666'}
                                                                title="Bildirimi sil"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                            {!notif.isRead && (
                                                                <div style={{ 
                                                                    width: '8px', height: '8px', borderRadius: '50%',
                                                                    background: 'var(--gold-primary)', flexShrink: 0
                                                                }} />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {isAdmin && <Link to="/admin" style={{ ...linkStyle('/admin'), color: 'red', fontWeight: 'bold' }}>ADMIN</Link>}
                            <span onClick={handleLogout} style={linkStyle('/')}>ÇIKIŞ YAP</span>
                        </>
                    )}
                </div>

                {/* Mobile Notification Bell */}
                {isLoggedIn && (
                    <div className="mobile-only" style={{ marginRight: '1rem', position: 'relative' }}>
                        <div 
                            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                            style={{ cursor: 'pointer', color: unreadCount > 0 ? 'var(--gold-primary)' : '#fff' }}
                        >
                            <Bell size={24} />
                            {unreadCount > 0 && (
                                <span style={{ 
                                    position: 'absolute', top: -5, right: -5, 
                                    minWidth: '18px', height: '18px', 
                                    backgroundColor: '#ff3b30', borderRadius: '50%', 
                                    fontSize: '0.7rem', fontWeight: 'bold',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff'
                                }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </div>

                        {/* Mobile Notification Panel */}
                        {showNotificationPanel && (
                            <div 
                                style={{
                                    position: 'fixed', top: '80px', left: 0, right: 0,
                                    maxHeight: 'calc(100vh - 160px)', overflowY: 'auto',
                                    background: 'rgba(10, 10, 10, 0.98)', backdropFilter: 'blur(20px)',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    zIndex: 100
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div style={{ 
                                    padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    position: 'sticky', top: 0, background: 'rgba(10, 10, 10, 0.98)'
                                }}>
                                    <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Bildirimler</h4>
                                    {unreadCount > 0 && (
                                        <button 
                                            onClick={handleMarkAllRead}
                                            style={{ 
                                                background: 'none', border: 'none', 
                                                color: 'var(--gold-primary)', fontSize: '0.85rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Tümünü okundu işaretle
                                        </button>
                                    )}
                                </div>

                                {/* Notification List */}
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#666' }}>
                                        <Bell size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                                        <p>Henüz bildirim yok</p>
                                    </div>
                                ) : (
                                    notifications.slice(0, 30).map(notif => (
                                        <div 
                                            key={notif._id}
                                            onClick={() => handleNotificationClick(notif)}
                                            style={{ 
                                                padding: '1rem 1.25rem', 
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                cursor: 'pointer',
                                                background: notif.isRead ? 'transparent' : 'rgba(212, 175, 55, 0.05)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                                {/* Icon */}
                                                <div style={{ 
                                                    width: '44px', height: '44px', borderRadius: '50%',
                                                    background: notif.type === 'admin_broadcast' 
                                                        ? 'linear-gradient(135deg, var(--gold-primary), #e6be8a)' 
                                                        : 'rgba(255,255,255,0.1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {notif.type === 'admin_broadcast' ? (
                                                        <Shield size={20} color="#000" />
                                                    ) : (
                                                        <MessageCircle size={20} color="#fff" />
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                        <span style={{ 
                                                            fontWeight: notif.isRead ? 400 : 600, 
                                                            color: notif.isRead ? '#aaa' : '#fff',
                                                            fontSize: '0.95rem'
                                                        }}>
                                                            {notif.title}
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                                            {formatTime(notif.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p style={{ 
                                                        margin: 0, fontSize: '0.9rem', 
                                                        color: notif.isRead ? '#666' : '#999',
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                    }}>
                                                        {notif.body}
                                                    </p>
                                                </div>

                                                {/* Delete Button & Unread indicator */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                    <button
                                                        onClick={(e) => handleDeleteNotification(e, notif._id)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#666',
                                                            cursor: 'pointer',
                                                            padding: '6px',
                                                            borderRadius: '4px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="Bildirimi sil"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    {!notif.isRead && (
                                                        <div style={{ 
                                                            width: '10px', height: '10px', borderRadius: '50%',
                                                            background: 'var(--gold-primary)', flexShrink: 0
                                                        }} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                 {/* MOBILE GUEST LINKS (Top Right) */}
                 {!isLoggedIn && (
                    <div className="mobile-only" style={{ gap: '1rem', fontSize: '0.8rem' }}>
                        <Link to="/login" style={{ color: isActive('/login') ? '#fff' : 'var(--text-secondary)' }}>GİRİŞ</Link>
                        <Link to="/register" style={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}>KAYIT</Link>
                    </div>
                 )}
            </div>
        </motion.nav>

        {/* Overlay to close notification panel */}
        {showNotificationPanel && (
            <div 
                onClick={() => setShowNotificationPanel(false)}
                style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    zIndex: 40, background: 'transparent'
                }} 
            />
        )}

        {/* BOTTOM NAV (Mobile Only - Logged In) */}
        {isLoggedIn && (
            <div className="bottom-nav mobile-only">
                <Link to="/home" className={`bottom-nav-item ${isActive('/home') ? 'active' : ''}`}>
                    <HomeIcon size={24} />
                    <span>Keşfet</span>
                </Link>
                <Link to="/likes" className={`bottom-nav-item ${isActive('/likes') ? 'active' : ''}`}>
                    <Heart size={24} />
                    <span>Beğeniler</span>
                </Link>
                <Link to="/chat" className={`bottom-nav-item ${isActive('/chat') ? 'active' : ''}`}>
                    <MessageCircle size={24} />
                    <span>Mesajlar</span>
                </Link>
                 <Link to="/join/member" className={`bottom-nav-item ${isActive('/join/member') ? 'active' : ''}`}>
                    <Crown size={24} />
                    <span>Üyelik</span>
                </Link>
                {isAdmin ? (
                    <Link to="/admin" className={`bottom-nav-item ${isActive('/admin') ? 'active' : ''}`}>
                         <Shield size={24} color="red" />
                         <span>Admin</span>
                    </Link>
                ) : (
                    <Link to="/profile" className={`bottom-nav-item ${isActive('/profile') ? 'active' : ''}`}>
                        <User size={24} />
                        <span>Profil</span>
                    </Link>
                )}
            </div>
        )}
    </>
  );
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/join/member" element={<VaultSignup />} />
          <Route path="/join/apply" element={<AestheticSignup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/home" element={<Home />} />
          <Route path="/likes" element={<Likes />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/vip-members" element={<VipMembers />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
