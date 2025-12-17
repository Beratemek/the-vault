import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(email) {
        setIsSent(true);
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
        {!isSent ? (
            <>
                <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} /> Back to Login
                </Link>

                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Reset Password</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Enter your email to receive recovery instructions.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="vault@member.com"
                            style={{ 
                                width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', 
                                color: '#fff', borderRadius: '8px', outline: 'none' 
                            }} 
                            />
                        </div>
                    </div>

                    <button className="btn-primary" style={{ marginTop: '1rem' }}>Send Recovery Link</button>
                </form>
            </>
        ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                 <CheckCircle size={48} color="var(--gold-primary)" style={{ marginBottom: '1.5rem', margin: '0 auto' }} />
                 <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Check Your Inbox</h2>
                 <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                     We have sent password recovery instructions to <strong>{email}</strong>.
                 </p>
                 <Link to="/login" className="btn-secondary">Return to Login</Link>
            </div>
        )}

      </motion.div>
    </div>
  )
}

export default ForgotPassword
