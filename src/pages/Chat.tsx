import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, MoreVertical, MessageSquare, ArrowLeft, Trash2, Ban, Flag } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

interface Message {
    id: string; 
    text: string;
    isMe: boolean;
    time: string;
}

interface ChatUser {
    username: string;
    avatar: string;
}

const Chat = () => {
  const [searchParams] = useSearchParams();
  const targetUsername = searchParams.get('user');

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [activeChatUser, setActiveChatUser] = useState<ChatUser | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchMessages = async (username: string) => {
      const token = localStorage.getItem('vault_token');
      if (!token) return;

      try {
          const res = await fetch(`/api/messages/${username}`, {
              headers: { 'Authorization': token }
          });
          const data = await res.json();
          if (data.success) {
              const formattedMessages: Message[] = data.messages.map((msg: any) => ({
                  id: msg._id,
                  text: msg.text,
                  isMe: msg.sender !== username, 
                  time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }));
              setMessages(formattedMessages);
          }
      } catch (err) {
          console.error(err);
      }
  };

  useEffect(() => {
      if (targetUsername) {
          setActiveChatUser({
              username: targetUsername,
              avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
          });
          fetchMessages(targetUsername);
      }
  }, [targetUsername]);

  useEffect(() => {
      if (!activeChatUser) return;
      const interval = setInterval(() => {
          fetchMessages(activeChatUser.username);
      }, 3000);
      return () => clearInterval(interval);
  }, [activeChatUser]);

  const handleDeleteClick = (id: string) => {
    setMessageToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;

    const token = localStorage.getItem('vault_token');
    if (!token) return;

    try {
        const res = await fetch(`/api/messages/${messageToDelete}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        const data = await res.json();
        if (data.success) {
            setMessages(prev => prev.filter(m => m.id !== messageToDelete));
            setShowDeleteModal(false);
            setMessageToDelete(null);
        } else {
            setNotification("Silinemedi: " + data.error);
        }
    } catch (err) {
        console.error(err);
    }
  };

  const handleBlock = () => {
      if(!activeChatUser) return;
      setShowBlockModal(true);
      setShowMenu(false);
  };

  const confirmBlock = async () => {
      if(!activeChatUser) return;
      
      const token = localStorage.getItem('vault_token');
      if (!token) return;

      try {
          const res = await fetch(`/api/users/block/${activeChatUser.username}`, {
              method: 'POST',
              headers: { 'Authorization': token }
          });
          const data = await res.json();
          
          if (data.success) {
              setNotification(`@${activeChatUser.username} engellendi.`);
              setShowBlockModal(false);
              setTimeout(() => {
                  setActiveChatUser(null);
                  setNotification(null);
              }, 2000);
          } else {
              setNotification('Hata: ' + data.error);
              setShowBlockModal(false);
          }
      } catch (err) {
          console.error(err);
          setNotification('Bir hata oluştu.');
      }
  };

  const handleReport = () => {
        if(!activeChatUser) return;
        setReportReason("");
        setReportDescription("");
        setShowReportModal(true);
        setShowMenu(false);
  };

  const submitReport = async () => {
        if (!reportReason) {
            setNotification("Lütfen bir şikayet nedeni seçin.");
            return;
        }
        const token = localStorage.getItem('vault_token');
        if (!token || !activeChatUser) return;

        try {
            const res = await fetch(`/api/users/report/${activeChatUser.username}`, {
                method: 'POST',
                headers: { 
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: reportReason, description: reportDescription })
            });
            const data = await res.json();
            if (data.success) {
                setNotification("Kullanıcı şikayet edildi. Teşekkürler.");
                setShowReportModal(false);
            } else {
                setNotification("Hata: " + data.error);
            }
        } catch (err) {
            console.error(err);
            setNotification("Bir hata oluştu.");
        }
  };

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim() || !activeChatUser) return;
      
      const token = localStorage.getItem('vault_token');
      if (!token) return;

      try {
          const res = await fetch('/api/messages', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': token
              },
              body: JSON.stringify({
                  receiver: activeChatUser.username,
                  text: inputText
              })
          });
          const data = await res.json();
          if (data.success) {
              setInputText("");
              fetchMessages(activeChatUser.username); 
          } else {
              setNotification("Mesaj gönderilemedi: " + (data.error || "Bilinmeyen hata"));
          }
      } catch (err) {
          console.error(err);
      }
  };

  const [conversations, setConversations] = useState<any[]>([]);

  const fetchConversations = async () => {
      const token = localStorage.getItem('vault_token');
      if (!token) return;

      try {
          const res = await fetch('/api/messages/conversations', {
              headers: { 'Authorization': token }
          });
          const data = await res.json();
          if (data.success) {
              setConversations(data.conversations);
          }
      } catch (err) {
          console.error(err);
      }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ paddingTop: '80px', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
        <div className="chat-container" style={{ 
            flex: 1, display: 'flex', overflow: 'hidden',
            width: '100%', maxWidth: '1200px', margin: '0 auto',
            boxShadow: '0 0 50px rgba(0,0,0,0.5)',
            border: '1px solid #333', borderRadius: '12px'
        }}>
            
            {/* Sidebar (Chat List) */}
            <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`chat-sidebar ${activeChatUser ? 'hidden-on-mobile' : ''}`}
                style={{ 
                    width: '350px', display: 'flex', flexDirection: 'column', 
                    background: '#111', borderRight: '1px solid #222' 
                }}
            >
                <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #222' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', marginBottom: '1rem' }}>Mesajlar</h2>
                    {/* Fake Search */}
                    <div style={{ background: '#222', padding: '0.8rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ArrowLeft size={16} color="#666" style={{ transform: 'rotate(180deg)' }} /> 
                        <input placeholder="Sohbetlerde ara..." style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontSize: '0.9rem' }} />
                    </div>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {conversations.length > 0 ? conversations.map((conv, idx) => (
                        <div 
                            key={idx}
                            onClick={() => {
                                setActiveChatUser({ username: conv.username, avatar: conv.avatar });
                                setMessages([]); 
                                fetchMessages(conv.username);
                            }}
                            className="chat-item"
                            style={{ 
                                padding: '1.2rem 1.5rem', 
                                background: activeChatUser?.username === conv.username ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                borderLeft: activeChatUser?.username === conv.username ? '4px solid var(--gold-primary)' : '4px solid transparent',
                                cursor: 'pointer', display: 'flex', gap: '1rem', alignItems: 'center',
                                transition: 'all 0.2s', borderBottom: '1px solid #1a1a1a'
                            }}
                        >
                             <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#333', overflow: 'hidden', flexShrink: 0 }}>
                                 <img src={conv.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                             </div>
                             <div style={{ flex: 1, minWidth: 0 }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                     <h4 style={{ color: activeChatUser?.username === conv.username ? 'var(--gold-primary)' : '#fff', fontSize: '1rem', fontWeight: 600 }}>{conv.username}</h4>
                                     <span style={{ fontSize: '0.7rem', color: '#666' }}>12:30</span>
                                 </div>
                                 <p style={{ fontSize: '0.85rem', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                     {conv.lastMessage || 'Resim gönderildi'}
                                 </p>
                             </div>
                        </div>
                    )) : (
                        <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '4rem', color: 'var(--text-secondary)' }}>
                            <p>Henüz mesaj yok.</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Chat Area */}
            <div 
                className={`chat-window ${!activeChatUser ? 'hidden-on-mobile' : ''}`}
                style={{ 
                    flex: 1, display: 'flex', flexDirection: 'column', 
                    background: '#000', position: 'relative'
                }}
            >
                {activeChatUser ? (
                    <>
                        {/* Notification Toast */}
                        {notification && (
                            <motion.div
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -50, opacity: 0 }}
                                style={{
                                    position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)',
                                    background: 'rgba(20, 20, 20, 0.9)', backdropFilter: 'blur(10px)',
                                    border: '1px solid var(--gold-primary)', color: 'var(--gold-primary)',
                                    padding: '0.8rem 2rem', borderRadius: '50px', zIndex: 100,
                                    boxShadow: '0 5px 20px rgba(0,0,0,0.5)'
                                }}
                            >
                                {notification}
                            </motion.div>
                        )}

                        {/* Header */}
                        <div style={{ 
                            padding: '1rem 1.5rem', 
                            background: 'rgba(20,20,20,0.8)', backdropFilter: 'blur(10px)',
                            borderBottom: '1px solid #222', 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            position: 'sticky', top: 0, zIndex: 10
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="mobile-only" onClick={() => setActiveChatUser(null)} style={{ cursor: 'pointer', paddingRight: '0.5rem' }}>
                                    <ArrowLeft size={24} />
                                </div>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#333', overflow: 'hidden' }}>
                                    <img src={activeChatUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{activeChatUser.username}</h3>
                                </div>
                            </div>
                            
                            {/* Menu */}
                            <div style={{ position: 'relative' }}>
                                <div onClick={() => setShowMenu(!showMenu)} style={{ padding: '0.5rem', cursor: 'pointer' }}>
                                     <MoreVertical size={20} color="#666" />
                                </div>
                                {showMenu && (
                                    <div style={{
                                        position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                        background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
                                        padding: '0.5rem', minWidth: '180px', zIndex: 50,
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                                    }} onClick={(e) => e.stopPropagation()}> 
                                        <button 
                                            onClick={handleBlock}
                                            style={{ 
                                                background: 'transparent', border: 'none', color: '#ff6b6b', 
                                                width: '100%', textAlign: 'left', padding: '0.8rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem',
                                                borderRadius: '8px',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <Ban size={16} />
                                            Kullanıcıyı Engelle
                                        </button>
                                        <button 
                                            onClick={handleReport}
                                            style={{ 
                                                background: 'transparent', border: 'none', color: '#e0e0e0', // Light gray/white
                                                width: '100%', textAlign: 'left', padding: '0.8rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem',
                                                borderRadius: '8px', borderTop: '1px solid #333'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <Flag size={16} />
                                            Şikayet Et
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Messages Content */}
                        <div style={{ 
                            flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem',
                            backgroundImage: 'radial-gradient(circle at center, #111 0%, #000 100%)'
                        }} onClick={() => setShowMenu(false)}>
                            {messages.map(msg => (
                                <div key={msg.id} style={{ 
                                    alignSelf: msg.isMe ? 'flex-end' : 'flex-start', 
                                    maxWidth: '70%',
                                    display: 'flex', gap: '1rem',
                                    flexDirection: msg.isMe ? 'row' : 'row'
                                }}>
                                    {/* Avatar for Other */}
                                    {!msg.isMe && (
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', marginTop: 'auto' }}>
                                             <img src={activeChatUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isMe ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ 
                                            padding: '1rem 1.2rem', 
                                            borderRadius: '18px', 
                                            background: msg.isMe ? 'linear-gradient(135deg, var(--gold-primary) 0%, #e6be8a 100%)' : '#222',
                                            color: msg.isMe ? '#000' : '#e0e0e0',
                                            boxShadow: msg.isMe ? '0 4px 15px rgba(212, 175, 55, 0.2)' : 'none',
                                            fontSize: '0.95rem', lineHeight: '1.5',
                                            borderBottomRightRadius: msg.isMe ? '4px' : '18px',
                                            borderBottomLeftRadius: msg.isMe ? '18px' : '4px',
                                        }}>
                                            {msg.text}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                                            {msg.isMe && (
                                                <button onClick={() => handleDeleteClick(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 0 }}>
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                            <span style={{ fontSize: '0.7rem', color: '#555' }}>{msg.time}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '1.5rem', background: '#0a0a0a', borderTop: '1px solid #222' }}>
                            <form onSubmit={handleSend} style={{ 
                                display: 'flex', gap: '1rem', alignItems: 'center',
                                background: '#181818', padding: '0.5rem 0.5rem 0.5rem 1.5rem',
                                borderRadius: '50px', border: '1px solid #333'
                            }}>
                                <input 
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Bir şeyler yazın..."
                                    style={{ 
                                        flex: 1, background: 'transparent', border: 'none', 
                                        color: '#fff', outline: 'none', fontSize: '1rem'
                                    }}
                                />
                                <button type="submit" disabled={!inputText.trim()} style={{ 
                                    width: '45px', height: '45px', borderRadius: '50%', border: 'none', 
                                    background: inputText.trim() ? 'var(--gold-primary)' : '#333', 
                                    color: inputText.trim() ? '#000' : '#666', 
                                    cursor: inputText.trim() ? 'pointer' : 'default',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    transition: 'all 0.2s'
                                }}>
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid #222' }}>
                           <MessageSquare size={40} color="#333" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.5rem' }}>Mesajlarınız</h2>
                        <p>Sohbet başlatmak için birini seçin.</p>
                    </div>
                )}
            </div>

        </div>

        {/* Custom Delete Confirmation Modal */}
        {showDeleteModal && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ 
                        background: '#1a1a1a', padding: '2rem', borderRadius: '16px', 
                        border: '1px solid var(--glass-border)', maxWidth: '400px', width: '90%',
                        textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}
                >
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#fff' }}>Mesajı silmek istediğinize emin misiniz?</h3>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button 
                            onClick={() => setShowDeleteModal(false)}
                            className="btn-secondary"
                            style={{ padding: '0.8rem 2rem' }}
                        >
                            İptal
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="btn-primary"
                            style={{ padding: '0.8rem 2rem', background: 'red', color: 'white', border: 'none' }}
                        >
                            Sil
                        </button>
                    </div>
                </motion.div>
            </div>
        )}

        {/* Custom Block Confirmation Modal */}
        {showBlockModal && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ 
                        background: '#1a1a1a', padding: '2rem', borderRadius: '16px', 
                        border: '2px solid #ff4444', maxWidth: '400px', width: '90%',
                        textAlign: 'center', boxShadow: '0 10px 40px rgba(255, 68, 68, 0.2)'
                    }}
                >
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#fff' }}>
                        @{activeChatUser?.username} kullanıcısını engellemek istediğinize emin misiniz?
                    </h3>
                    <p style={{ color: '#ff4444', fontWeight: 'bold', marginBottom: '1.5rem', fontSize: '1rem' }}>
                        DİKKAT: Bu işlem geri alınamaz!
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button 
                            onClick={() => setShowBlockModal(false)}
                            className="btn-secondary"
                            style={{ padding: '0.8rem 2rem', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            İptal
                        </button>
                        <button 
                            onClick={confirmBlock}
                            style={{ padding: '0.8rem 2rem', background: '#ff4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ENGELLE
                        </button>
                    </div>
                </motion.div>
            </div>
        )}

        {/* Custom Report Modal */}
        {showReportModal && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ 
                        background: '#1a1a1a', padding: '2rem', borderRadius: '16px', 
                        border: '1px solid var(--gold-primary)', maxWidth: '450px', width: '90%',
                        textAlign: 'left', boxShadow: '0 10px 40px rgba(212, 175, 55, 0.2)'
                    }}
                >
                    <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', color: 'var(--gold-primary)', textAlign: 'center' }}>
                        Kullanıcıyı Şikayet Et
                    </h3>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ color: '#ccc', marginBottom: '0.8rem', fontSize: '0.95rem' }}>Neden şikayet ediyorsunuz?</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {['Taciz veya Zorbalık', 'Nefret Söylemi', 'Uygunsuz İçerik', 'Spam veya Dolandırıcılık', 'Sahte Hesap', 'Diğer'].map(reason => (
                                <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', color: '#fff' }}>
                                    <input 
                                        type="radio" 
                                        name="reportReason" 
                                        value={reason} 
                                        checked={reportReason === reason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        style={{ accentColor: 'var(--gold-primary)', width: '18px', height: '18px' }}
                                    />
                                    {reason}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ color: '#ccc', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Açıklama (İsteğe bağlı):</p>
                        <textarea 
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            placeholder="Detay verebilirsiniz..."
                            style={{ 
                                width: '100%', minHeight: '80px', background: '#222', 
                                border: '1px solid #333', borderRadius: '8px', 
                                padding: '0.8rem', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'vertical' 
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button 
                            onClick={() => setShowReportModal(false)}
                            style={{ padding: '0.8rem 2rem', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            İptal
                        </button>
                        <button 
                            onClick={submitReport}
                            style={{ 
                                padding: '0.8rem 2rem', 
                                background: reportReason ? 'var(--gold-primary)' : '#555', 
                                color: reportReason ? '#000' : '#888', 
                                border: 'none', borderRadius: '8px', 
                                cursor: reportReason ? 'pointer' : 'not-allowed', fontWeight: 'bold' 
                            }}
                            disabled={!reportReason}
                        >
                            Gönder
                        </button>
                    </div>
                </motion.div>
            </div>
        )}

    </div>
  )
}

export default Chat
