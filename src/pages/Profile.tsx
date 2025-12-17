import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Camera, Grid, LogOut, Crown, MessageSquare, Lock, Trash2, RotateCcw, MapPin, X, Users, UserCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

interface FollowUser {
    username: string;
    fullName?: string;
    avatar?: string;
    isMember?: boolean;
    isVerified?: boolean;
}

const Profile = () => {
  const { username: routeUsername } = useParams();
  const [activeTab, setActiveTab] = useState<'photos' | 'settings'>('photos');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  
  // Followers/Following Modal State
  const [followModal, setFollowModal] = useState<{ type: 'followers' | 'following', users: FollowUser[] } | null>(null);
  const [loadingFollows, setLoadingFollows] = useState(false);
  
  const [settings, setSettings] = useState({
    privacy: false,
    notifications: true
  });
  
  const [photoToDelete, setPhotoToDelete] = useState<{ index: number, url: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [currentUserChecked, setCurrentUserChecked] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [user, setUser] = useState({
    username: '',
    fullName: '',
    bio: '',
    location: { city: '' } as { city: string, lat?: number, lng?: number },
    interestedIn: [] as string[],
    avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
    isMember: false,
    isVerified: false,
    isAnonymous: false,
    photos: [] as string[],
    stats: {
      posts: 0,
       followers: 0,
       following: 0
    },
    details: {
        hobbies: [] as string[],
        smoking: '',
        relationshipGoal: '',
        gender: ''
    },
    isFollowing: false
  });

  // Hobbies List
  const AVAILABLE_HOBBIES = [
    'Müzik', 'Spor', 'Seyahat', 'Sinema', 'Teknoloji', 'Sanat', 'Kitap', 'Yemek', 'Oyun', 
    'Doğa', 'Dans', 'Fotoğraf', 'Moda', 'Evcil Hayvan', 'Astroloji', 'Bilim', 'Tiyatro', 
    'Yazılım', 'Yüzme', 'Fitness', 'Kamp', 'Arabalar', 'Motosiklet'
  ];

  // Edit Modal Tabs
  const [editTab, setEditTab] = useState<'genel' | 'detay' | 'hobi'>('genel');

  useEffect(() => {
    const fetchUserData = async () => {
        const token = localStorage.getItem('vault_token');
        
        let myUsername = '';
        let currentUserIsVerified = false;
        let currentUserIsMember = false;
        
        if (token) {
             try {
                 const meRes = await fetch('/api/auth/me', {
                    headers: { 'Authorization': token }
                 });
                 const meData = await meRes.json();
                 if (meData.success) {
                     myUsername = meData.user.username;
                     currentUserIsVerified = meData.user.isVerified || false;
                     currentUserIsMember = meData.user.isMember || false;
                 }
             } catch(e) { console.error(e); }
        }

        // Check if needs verification
        if (!currentUserIsVerified && !currentUserIsMember) {
            setNeedsVerification(true);
        }
        setCurrentUserChecked(true);

        // Determine target
        if (!routeUsername) {
            // No param -> Accessing /profile directly -> Must be logged in
             if (!token) {
                window.location.href = '/login';
                return;
             }
             setIsOwner(true);
             fetchMe(token);
        } else {
             // Accessing /profile/:username
             if (routeUsername === myUsername) {
                 setIsOwner(true);
                 fetchMe(token!);
             } else {
                 setIsOwner(false);
                 fetchPublicUser(routeUsername, token);
             }
        }
    };

    const fetchMe = async (token: string) => {
        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': token }
            });
            const data = await response.json();
            if (data.success && data.user) {
                setUser(prev => ({
                    ...prev, 
                    ...data.user, 
                    avatar: data.user.avatar || prev.avatar, 
                    photos: data.user.photos || [],
                    stats: data.user.stats || prev.stats,
                    location: data.user.location || { city: '' },
                    interestedIn: data.user.interestedIn || []
                }));
                setSettings(prev => ({ 
                    ...prev, 
                    privacy: data.user.isAnonymous || false,
                    notifications: data.user.notifications !== false // default true
                }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPublicUser = async (username: string, token: string | null) => {
         try {
            const headers: any = {};
            if (token) headers['Authorization'] = token;
            
            const response = await fetch(`/api/users/${username}`, { headers });
            const data = await response.json();
            if (data.success && data.user) {
                 setUser(prev => ({ 
                     ...prev, 
                     ...data.user, 
                     avatar: data.user.avatar || prev.avatar, 
                     photos: data.user.photos || [],
                     stats: data.user.stats || prev.stats,
                     location: data.user.location || { city: '' },
                     isFollowing: data.user.isFollowing || false
                 }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    fetchUserData();
  }, [routeUsername]);

  const handleGeolocation = () => {
      if (!navigator.geolocation) {
          alert('Tarayıcınız konum servisini desteklemiyor.');
          return;
      }

      const confirmMsg = "Konum izni isteniyor. Sadece şehir bilginiz profilinizde gösterilecek.";
      if (!window.confirm(confirmMsg)) return;

      navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
              // Using OpenStreetMap Nominatim for Reverse Geocoding
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              const data = await res.json();
              
              if (data && data.address) {
                  // Prioritize City > Town > Province > State
                  const city = data.address.city || data.address.town || data.address.province || data.address.state || '';
                  
                  if (city) {
                      setUser(prev => ({
                          ...prev,
                          location: {
                              city: city,
                              lat: latitude,
                              lng: longitude
                          }
                      }));
                  } else {
                      alert('Konumdan şehir bilgisi alınamadı.');
                  }
              }
          } catch (error) {
              console.error(error);
              alert('Konum servisine erişilemedi.');
          }
      }, (err) => {
          console.error(err);
          alert('Konum alınamadı. Lütfen izinleri kontrol edin.');
      });
  };

  const handleReset = () => {
    if(!window.confirm('Seçimleri temizlemek istiyor musunuz?')) return;
    setUser(prev => ({
        ...prev,
        details: {
            ...prev.details,
            gender: 'Belirtilmedi',
            relationshipGoal: 'Belirsiz',
            smoking: '',
            hobbies: []
        }
    }));
  };

  // Avatar Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const MAX_WIDTH = 500;
              const MAX_HEIGHT = 500;

              if (width > height) {
                  if (width > MAX_WIDTH) {
                      height *= MAX_WIDTH / width;
                      width = MAX_WIDTH;
                  }
              } else {
                  if (height > MAX_HEIGHT) {
                      width *= MAX_HEIGHT / height;
                      height = MAX_HEIGHT;
                  }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                  setUser(prev => ({ ...prev, avatar: dataUrl }));
              }
          }
          if (event.target && typeof event.target.result === 'string') {
               img.src = event.target.result;
          }
      }
      reader.readAsDataURL(file);
    }
  };

  // Gallery Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        if (event.target?.result) {
            const photoUrl = event.target.result as string;
            // Optimistic update
            setUser(prev => ({ 
                ...prev, 
                photos: [...prev.photos, photoUrl],
                stats: {
                    ...prev.stats,
                    posts: prev.stats.posts + 1
                }
            }));
            
            // Send to backend
             const token = localStorage.getItem('vault_token');
             if (token) {
                 try {
                     await fetch('/api/users/photos', {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json', 'Authorization': token },
                         body: JSON.stringify({ photoUrl })
                     });
                 } catch (err) { console.error(err); }
             }
        }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
        const token = localStorage.getItem('vault_token');
        if (!token) {
            alert('Oturum süresi dolmuş.');
            return;
        }

        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({
                fullName: user.fullName,
                bio: user.bio,
                username: user.username,
                avatar: user.avatar,
                details: user.details,
                interestedIn: user.interestedIn,
                location: user.location
            })
        });
        
        const data = await response.json();
        if (data.success) {
            setIsEditing(false);
            if (data.user) {
                setUser(prev => ({
                    ...prev,
                    ...data.user,
                    details: data.user.details || prev.details,
                    interestedIn: data.user.interestedIn || prev.interestedIn,
                    location: data.user.location || prev.location
                }));
            }
        } else {
            alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
        }
    } catch (err) {
        alert('Bağlantı hatası.');
    }
  };

  const handleSaveSettings = async () => {
      try {
          const token = localStorage.getItem('vault_token');
          if (!token) return;

          setSaveStatus('saving');
          const response = await fetch('/api/users/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': token },
              body: JSON.stringify({
                  isAnonymous: settings.privacy,
                  notifications: settings.notifications
              })
          });
          const data = await response.json();
          if (data.success) {
              setSaveStatus('success');
              setUser(prev => ({ ...prev, isAnonymous: settings.privacy, notifications: settings.notifications }));
              setTimeout(() => setSaveStatus('idle'), 2000);
          } else {
              setSaveStatus('error');
              setTimeout(() => setSaveStatus('idle'), 2000);
          }
      } catch (err) {
          console.error(err);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 2000);
      }
  };

  // Handle Notification Toggle with Browser Permission Request
  const handleNotificationToggle = async () => {
      const currentlyEnabled = settings.notifications;
      
      if (!currentlyEnabled) {
          // User wants to ENABLE notifications
          if (!('Notification' in window)) {
              alert('Bu tarayıcı bildirimleri desteklemiyor.');
              return;
          }
          
          try {
              const permission = await Notification.requestPermission();
              
              if (permission === 'granted') {
                  setSettings(s => ({ ...s, notifications: true }));
                  // Show a test notification
                  new Notification('The Vault', {
                      body: 'Bildirimler başarıyla aktifleştirildi! 🎉',
                      icon: '/vite.svg'
                  });
              } else if (permission === 'denied') {
                  alert('Bildirim izni reddedildi. Tarayıcı ayarlarından izin vermeniz gerekiyor.');
              } else {
                  // Permission dismissed
                  alert('Bildirim izni verilmedi.');
              }
          } catch (err) {
              console.error('Notification permission error:', err);
              alert('Bildirim izni alınırken hata oluştu.');
          }
      } else {
          // User wants to DISABLE notifications
          setSettings(s => ({ ...s, notifications: false }));
      }
  };

  const handleDeletePhoto = (photoUrl: string, index: number) => {
      setPhotoToDelete({ url: photoUrl, index });
  };

  const confirmDelete = async () => {
      if (!photoToDelete) return;
      
      const { index, url } = photoToDelete;
      setPhotoToDelete(null); 
      
      const token = localStorage.getItem('vault_token');
      if (!token) return;
      
      // Optimistic update: splice by index
      setUser(prev => {
          const newPhotos = [...prev.photos];
          if (index >= 0 && index < newPhotos.length) {
              newPhotos.splice(index, 1);
          }
          return { 
              ...prev, 
              photos: newPhotos,
              stats: {
                  ...prev.stats,
                  posts: Math.max(0, prev.stats.posts - 1)
              }
          };
      });

      try {
          const res = await fetch('/api/users/photos', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json', 'Authorization': token },
              body: JSON.stringify({ photoIndex: index })
          });
          const data = await res.json();
          if (!data.success) {
              alert('Silinemedi: ' + data.error);
              // Revert if failed
              setUser(prev => ({ ...prev, photos: [...prev.photos, url] }));
          }
      } catch (err) {
           console.error('Delete error', err);
           alert('Silme işleminde hata oluştu');
      }
  };

  const handleFollow = async () => {
    const token = localStorage.getItem('vault_token');
    if (!token) return;
    const action = user.isFollowing ? 'unfollow' : 'follow';
    try {
        const res = await fetch(`/api/users/${action}/${user.username}`, {
            method: 'POST',
            headers: { 'Authorization': token }
        });
        const data = await res.json();
        if (data.success) {
            setUser(prev => ({
                ...prev,
                isFollowing: data.isFollowing,
                stats: {
                    ...prev.stats,
                    followers: prev.stats.followers + (data.isFollowing ? 1 : -1)
                }
            }));
        }
    } catch (err) { console.error(err); }
  };

  const openFollowModal = async (type: 'followers' | 'following') => {
    setLoadingFollows(true);
    try {
        const res = await fetch(`/api/users/${user.username}/${type}`);
        const data = await res.json();
        if (data.success) {
            setFollowModal({ type, users: data.users || [] });
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoadingFollows(false);
    }
  };

  const photos = user.photos || [];

  if (isLoading) {
      return <div className="flex-center" style={{ height: '100vh', color: 'var(--gold-primary)' }}>Yükleniyor...</div>
  }

  // Show verification required screen for non-verified users (even their own profile)
  if (currentUserChecked && needsVerification) {
    return (
      <div style={{ paddingTop: '80px', minHeight: '100vh', paddingBottom: '100px' }}>
        <div className="container" style={{ maxWidth: '600px', textAlign: 'center', padding: '0 1rem' }}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass"
            style={{ 
              borderRadius: '24px', 
              padding: isMobile ? '2rem 1.5rem' : '3rem 2rem',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              background: 'linear-gradient(180deg, rgba(30,30,30,0.9) 0%, rgba(10,10,10,0.98) 100%)'
            }}
          >
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--gold-primary), #e6be8a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <Lock size={40} color="#000" />
            </div>

            <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', marginBottom: '1rem', color: 'var(--gold-primary)' }}>
              Hesabını Aktifleştir
            </h1>

            <p style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', color: '#aaa', lineHeight: '1.8', marginBottom: '1.5rem' }}>
              The Vault'u kullanmak için önce <strong style={{ color: '#fff' }}>doğrulama</strong> yapmalı veya <strong style={{ color: 'var(--gold-primary)' }}>VIP üye</strong> olmalısın.
            </p>

            <div style={{ 
              background: 'rgba(255,255,255,0.03)', 
              padding: isMobile ? '1rem' : '1.5rem', 
              borderRadius: '16px',
              marginBottom: '1.5rem',
              border: '1px solid rgba(255,255,255,0.05)',
              textAlign: 'left'
            }}>
              <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem', fontSize: isMobile ? '1rem' : '1.1rem' }}>🔐 Nasıl Çalışır?</h3>
              
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,215,0,0.05)', borderRadius: '12px', border: '1px solid rgba(255,215,0,0.1)' }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '0.5rem' }}>✨ Doğrulama (Ücretsiz)</strong>
                <p style={{ color: '#888', fontSize: '0.9rem', margin: 0, lineHeight: '1.6' }}>
                  Yüz doğrulaması yaparak profilini aktifleştir. 
                  <span style={{ color: 'var(--gold-primary)' }}> Zengin sosyete ve A-sınıf VIP üyeler </span> 
                  seni keşfetsin ve sana mesaj atsın!
                </p>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(255,215,0,0.08)', borderRadius: '12px', border: '1px solid rgba(255,215,0,0.2)' }}>
                <strong style={{ color: 'var(--gold-primary)', display: 'block', marginBottom: '0.5rem' }}>👑 VIP Üyelik</strong>
                <p style={{ color: '#888', fontSize: '0.9rem', margin: 0, lineHeight: '1.6' }}>
                  VIP üye olarak doğrulanmış kaliteli profilleri 
                  <span style={{ color: '#fff' }}> keşfet, beğen ve istediğin kişiye ilk mesajı sen at. </span>
                  İstersen kimliğin anonim kalabilir.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <Link 
                to="/join/apply" 
                style={{ 
                  padding: '1rem 2rem', 
                  background: 'transparent',
                  border: '2px solid var(--gold-primary)',
                  color: 'var(--gold-primary)', 
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  transition: 'all 0.2s'
                }}
              >
                🔒 Ücretsiz Doğrulama Yap
              </Link>
              <Link 
                to="/join/member" 
                style={{ 
                  padding: '1rem 2rem', 
                  background: 'linear-gradient(135deg, var(--gold-primary), #e6be8a)',
                  color: '#000', 
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  boxShadow: '0 4px 20px rgba(255,215,0,0.3)'
                }}
              >
                👑 VIP Üye Ol
              </Link>
            </div>

            <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#555' }}>
              💡 Güzellik burada, zenginlik orada - The Vault ikisini bir araya getirir.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '100px', minHeight: '100vh', paddingBottom: '100px' }}>
      <div className="container" style={{ maxWidth: isMobile ? '100%' : '800px', padding: isMobile ? '0 10px' : '0 1rem' }}>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass"
          style={{ 
              borderRadius: '32px', 
              padding: '3rem 2rem', 
              marginBottom: '2rem',
              border: '1px solid rgba(255, 215, 0, 0.15)',
              background: 'linear-gradient(180deg, rgba(30,30,30,0.8) 0%, rgba(10,10,10,0.95) 100%)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            
            {/* Avatar Section */}
            <div style={{ position: 'relative' }}>
              <div style={{ 
                width: '140px', height: '140px', borderRadius: '50%', overflow: 'hidden',
                border: '3px solid var(--gold-primary)', 
                boxShadow: '0 0 30px rgba(255, 215, 0, 0.2)'
              }}>
                <img 
                  src={user.avatar} 
                  alt="Profile" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
              {isEditing && isOwner && (
                  <>
                    <input 
                        type="file" 
                        id="avatar-upload" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        style={{ display: 'none' }}
                    />
                    <label 
                        htmlFor="avatar-upload"
                        style={{ 
                        position: 'absolute', bottom: '0', right: '0',
                        background: 'var(--gold-primary)', color: '#000',
                        width: '40px', height: '40px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                        transition: 'transform 0.2s'
                        }}
                    >
                        <Camera size={20} />
                    </label>
                  </>
              )}
            </div>

            {/* User Info Section */}
            <div style={{ textAlign: 'center', width: '100%', maxWidth: '500px' }}>
                <div style={{ animation: 'fadeIn 0.5s ease' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem', background: 'linear-gradient(to right, #fff, #ccc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        {user.fullName || user.username}
                        {user.isMember && <Crown size={28} fill="#FFD700" color="#FFD700" strokeWidth={1.5} />}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '1.1rem', color: 'var(--gold-primary)', opacity: 0.9, margin: 0 }}>@{user.username}</p>
                        {user.location?.city && <span style={{ color: '#777', fontSize: '0.9rem' }}>📍 {user.location.city}</span>}
                    </div>
                    
                    {/* DETAILS BADGES */}
                    {(user.details?.relationshipGoal || user.details?.smoking || user.details?.gender || (user.details?.hobbies && user.details.hobbies.length > 0)) && (
                        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '2rem' }}>
                            {user.details.gender && user.details.gender !== 'Belirtilmedi' && (
                                <span style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '20px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                                    👤 {user.details.gender}
                                </span>
                            )}
                            {user.details.relationshipGoal && user.details.relationshipGoal !== 'Belirtilmedi' && (
                                <span style={{ padding: '0.4rem 1rem', background: 'rgba(255,215,0,0.15)', color: 'var(--gold-primary)', borderRadius: '20px', fontSize: '0.85rem', border: '1px solid rgba(255,215,0,0.3)' }}>
                                    ❤️ {user.details.relationshipGoal}
                                </span>
                            )}
                            {user.details.smoking && user.details.smoking !== 'Belirtilmedi' && (
                                <span style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '20px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                                    🚬 {user.details.smoking}
                                </span>
                            )}
                            {user.details.hobbies?.map((hobby, i) => (
                                <span key={i} style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.05)', color: '#ccc', borderRadius: '20px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {hobby}
                                </span>
                            ))}
                        </div>
                    )}

                    <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto', marginBottom: '2rem' }}>
                        {user.bio || 'Henüz bir biyografi eklenmemiş.'}
                    </p>

                    {isOwner ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            style={{ 
                                padding: '0.6rem 2rem', 
                                background: 'transparent', 
                                border: '1px solid var(--glass-border)', 
                                color: '#fff', 
                                borderRadius: '8px', 
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s',
                                fontWeight: 500
                            }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--gold-primary)'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                        >
                            Profili Düzenle
                        </button>
                    ) : (
                             <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
                                 <button 
                                     onClick={handleFollow}
                                     style={{ 
                                         padding: '0.8rem 1.5rem', 
                                         background: user.isFollowing ? 'transparent' : 'var(--gold-primary)',
                                         color: user.isFollowing ? '#fff' : '#000',
                                         border: user.isFollowing ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                         borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold',
                                         display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s'
                                     }}
                                 >
                                     {user.isFollowing ? 'Takibi Bırak' : 'Takip Et'}
                                 </button>
                                 <Link to={`/chat?user=${user.username}`} className="btn-primary" style={{ padding: '0.8rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                                     <MessageSquare size={18} />
                                     Mesaj
                                </Link>
                             </div>
                    )}
                </div>
            </div>

            {/* Stats - Instagram Style */}
            <div className="profile-stats" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)',
                padding: isMobile ? '1rem 0' : '1.25rem 0', 
                borderTop: '1px solid rgba(255,255,255,0.08)', 
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                marginTop: '1.5rem',
                width: '100%',
                maxWidth: isMobile ? '260px' : '320px',
                margin: '1.5rem auto 0'
            }}>
                {/* Posts */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '600', color: '#fff' }}>
                        {user.stats.posts}
                    </div>
                    <div style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', color: '#888', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Gönderi
                    </div>
                </div>

                {/* Followers */}
                <div 
                    onClick={() => openFollowModal('followers')}
                    style={{ textAlign: 'center', cursor: 'pointer' }}
                >
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '600', color: '#fff' }}>
                        {user.stats.followers}
                    </div>
                    <div style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', color: '#888', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Takipçi
                    </div>
                </div>

                {/* Following */}
                <div 
                    onClick={() => openFollowModal('following')}
                    style={{ textAlign: 'center', cursor: 'pointer' }}
                >
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '600', color: '#fff' }}>
                        {user.stats.following}
                    </div>
                    <div style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', color: '#888', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Takip
                    </div>
                </div>
            </div>

          </div>
        </motion.div>

        {isEditing && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass"
                    style={{ width: '90%', maxWidth: '600px', borderRadius: '24px', padding: '0', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--gold-primary)' }}
                >
                     {/* HEADER */}
                     <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                         <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--gold-primary)' }}>Profili Düzenle</h2>
                         <button onClick={handleReset} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }} title="Sıfırla">
                             <RotateCcw size={16} /> Sıfırla
                         </button>
                     </div>

                     {/* TABS */}
                     <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                         {['genel', 'detay', 'hobi'].map(tab => (
                             <button 
                                key={tab}
                                onClick={() => setEditTab(tab as any)}
                                style={{ 
                                    flex: 1, padding: '1rem', background: editTab === tab ? 'rgba(255,215,0,0.1)' : 'transparent',
                                    color: editTab === tab ? 'var(--gold-primary)' : '#aaa', border: 'none',
                                    borderBottom: editTab === tab ? '2px solid var(--gold-primary)' : '2px solid transparent',
                                    cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem'
                                }}
                             >
                                {tab === 'genel' ? 'Genel' : tab === 'detay' ? 'Detaylar' : 'İlgi Alanları'}
                             </button>
                         ))}
                     </div>

                     {/* CONTENT */}
                     <div style={{ padding: '2rem' }}>
                         {editTab === 'genel' && (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                                       <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', overflow: 'visible' }}>
                                           <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--gold-primary)' }}>
                                               <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                           </div>
                                           <input type="file" id="modal-avatar" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                           <label 
                                               htmlFor="modal-avatar" 
                                               style={{ 
                                                   position: 'absolute', 
                                                   bottom: '0', 
                                                   right: '0',
                                                   width: '32px',
                                                   height: '32px',
                                                   borderRadius: '50%',
                                                   background: 'var(--gold-primary)',
                                                   display: 'flex',
                                                   alignItems: 'center',
                                                   justifyContent: 'center',
                                                   cursor: 'pointer',
                                                   boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                                                   border: '2px solid #000'
                                               }}
                                           >
                                               <Camera size={16} color="#000" />
                                           </label>
                                       </div>
                                  </div>
                                  
                                  <div>
                                      <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'block' }}>İsim Soyisim</label>
                                      <input value={user.fullName} onChange={e => setUser({...user, fullName: e.target.value})} style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', fontSize: '1rem' }} />
                                  </div>
                                  <div>
                                      <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'block' }}>Biyografi</label>
                                      <textarea value={user.bio} onChange={e => setUser({...user, bio: e.target.value})} style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', fontSize: '1rem', minHeight: '100px', resize: 'vertical' }} />
                                  </div>
                             </div>
                         )}

                         {editTab === 'detay' && (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1.2rem' : '2rem' }}>
                                 
                                 {/* LOCATION */}
                                 <div>
                                      <label style={{ color: '#aaa', fontSize: isMobile ? '0.75rem' : '0.9rem', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Şehir / Konum</label>
                                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                                          <input 
                                              value={user.location.city} 
                                              onChange={e => setUser({...user, location: { ...user.location, city: e.target.value }})} 
                                              placeholder="Örn: İstanbul"
                                              style={{ flex: 1, padding: isMobile ? '0.7rem' : '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', fontSize: isMobile ? '0.9rem' : '1rem' }} 
                                          />
                                          <button 
                                              onClick={handleGeolocation}
                                              title="Konumumu Bul"
                                              style={{ 
                                                  padding: isMobile ? '0 0.8rem' : '0 1.2rem', background: 'rgba(255,215,0,0.1)', border: '1px solid var(--gold-primary)', 
                                                  borderRadius: '12px', color: 'var(--gold-primary)', cursor: 'pointer',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                              }}
                                          >
                                              <MapPin size={isMobile ? 18 : 20} />
                                          </button>
                                      </div>
                                 </div>

                                 {/* INTERESTED IN */}
                                 <div>
                                     <label style={{ color: '#aaa', fontSize: isMobile ? '0.75rem' : '0.9rem', marginBottom: isMobile ? '0.5rem' : '1rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>İlgilendiğim Cinsiyet</label>
                                     <div style={{ display: 'flex', gap: isMobile ? '0.5rem' : '0.8rem' }}>
                                         {['Erkek', 'Kadın'].map(gender => {
                                             const isSelected = user.interestedIn.includes(gender);
                                             return (
                                                 <button
                                                     key={gender}
                                                     onClick={() => {
                                                         const current = user.interestedIn;
                                                         const newInterests = isSelected ? current.filter(g => g !== gender) : [...current, gender];
                                                         setUser({...user, interestedIn: newInterests});
                                                     }}
                                                     style={{ 
                                                         flex: 1, padding: isMobile ? '0.6rem' : '0.8rem', borderRadius: '12px',
                                                         background: isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
                                                         color: isSelected ? '#000' : '#ccc',
                                                         border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                         cursor: 'pointer', transition: 'all 0.2s', fontWeight: isSelected ? 'bold' : 'normal',
                                                         fontSize: isMobile ? '0.85rem' : '1rem'
                                                     }}
                                                 >
                                                     {gender}
                                                 </button>
                                             )
                                         })}
                                     </div>
                                 </div>

                                 {/* GENDER */}
                                 <div>
                                    <label style={{ color: '#aaa', fontSize: isMobile ? '0.75rem' : '0.9rem', marginBottom: isMobile ? '0.5rem' : '1rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Cinsiyet (Sen)</label>
                                    <div style={{ display: 'flex', gap: isMobile ? '0.4rem' : '0.8rem', flexWrap: 'wrap' }}>
                                        {['Erkek', 'Kadın', 'Diğer'].map(opt => {
                                            const isActive = (user.details?.gender || 'Belirtilmedi') === opt;
                                            return (
                                                <button
                                                    key={opt}
                                                    onClick={() => setUser({...user, details: { ...user.details, gender: opt }})}
                                                    style={{ 
                                                        flex: 1, minWidth: isMobile ? '60px' : '80px', padding: isMobile ? '0.5rem' : '0.8rem', borderRadius: '12px',
                                                        background: isActive ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
                                                        color: isActive ? '#000' : '#ccc',
                                                        border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: isActive ? 'bold' : 'normal',
                                                        fontSize: isMobile ? '0.8rem' : '1rem'
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {/* Belirtilmedi as separate full-width button */}
                                    <button
                                        onClick={() => setUser({...user, details: { ...user.details, gender: 'Belirtilmedi' }})}
                                        style={{ 
                                            width: '100%', marginTop: isMobile ? '0.4rem' : '0.5rem', padding: isMobile ? '0.5rem' : '0.8rem', borderRadius: '12px',
                                            background: (user.details?.gender || 'Belirtilmedi') === 'Belirtilmedi' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
                                            color: (user.details?.gender || 'Belirtilmedi') === 'Belirtilmedi' ? '#000' : '#ccc',
                                            border: (user.details?.gender || 'Belirtilmedi') === 'Belirtilmedi' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                            cursor: 'pointer', transition: 'all 0.2s', fontWeight: (user.details?.gender || 'Belirtilmedi') === 'Belirtilmedi' ? 'bold' : 'normal',
                                            fontSize: isMobile ? '0.8rem' : '1rem'
                                        }}
                                    >
                                        Belirtilmedi
                                    </button>
                                 </div>

                                 {/* RELATIONSHIP */}
                                 <div>
                                    <label style={{ color: '#aaa', fontSize: isMobile ? '0.75rem' : '0.9rem', marginBottom: isMobile ? '0.5rem' : '1rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>İlişki Hedefi</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '0.4rem' : '0.8rem' }}>
                                        {['Ciddi İlişki', 'Sadece Eğlence', 'Arkadaşlık', 'Belirsiz'].map(opt => {
                                            const isActive = (user.details?.relationshipGoal || 'Belirtilmedi') === opt;
                                            return (
                                                <button
                                                    key={opt}
                                                    onClick={() => setUser({...user, details: { ...user.details, relationshipGoal: opt }})}
                                                    style={{ 
                                                        padding: isMobile ? '0.5rem' : '0.8rem', borderRadius: '12px',
                                                        background: isActive ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
                                                        color: isActive ? '#000' : '#ccc',
                                                        border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: isActive ? 'bold' : 'normal',
                                                        fontSize: isMobile ? '0.8rem' : '1rem'
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            )
                                        })}
                                    </div>
                                 </div>

                                 {/* SMOKING */}
                                 <div>
                                    <label style={{ color: '#aaa', fontSize: isMobile ? '0.75rem' : '0.9rem', marginBottom: isMobile ? '0.5rem' : '1rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Sigara</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: isMobile ? '0.4rem' : '0.8rem' }}>
                                        {['Kullanıyorum', 'Kullanmıyorum', 'Sosyal İçici'].map(opt => {
                                            const isActive = (user.details?.smoking || 'Belirtilmedi') === opt;
                                            return (
                                                <button
                                                    key={opt}
                                                    onClick={() => setUser({...user, details: { ...user.details, smoking: opt }})}
                                                    style={{ 
                                                        padding: isMobile ? '0.5rem' : '0.8rem', borderRadius: '12px',
                                                        background: isActive ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
                                                        color: isActive ? '#000' : '#ccc',
                                                        border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: isActive ? 'bold' : 'normal',
                                                        fontSize: isMobile ? '0.75rem' : '1rem'
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            )
                                        })}
                                    </div>
                                 </div>
                             </div>
                         )}

                         {editTab === 'hobi' && (
                             <div>
                                 <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem' }}>İlgi alanlarınızı seçin:</p>
                                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                                     {AVAILABLE_HOBBIES.map(hobby => {
                                         const isSelected = user.details?.hobbies?.includes(hobby);
                                         return (
                                             <button 
                                                 key={hobby}
                                                 onClick={() => {
                                                     const current = user.details?.hobbies || [];
                                                     const newHobbies = isSelected ? current.filter(h => h !== hobby) : [...current, hobby];
                                                     setUser({...user, details: { ...user.details, hobbies: newHobbies }});
                                                 }}
                                                 style={{ 
                                                     padding: '0.6rem 1.2rem', borderRadius: '20px', 
                                                     border: isSelected ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.2)',
                                                     background: isSelected ? 'rgba(255,215,0,0.1)' : 'transparent',
                                                     color: isSelected ? 'var(--gold-primary)' : '#ccc',
                                                     cursor: 'pointer', transition: 'all 0.2s'
                                                 }}
                                             >
                                                 {hobby}
                                             </button>
                                         )
                                     })}
                                 </div>
                             </div>
                         )}

                         {/* FOOTER ACTIONS */}
                         <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                             <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '12px', cursor: 'pointer' }}>Vazgeç</button>
                             <button onClick={handleSave} style={{ flex: 1, padding: '1rem', background: 'var(--gold-primary)', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>KAYDET</button>
                         </div>
                     </div>
                </motion.div>
            </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div style={{ 
                background: 'rgba(0,0,0,0.3)', borderRadius: '100px', padding: '0.5rem', 
                display: 'flex', border: '1px solid var(--glass-border)'
            }}>
                <button 
                    onClick={() => setActiveTab('photos')}
                    style={{ 
                        padding: '0.8rem 2rem', borderRadius: '100px', border: 'none', 
                        background: activeTab === 'photos' ? 'var(--gold-primary)' : 'transparent',
                        color: activeTab === 'photos' ? '#000' : 'var(--text-secondary)',
                        fontWeight: activeTab === 'photos' ? 'bold' : 'normal',
                        cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Grid size={18} />
                    PAYLAŞIMLAR
                </button>
                {isOwner && (
                    <button 
                         onClick={() => setActiveTab('settings')}
                         style={{ 
                            padding: '0.8rem 2rem', borderRadius: '100px', border: 'none', 
                            background: activeTab === 'settings' ? 'var(--gold-primary)' : 'transparent',
                            color: activeTab === 'settings' ? '#000' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'settings' ? 'bold' : 'normal',
                            cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <Settings size={18} />
                        AYARLAR
                    </button>
                )}
            </div>
        </div>

        {/* Content */}
        {activeTab === 'photos' ? (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
             >
               {/* Upload Button for Owner */}
               {isOwner && (
                   <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                       <input 
                           type="file" 
                           id="photo-upload" 
                           accept="image/*" 
                           onChange={handlePhotoUpload} 
                           style={{ display: 'none' }}
                       />
                       <label 
                           htmlFor="photo-upload"
                           className="btn-primary"
                           style={{ 
                               padding: '0.8rem 1.5rem', 
                               borderRadius: '12px', 
                               cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                               fontSize: '0.9rem', width: 'auto' // ensure it doesn't stretch
                           }}
                       >
                           <Camera size={18} /> Fotoğraf Yükle
                       </label>
                   </div>
               )}

               <div className="photo-grid" style={{ 
                   display: 'grid', 
                   gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', 
                   gap: isMobile ? '3px' : '1rem' 
               }}>
                   {photos.length > 0 ? photos.map((img, index) => (
                     <div key={index} onClick={() => setSelectedPhoto(img)} style={{ 
                         aspectRatio: '1', borderRadius: isMobile ? '4px' : '12px', overflow: 'hidden', 
                         border: '1px solid rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer' 
                     }}>
                         <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} className="hover-scale" />
                         
                         {isOwner && (
                             <button
                                 onClick={(e) => { e.stopPropagation(); handleDeletePhoto(img, index); }}
                                 style={{
                                     position: 'absolute', top: '10px', right: '10px',
                                     width: '32px', height: '32px', borderRadius: '50%',
                                     background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                                     border: 'none', color: '#FF3B30',
                                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                                     cursor: 'pointer', zIndex: 10
                                 }}
                             >
                                 <Trash2 size={16} />
                             </button>
                         )}
                     </div>
                   )) : (
                       <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>
                           <Camera size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                           <p>Henüz paylaşım yapılmamış.</p>
                       </div>
                   )}
               </div>
             </motion.div>
        ) : (
            isOwner && (
                <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="glass"
                 style={{ padding: '2rem', borderRadius: '24px' }}
                >
                   <h3 style={{ marginBottom: '1.5rem', color: 'var(--gold-primary)' }}>Hesap</h3>
                   
                   {/* PRIVACY TOGGLE */}
                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', borderBottom: '1px solid var(--glass-border)', alignItems: 'center' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>Gizli Hesap</span>
                            {!user.isMember && <Lock size={16} color="var(--gold-primary)" />}
                       </div>
                       
                       <div 
                           onClick={() => user.isMember && setSettings(s => ({...s, privacy: !s.privacy}))}
                           style={{
                               width: '56px', height: '32px', 
                               background: settings.privacy ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)', 
                               borderRadius: '50px', position: 'relative', 
                               cursor: user.isMember ? 'pointer' : 'not-allowed',
                               opacity: user.isMember ? 1 : 0.5, 
                               transition: 'all 0.3s ease',
                               border: '1px solid rgba(255,255,255,0.1)'
                           }}
                       >
                           <div style={{
                               width: '26px', height: '26px', background: '#fff', borderRadius: '50%',
                               position: 'absolute', top: '2px', left: settings.privacy ? '26px' : '2px',
                               transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                               boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                           }} />
                       </div>
                   </div>

                   {/* NOTIFICATIONS TOGGLE */}
                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', borderBottom: '1px solid var(--glass-border)', alignItems: 'center' }}>
                       <span style={{ fontSize: '1.1rem' }}>Bildirimler</span>
                       <div 
                            onClick={handleNotificationToggle}
                           style={{
                               width: '56px', height: '32px', 
                               background: settings.notifications ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)', 
                               borderRadius: '50px', position: 'relative', cursor: 'pointer',
                               transition: 'all 0.3s ease',
                               border: '1px solid rgba(255,255,255,0.1)'
                           }}
                       >
                           <div style={{
                               width: '26px', height: '26px', background: '#fff', borderRadius: '50%',
                               position: 'absolute', top: '2px', left: settings.notifications ? '26px' : '2px',
                               transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                               boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                           }} />
                       </div>
                   </div>

                   {/* SAVE BUTTON */}
                   <button 
                       onClick={handleSaveSettings}
                       disabled={saveStatus === 'saving' || saveStatus === 'success'}
                       style={{ 
                           width: '100%', padding: '1rem', marginTop: '2rem',
                           background: saveStatus === 'success' ? '#4CAF50' : (saveStatus === 'error' ? '#FF3B30' : 'var(--gold-primary)'), 
                           color: '#000', 
                           border: 'none', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold',
                           fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px',
                           boxShadow: '0 5px 15px rgba(255, 215, 0, 0.2)',
                           transition: 'all 0.3s ease'
                       }}
                   >
                       {saveStatus === 'saving' ? 'KAYDEDİLİYOR...' : (saveStatus === 'success' ? 'KAYDEDİLDİ' : (saveStatus === 'error' ? 'HATA!' : 'AYARLARI KAYDET'))}
                   </button>

                   <button 
                      onClick={() => { localStorage.removeItem('vault_token'); window.location.href='/login'; }}
                      style={{ 
                          marginTop: '1rem', width: '100%', padding: '1rem', 
                          background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', 
                          border: 'none', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold',
                          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
                      }}
                   >
                       <LogOut size={20} /> Çıkış Yap
                   </button>
                </motion.div>
            )
        )}

       </div>

       {/* CUSTOM DELETE MODAL */}
       {photoToDelete && (
           <div style={{
               position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
               background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               zIndex: 1000
           }} onClick={() => setPhotoToDelete(null)}>
               <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
                   style={{
                       background: '#1a1a1a',
                       border: '1px solid var(--gold-primary)',
                       borderRadius: '16px',
                       padding: '2rem',
                       maxWidth: '90%',
                       width: '400px',
                       textAlign: 'center',
                       boxShadow: '0 0 30px rgba(255, 215, 0, 0.15)'
                   }}
               >
                   <div style={{ 
                       width: '60px', height: '60px', borderRadius: '50%', 
                       background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30',
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       margin: '0 auto 1.5rem auto'
                   }}>
                       <Trash2 size={32} />
                   </div>
                   
                   <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>Fotoğrafı Sil?</h3>
                   <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                       Bu işlem geri alınamaz. Fotoğrafı silmek istediğinize emin misiniz?
                   </p>
                   
                   <div style={{ display: 'flex', gap: '1rem' }}>
                       <button 
                           onClick={() => setPhotoToDelete(null)}
                           style={{
                               flex: 1, padding: '1rem', borderRadius: '12px',
                               background: 'rgba(255,255,255,0.1)', color: '#fff',
                               border: 'none', cursor: 'pointer', fontWeight: 'bold'
                           }}
                       >
                           Vazgeç
                       </button>
                       <button 
                           onClick={confirmDelete}
                           style={{
                               flex: 1, padding: '1rem', borderRadius: '12px',
                               background: 'var(--gold-primary)', color: '#000',
                               border: 'none', cursor: 'pointer', fontWeight: 'bold'
                           }}
                       >
                           Sil
                       </button>
                   </div>
               </motion.div>
           </div>
       )}

       {/* FULL SCREEN PHOTO MODAL */}
       {selectedPhoto && (
            <div 
                onClick={() => setSelectedPhoto(null)} 
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.95)', zIndex: 3000, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', backdropFilter: 'blur(5px)'
                }}
            >
                <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', display: 'flex', justifyContent: 'center' }}>
                     <button 
                        onClick={() => setSelectedPhoto(null)}
                        style={{
                            position: 'fixed', top: '20px', right: '20px',
                            background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                            cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3001
                        }}
                    >
                        <X size={24} />
                    </button>
                    <img 
                        src={selectedPhoto || undefined} 
                        style={{ 
                            maxWidth: '100%', maxHeight: '90vh', 
                            borderRadius: '4px', 
                            boxShadow: '0 0 50px rgba(0,0,0,0.8)' 
                        }} 
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            </div>
        )}

        {/* FOLLOWERS/FOLLOWING MODAL */}
        {followModal && (
            <div 
                style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
                    zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }}
                onClick={() => setFollowModal(null)}
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass"
                    style={{ 
                        width: '100%', maxWidth: '450px', maxHeight: '80vh',
                        borderRadius: '24px', overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div style={{ 
                        padding: '1.25rem', 
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(0,0,0,0.3)'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={20} color="var(--gold-primary)" />
                            {followModal.type === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
                        </h3>
                        <button 
                            onClick={() => setFollowModal(null)}
                            style={{ 
                                background: 'rgba(255,255,255,0.1)', 
                                border: 'none', 
                                color: '#fff', 
                                cursor: 'pointer',
                                borderRadius: '50%',
                                width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* User List */}
                    <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0.5rem' }}>
                        {loadingFollows ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                                Yükleniyor...
                            </div>
                        ) : followModal.users.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                                <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                <p>{followModal.type === 'followers' ? 'Henüz takipçi yok' : 'Henüz takip edilen yok'}</p>
                            </div>
                        ) : (
                            followModal.users.map((u) => (
                                <Link 
                                    key={u.username}
                                    to={`/profile/${u.username}`}
                                    onClick={() => setFollowModal(null)}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '0.8rem 1rem', borderRadius: '12px',
                                        textDecoration: 'none', color: '#fff',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Avatar */}
                                    <div style={{ 
                                        width: '50px', height: '50px', borderRadius: '50%', 
                                        overflow: 'hidden', background: '#222',
                                        border: u.isMember ? '2px solid var(--gold-primary)' : '2px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <img 
                                            src={u.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} 
                                            alt={u.username}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ 
                                            fontWeight: 600, fontSize: '1rem',
                                            display: 'flex', alignItems: 'center', gap: '0.4rem'
                                        }}>
                                            {u.fullName || u.username}
                                            {u.isMember && <Crown size={14} fill="#FFD700" color="#FFD700" />}
                                            {u.isVerified && <UserCheck size={14} color="#3399ff" />}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#888' }}>
                                            @{u.username}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        )}
    </div>
  )
}

export default Profile
