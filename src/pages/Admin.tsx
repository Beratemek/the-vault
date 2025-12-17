import { useState, useEffect } from 'react';
import { 
    Users, Send, CheckSquare, Square, Search, Crown, Shield, EyeOff, 
    Edit, Trash2, Plus, LayoutDashboard, MessageCircle, Activity,
    UserCheck, Eye, RefreshCw
} from 'lucide-react';

// Types
interface UserData {
    username: string;
    fullName: string;
    avatar: string;
    isMember?: boolean;
    isVerified?: boolean;
    isAnonymous?: boolean;
    createdAt?: string;
}

interface DashboardStats {
    totalUsers: number;
    vipUsers: number;
    verifiedUsers: number;
    anonymousUsers: number;
    recentUsers: UserData[];
}

type TabType = 'dashboard' | 'users' | 'messages';

const Admin = () => {
    // State
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [users, setUsers] = useState<UserData[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    // Edit Modal
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [editForm, setEditForm] = useState({ 
        fullName: '', username: '', isMember: false, isVerified: false, isAnonymous: false 
    });
    
    // Create Modal
    const [isCreating, setIsCreating] = useState(false);
    const [createForm, setCreateForm] = useState({ fullName: '', username: '', password: '' });

    // Fetch Data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [usersRes, statsRes] = await Promise.all([
                fetch('/api/admin/users'),
                fetch('/api/admin/dashboard-stats')
            ]);
            const usersData = await usersRes.json();
            const statsData = await statsRes.json();
            
            if (usersData.success) setUsers(usersData.users);
            if (statsData.success) setStats(statsData.stats);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // User Actions
    const handleSelectAll = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(u => u.username));
        }
    };

    const toggleUserSelect = (username: string) => {
        setSelectedUsers(prev => 
            prev.includes(username) 
                ? prev.filter(u => u !== username)
                : [...prev, username]
        );
    };

    const handleBulkAction = async (action: string) => {
        if (selectedUsers.length === 0) return alert('Kullanıcı seçin!');
        
        if (action === 'delete' && !window.confirm(`${selectedUsers.length} kullanıcıyı silmek istediğinize emin misiniz?`)) {
            return;
        }

        try {
            const res = await fetch('/api/admin/bulk-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernames: selectedUsers, action })
            });
            const data = await res.json();
            if (data.success) {
                alert(`${data.affected} kullanıcı etkilendi.`);
                setSelectedUsers([]);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteUser = async (username: string) => {
        if (!window.confirm(`${username} kullanıcısını silmek istediğinize emin misiniz?`)) return;
        
        try {
            const res = await fetch(`/api/admin/users/${username}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                alert('Kullanıcı silindi.');
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        
        try {
            const res = await fetch(`/api/admin/users/${editingUser.username}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (data.success) {
                alert('Kullanıcı güncellendi!');
                setEditingUser(null);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateUser = async () => {
        if (!createForm.username || !createForm.password) {
            return alert('Kullanıcı adı ve şifre zorunlu!');
        }
        
        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm)
            });
            const data = await res.json();
            if (data.success) {
                alert('Kullanıcı oluşturuldu!');
                setIsCreating(false);
                setCreateForm({ fullName: '', username: '', password: '' });
                fetchData();
            } else {
                alert('Hata: ' + data.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim()) return alert('Mesaj yazın!');
        if (selectedUsers.length === 0) return alert('Alıcı seçin!');

        setSending(true);
        try {
            const recipients = selectedUsers.length === users.length ? 'all' : selectedUsers;
            const res = await fetch('/api/admin/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipients, message })
            });
            const data = await res.json();
            if (data.success) {
                alert(`${data.count} kullanıcıya mesaj gönderildi!`);
                setMessage('');
                setSelectedUsers([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.fullName && u.fullName.toLowerCase().includes(search.toLowerCase()))
    );

    // Styles
    const cardStyle: React.CSSProperties = {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid rgba(255,255,255,0.05)'
    };

    const statCardStyle: React.CSSProperties = {
        ...cardStyle,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    };

    const tabStyle = (isActive: boolean): React.CSSProperties => ({
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        background: isActive ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
        color: isActive ? '#000' : '#fff',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s'
    });

    const badgeStyle = (type: 'vip' | 'verified' | 'anonymous'): React.CSSProperties => {
        const colors = {
            vip: { bg: 'var(--gold-primary)', color: '#000' },
            verified: { bg: 'rgba(0,150,255,0.2)', color: '#3399ff' },
            anonymous: { bg: 'rgba(255,255,255,0.1)', color: '#aaa' }
        };
        return {
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: colors[type].bg,
            color: colors[type].color
        };
    };

    return (
        <div style={{ minHeight: '100vh', background: '#000', color: '#fff', paddingTop: '100px', paddingBottom: '100px' }}>
            <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '2rem' }}>
                        <Shield size={32} /> Admin Paneli
                    </h1>
                    <button onClick={fetchData} style={{ ...tabStyle(false), padding: '0.8rem' }} title="Yenile">
                        <RefreshCw size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setActiveTab('dashboard')} style={tabStyle(activeTab === 'dashboard')}>
                        <LayoutDashboard size={20} /> Genel Bakış
                    </button>
                    <button onClick={() => setActiveTab('users')} style={tabStyle(activeTab === 'users')}>
                        <Users size={20} /> Kullanıcı Yönetimi
                    </button>
                    <button onClick={() => setActiveTab('messages')} style={tabStyle(activeTab === 'messages')}>
                        <MessageCircle size={20} /> Toplu Mesaj
                    </button>
                </div>

                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && stats && (
                    <div>
                        {/* Stats Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={statCardStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888' }}>
                                    <Users size={18} /> Toplam Kullanıcı
                                </div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--gold-primary)' }}>{stats.totalUsers}</div>
                            </div>
                            <div style={statCardStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888' }}>
                                    <Crown size={18} /> VIP Üyeler
                                </div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#D4AF37' }}>{stats.vipUsers}</div>
                            </div>
                            <div style={statCardStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888' }}>
                                    <UserCheck size={18} /> Onaylı Üyeler
                                </div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3399ff' }}>{stats.verifiedUsers}</div>
                            </div>
                            <div style={statCardStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888' }}>
                                    <EyeOff size={18} /> Gizli Hesaplar
                                </div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#aaa' }}>{stats.anonymousUsers}</div>
                            </div>
                        </div>

                        {/* Recent Users */}
                        <div style={cardStyle}>
                            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Activity size={20} /> Son Kayıt Olanlar
                            </h3>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {stats.recentUsers.map(user => (
                                    <div key={user.username} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
                                            {user.avatar && <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold' }}>{user.fullName || 'İsimsiz'}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#888' }}>@{user.username}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* USERS TAB */}
                {activeTab === 'users' && (
                    <div style={cardStyle}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Kayıtlı Kullanıcılar ({users.length})</h3>
                            <button 
                                onClick={() => { setIsCreating(true); setCreateForm({ fullName: '', username: '', password: '' }); }}
                                style={{ ...tabStyle(true), padding: '0.8rem 1.5rem' }}
                            >
                                <Plus size={18} /> Yeni Kullanıcı
                            </button>
                        </div>

                        {/* Search & Bulk Actions */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Search size={18} color="#666" />
                                <input 
                                    placeholder="İsim veya kullanıcı adı ara..." 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontSize: '1rem' }}
                                />
                            </div>
                            {selectedUsers.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button onClick={() => handleBulkAction('makeVip')} style={{ padding: '0.6rem 1rem', background: 'rgba(212,175,55,0.2)', color: 'var(--gold-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        <Crown size={14} /> VIP Yap
                                    </button>
                                    <button onClick={() => handleBulkAction('verify')} style={{ padding: '0.6rem 1rem', background: 'rgba(0,150,255,0.2)', color: '#3399ff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        <Shield size={14} /> Onayla
                                    </button>
                                    <button onClick={() => handleBulkAction('delete')} style={{ padding: '0.6rem 1rem', background: 'rgba(255,59,48,0.2)', color: '#FF3B30', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        <Trash2 size={14} /> Sil ({selectedUsers.length})
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Table Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr auto', gap: '1rem', padding: '0.8rem 1rem', color: '#666', fontSize: '0.85rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ cursor: 'pointer' }} onClick={handleSelectAll}>
                                {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? <CheckSquare size={18} color="var(--gold-primary)" /> : <Square size={18} />}
                            </div>
                            <div>KULLANICI</div>
                            <div style={{ textAlign: 'center' }}>DURUM</div>
                            <div style={{ textAlign: 'center' }}>GİZLİLİK</div>
                            <div style={{ textAlign: 'right' }}>İŞLEMLER</div>
                        </div>

                        {/* User Rows */}
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {isLoading ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Yükleniyor...</div>
                            ) : filteredUsers.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Kullanıcı bulunamadı</div>
                            ) : filteredUsers.map(user => (
                                <div 
                                    key={user.username} 
                                    style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: '40px 2fr 1fr 1fr auto', 
                                        gap: '1rem', 
                                        padding: '1rem', 
                                        alignItems: 'center',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Checkbox */}
                                    <div style={{ cursor: 'pointer' }} onClick={() => toggleUserSelect(user.username)}>
                                        {selectedUsers.includes(user.username) ? <CheckSquare size={18} color="var(--gold-primary)" /> : <Square size={18} color="#666" />}
                                    </div>

                                    {/* User Info */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '45px', height: '45px', borderRadius: '50%', overflow: 'hidden', background: '#222', border: '2px solid rgba(255,255,255,0.1)' }}>
                                            {user.avatar && <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{user.fullName || 'İsimsiz'}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#888' }}>@{user.username}</div>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {user.isMember && <span style={badgeStyle('vip')}><Crown size={12} /> VIP</span>}
                                        {user.isVerified && <span style={badgeStyle('verified')}><Shield size={12} /> ONAYLI</span>}
                                        {!user.isMember && !user.isVerified && <span style={{ color: '#555' }}>-</span>}
                                    </div>

                                    {/* Privacy */}
                                    <div style={{ textAlign: 'center' }}>
                                        {user.isAnonymous ? (
                                            <span style={badgeStyle('anonymous')}><EyeOff size={12} /> GİZLİ</span>
                                        ) : (
                                            <span style={{ color: '#555', fontSize: '0.85rem' }}><Eye size={14} /> Açık</span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button 
                                            onClick={() => {
                                                setEditingUser(user);
                                                setEditForm({
                                                    fullName: user.fullName || '',
                                                    username: user.username,
                                                    isMember: user.isMember || false,
                                                    isVerified: user.isVerified || false,
                                                    isAnonymous: user.isAnonymous || false
                                                });
                                            }}
                                            title="Düzenle"
                                            style={{ padding: '0.6rem', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(user.username)}
                                            title="Sil"
                                            style={{ padding: '0.6rem', background: 'rgba(255,59,48,0.1)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.2)', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MESSAGES TAB */}
                {activeTab === 'messages' && (
                    <div>
                        {/* Message Input */}
                        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Toplu Mesaj Gönder</h3>
                            <textarea 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Mesajınızı buraya yazın..."
                                rows={5}
                                style={{ 
                                    width: '100%', 
                                    background: 'rgba(255,255,255,0.05)', 
                                    border: '1px solid #333', 
                                    borderRadius: '12px', 
                                    padding: '1rem', 
                                    color: '#fff', 
                                    fontSize: '1rem', 
                                    outline: 'none', 
                                    resize: 'vertical' 
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <span style={{ color: '#888' }}>
                                    {selectedUsers.length === 0 && 'Aşağıdan alıcı seçin'}
                                    {selectedUsers.length > 0 && selectedUsers.length === users.length && `Tüm kullanıcılara (${users.length})`}
                                    {selectedUsers.length > 0 && selectedUsers.length < users.length && `${selectedUsers.length} kullanıcıya`}
                                </span>
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={sending || !message.trim() || selectedUsers.length === 0}
                                    style={{ 
                                        padding: '1rem 2rem', 
                                        borderRadius: '50px', 
                                        background: sending ? '#333' : 'var(--gold-primary)', 
                                        color: '#000', 
                                        border: 'none', 
                                        fontWeight: 'bold', 
                                        cursor: sending ? 'default' : 'pointer',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.5rem',
                                        opacity: (!message.trim() || selectedUsers.length === 0) ? 0.5 : 1
                                    }}
                                >
                                    <Send size={18} /> {sending ? 'Gönderiliyor...' : 'Gönder'}
                                </button>
                            </div>
                        </div>

                        {/* User Selection */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3>Alıcı Seçimi</h3>
                                <button onClick={handleSelectAll} style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {selectedUsers.length === users.length ? <CheckSquare size={18} /> : <Square size={18} />} Tümünü Seç
                                </button>
                            </div>
                            
                            {/* Search */}
                            <div style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Search size={18} color="#666" />
                                <input 
                                    placeholder="Kullanıcı ara..." 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none' }}
                                />
                            </div>

                            {/* User List */}
                            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {filteredUsers.map(user => (
                                    <div 
                                        key={user.username}
                                        onClick={() => toggleUserSelect(user.username)}
                                        style={{ 
                                            padding: '0.8rem 1rem', 
                                            borderRadius: '12px',
                                            background: selectedUsers.includes(user.username) ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                                            border: selectedUsers.includes(user.username) ? '1px solid var(--gold-primary)' : '1px solid transparent',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '1rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
                                            {user.avatar && <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold' }}>{user.fullName || 'İsimsiz'}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#888' }}>@{user.username}</div>
                                        </div>
                                        {selectedUsers.includes(user.username) && <CheckSquare size={20} color="var(--gold-primary)" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* CREATE USER MODAL */}
                {isCreating && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ ...cardStyle, width: '90%', maxWidth: '450px', background: '#111' }}>
                            <h2 style={{ marginBottom: '1.5rem', color: 'var(--gold-primary)' }}>Yeni Kullanıcı Ekle</h2>
                            
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>Ad Soyad</label>
                                <input 
                                    value={createForm.fullName}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
                                    style={{ width: '100%', padding: '1rem', borderRadius: '10px', background: '#1a1a1a', border: '1px solid #333', color: '#fff', fontSize: '1rem' }}
                                />
                            </div>
                            
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>Kullanıcı Adı *</label>
                                <input 
                                    value={createForm.username}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                                    style={{ width: '100%', padding: '1rem', borderRadius: '10px', background: '#1a1a1a', border: '1px solid #333', color: '#fff', fontSize: '1rem' }}
                                />
                            </div>
                            
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>Şifre *</label>
                                <input 
                                    type="password"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                    style={{ width: '100%', padding: '1rem', borderRadius: '10px', background: '#1a1a1a', border: '1px solid #333', color: '#fff', fontSize: '1rem' }}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => setIsCreating(false)} style={{ padding: '1rem 2rem', background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '12px', cursor: 'pointer' }}>
                                    İptal
                                </button>
                                <button onClick={handleCreateUser} style={{ padding: '1rem 2rem', background: 'var(--gold-primary)', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Oluştur
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* EDIT USER MODAL */}
                {editingUser && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ ...cardStyle, width: '90%', maxWidth: '500px', background: '#111' }}>
                            <h2 style={{ marginBottom: '1.5rem', color: 'var(--gold-primary)' }}>Kullanıcı Düzenle</h2>
                            
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>Ad Soyad</label>
                                <input 
                                    value={editForm.fullName}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                                    style={{ width: '100%', padding: '1rem', borderRadius: '10px', background: '#1a1a1a', border: '1px solid #333', color: '#fff', fontSize: '1rem' }}
                                />
                            </div>
                            
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>Kullanıcı Adı</label>
                                <input 
                                    value={editForm.username}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                    style={{ width: '100%', padding: '1rem', borderRadius: '10px', background: '#1a1a1a', border: '1px solid #333', color: '#fff', fontSize: '1rem' }}
                                />
                            </div>
                            
                            {/* Status Toggles */}
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '1rem', color: '#888', fontSize: '0.9rem' }}>Durum Ayarları</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                    <label style={{ 
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem',
                                        padding: '1.2rem', borderRadius: '16px', cursor: 'pointer',
                                        background: editForm.isMember ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
                                        border: editForm.isMember ? '2px solid var(--gold-primary)' : '2px solid transparent',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input type="checkbox" checked={editForm.isMember} onChange={(e) => setEditForm(prev => ({ ...prev, isMember: e.target.checked }))} style={{ display: 'none' }} />
                                        <Crown size={28} color={editForm.isMember ? 'var(--gold-primary)' : '#555'} />
                                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>VIP Üye</span>
                                    </label>
                                    
                                    <label style={{ 
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem',
                                        padding: '1.2rem', borderRadius: '16px', cursor: 'pointer',
                                        background: editForm.isVerified ? 'rgba(0,150,255,0.15)' : 'rgba(255,255,255,0.03)',
                                        border: editForm.isVerified ? '2px solid #0096FF' : '2px solid transparent',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input type="checkbox" checked={editForm.isVerified} onChange={(e) => setEditForm(prev => ({ ...prev, isVerified: e.target.checked }))} style={{ display: 'none' }} />
                                        <Shield size={28} color={editForm.isVerified ? '#0096FF' : '#555'} />
                                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Onaylı</span>
                                    </label>
                                    
                                    <label style={{ 
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem',
                                        padding: '1.2rem', borderRadius: '16px', cursor: 'pointer',
                                        background: editForm.isAnonymous ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                                        border: editForm.isAnonymous ? '2px solid #fff' : '2px solid transparent',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input type="checkbox" checked={editForm.isAnonymous} onChange={(e) => setEditForm(prev => ({ ...prev, isAnonymous: e.target.checked }))} style={{ display: 'none' }} />
                                        <EyeOff size={28} color={editForm.isAnonymous ? '#fff' : '#555'} />
                                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Gizli</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => setEditingUser(null)} style={{ padding: '1rem 2rem', background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '12px', cursor: 'pointer' }}>
                                    İptal
                                </button>
                                <button onClick={handleUpdateUser} style={{ padding: '1rem 2rem', background: 'var(--gold-primary)', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Admin;
