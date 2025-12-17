import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Lock,ArrowRight, User } from 'lucide-react'

const Login = () => {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('vault_token', data.token);
            // Force reload to update Navbar state and redirect home
            window.location.href = '/'; 
        } else {
             alert('Giriş hatası: ' + data.error);
             setIsLoading(false);
        }
    } catch (err) {
        alert('Bağlantı hatası.');
        setIsLoading(false);
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
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Üye Girişi</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Hoşgeldiniz.</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Kullanıcı Adı</label>
             <div style={{ position: 'relative' }}>
                <User size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı Adı"
                  style={{ 
                    width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', 
                    color: '#fff', borderRadius: '8px', outline: 'none' 
                  }} 
                />
             </div>
          </div>

          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Şifre</label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--gold-primary)' }}>Şifremi Unuttum</Link>
             </div>
             <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
             disabled={isLoading}
             style={{ 
                 marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                 opacity: isLoading ? 0.7 : 1
             }}
          >
             {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'} <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Hesabınız yok mu?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link to="/register" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Kayıt Ol</Link>
            </div>
        </div>

      </motion.div>
    </div>
  )
}

export default Login
