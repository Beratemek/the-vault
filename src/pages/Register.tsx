import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
      username: '',
      email: '',
      password: ''
  });
  const [status, setStatus] = useState('IDLE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('PROCESSING');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
             throw new Error("Server returned non-JSON response. Check server logs.");
        }

        const data = await response.json();

        if (data.success) {
            setStatus('SUCCESS');
            setTimeout(() => navigate('/login'), 1500);
        } else {
            alert('Kayıt hatası: ' + (data.error || 'Bilinmeyen hata'));
            setStatus('IDLE');
        }
    } catch (error: any) {
        console.error('Registration Error:', error);
        alert('Bağlantı hatası: ' + (error.message || 'Sunucuya erişilemiyor'));
        setStatus('IDLE');
    }
  };

  return (
    <div className="container" style={{ paddingTop: '150px', paddingBottom: '100px', maxWidth: '500px' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass"
        style={{ padding: '3rem', borderRadius: '24px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Hesap Oluştur</h1>
          <p style={{ color: 'var(--text-secondary)' }}>The Vault dünyasına katılın.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Kullanıcı Adı</label>
             <div style={{ position: 'relative' }}>
                <User size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="Kullanıcı Adı"
                  style={{ 
                    width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', 
                    color: '#fff', borderRadius: '8px', outline: 'none' 
                  }} 
                />
             </div>
          </div>

          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>E-posta Adresi</label>
             <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="ornek@email.com"
                  style={{ 
                    width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', 
                    color: '#fff', borderRadius: '8px', outline: 'none' 
                  }} 
                />
             </div>
          </div>

          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Şifre</label>
             <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  style={{ 
                    width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', 
                    color: '#fff', borderRadius: '8px', outline: 'none' 
                  }} 
                />
             </div>
          </div>

          <button 
             type="submit" 
             className="btn-primary" 
             disabled={status === 'PROCESSING'}
             style={{ 
                 marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                 opacity: status === 'PROCESSING' ? 0.7 : 1
             }}
          >
             {status === 'PROCESSING' ? 'Kaydediliyor...' : 'Kayıt Ol'} <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Zaten hesabınız var mı?</p>
            <Link to="/login" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Giriş Yap</Link>
        </div>

      </motion.div>
    </div>
  )
}

export default Register
