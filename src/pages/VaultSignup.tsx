import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, Check, Lock, AlertCircle} from 'lucide-react'
import { Link } from 'react-router-dom'

const VaultSignup = () => {
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [isAlreadyMember, setIsAlreadyMember] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    // Default selection: 1 Year (Good value)
    const [selectedPlanId, setSelectedPlanId] = useState('1y');

    const plans = [
        { id: '1m', title: '1 Aylık', price: '$100', duration: '30 Gün Erişim', savings: null },
        { id: '3m', title: '3 Aylık', price: '$250', duration: '90 Gün Erişim', savings: '~$83/ay' },
        { id: '1y', title: '1 Yıllık', price: '$750', duration: '365 Gün Erişim', savings: '~$62/ay (Önerilen)' },
        { id: 'life', title: 'Sınırsız', price: '$1000', duration: 'Ömür Boyu Erişim', savings: 'Tek Seferlik Ödeme', highlighted: true }
    ];

    useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
  
    useEffect(() => {
      const checkMembership = async () => {
          const token = localStorage.getItem('vault_token');
          if (token) {
              try {
                  const res = await fetch('/api/auth/me', {
                      headers: { 'Authorization': token }
                  });
                  const data = await res.json();
                  if (data.success && data.user?.isMember) {
                      setIsAlreadyMember(true);
                  }
              } catch (err) {
                  console.error(err);
              }
          }
      };
      checkMembership();
    }, []);
  
    const handleSubscription = async () => {
      setStatus('PROCESSING');
      try {
          const token = localStorage.getItem('vault_token');
          // Simulating a secure token exchange
          const response = await fetch('/api/vault/subscribe', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': token } : {})
              },
              body: JSON.stringify({
                  paymentToken: 'TOK_SECURE_12345',
                  planId: selectedPlanId
              })
          });
          const data = await response.json();
          
          if (data.success) {
              setStatus('SUCCESS');
          } else {
              setStatus('ERROR');
          }
      } catch (e) {
          setStatus('ERROR');
      }
    };
  
    if (status === 'SUCCESS' || isAlreadyMember) {
        return (
          <div className="container" style={{ paddingTop: '150px', textAlign: 'center' }}>
              <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="glass" 
                  style={{ padding: isMobile ? '1.5rem' : '4rem', borderRadius: '24px', maxWidth: '600px', margin: '0 auto' }}
              >
                  <Crown size={64} color="var(--gold-primary)" style={{ marginBottom: '1.5rem' }} />
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>The Vault'a Hoşgeldiniz</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                      {isAlreadyMember ? 'Üyeliğiniz zaten aktif durumda.' : 'Üyeliğiniz aktif. Artık özel üye portalına erişebilirsiniz.'}
                  </p>
                  {!isAlreadyMember && <p style={{ marginTop: '2rem', fontSize: '0.85rem', opacity: 0.7 }}>İşlem ID: TXN-{Date.now()}</p>}
                  
                  <Link to="/profile" className="btn-primary" style={{ marginTop: '2rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      Profilime Git
                  </Link>
              </motion.div>
          </div>
        )
    }
  
    const currentPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

    return (
      <div className="container" style={{ paddingTop: '120px', paddingBottom: '100px', maxWidth: '1000px' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '3rem' }}
        >
          <div style={{ 
              width: '80px', height: '80px', background: 'rgba(212, 175, 55, 0.1)', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem auto', color: 'var(--gold-primary)'
          }}>
              <Crown size={40} />
          </div>
          <h1 style={{ fontSize: isMobile ? '2rem' : '3rem', marginBottom: '1rem', fontFamily: "'Playfair Display', serif" }}>
              Vault Erişim Paketleri
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
              Tam anonimlik, sınırsız erişim ve VIP ayrıcalıklar için size en uygun paketi seçin.
          </p>
        </motion.div>

        {/* Benefits List */}
        <div style={{ 
            display: 'flex', justifyContent: 'center', gap: isMobile ? '1rem' : '2rem', 
            flexWrap: 'wrap', marginBottom: '3rem', opacity: 0.8 
        }}>
            {[
                'Görünmez Mod',
                'Doğrulanmış Üyeler',
                'VIP Mesajlaşma',
                'Öncelikli Destek'
            ].map((benefit, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Check size={18} color="var(--gold-primary)" />
                    <span style={{ fontSize: '0.9rem' }}>{benefit}</span>
                </div>
            ))}
        </div>

        {/* PLANS GRID */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', 
            gap: '1.5rem', marginBottom: '3rem' 
        }}>
            {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isHighlighted = plan.highlighted;

                return (
                    <motion.div
                        key={plan.id}
                        whileHover={{ y: -5 }}
                        onClick={() => setSelectedPlanId(plan.id)}
                        style={{
                            background: isSelected 
                                ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.15), rgba(0,0,0,0.4))' 
                                : 'rgba(255,255,255,0.03)',
                            border: isSelected 
                                ? '1px solid var(--gold-primary)' 
                                : isHighlighted ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid var(--glass-border)',
                            borderRadius: '16px',
                            padding: '2rem 1rem',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            boxShadow: isSelected ? '0 0 30px rgba(212, 175, 55, 0.1)' : 'none'
                        }}
                    >
                        {isHighlighted && (
                            <div style={{ 
                                position: 'absolute', top: '-12px', background: 'var(--gold-primary)', 
                                color: '#000', fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 12px', 
                                borderRadius: '20px', textTransform: 'uppercase'
                            }}>
                                En Popüler
                            </div>
                        )}

                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: isSelected ? 'var(--gold-primary)' : '#fff' }}>
                            {plan.title}
                        </h3>
                        <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: '#fff' }}>
                            {plan.price}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: isSelected ? '#eee' : 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {plan.duration}
                        </p>
                        
                        {plan.savings && (
                            <div style={{ 
                                fontSize: '0.75rem', 
                                color: isHighlighted ? 'var(--gold-primary)' : '#4CAF50',
                                background: isHighlighted ? 'rgba(212, 175, 55, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                                padding: '4px 8px', borderRadius: '4px'
                            }}>
                                {plan.savings}
                            </div>
                        )}

                        {isSelected && (
                             <div style={{ 
                                 marginTop: '1.5rem', width: '24px', height: '24px', 
                                 background: 'var(--gold-primary)', borderRadius: '50%', 
                                 display: 'flex', alignItems: 'center', justifyContent: 'center' 
                             }}>
                                 <Check size={16} color="#000" />
                             </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
  
        {/* PAYMENT ACTION */}
        <motion.div 
            className="glass"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: '2rem', borderRadius: '20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}
        >
            <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Seçilen Paket:</span>
                <span style={{ marginLeft: '0.5rem', color: 'var(--gold-primary)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    {currentPlan.title} ({currentPlan.price})
                </span>
            </div>

            {status === 'ERROR' && (
                <div style={{ marginBottom: '1rem', color: '#ff4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <AlertCircle size={16} /> İşlem başarısız. Lütfen tekrar deneyin.
                </div>
            )}

            <button 
              onClick={handleSubscription}
              className="btn-primary" 
              disabled={status === 'PROCESSING'}
              style={{ 
                  width: '100%', maxWidth: '300px', margin: '0 auto',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', 
                  opacity: status === 'PROCESSING' ? 0.7 : 1,
                  padding: '1rem 2rem'
              }}
            >
              <Lock size={18} /> {status === 'PROCESSING' ? 'İşleniyor...' : `Güvenli Ödeme Yap (${currentPlan.price})`}
            </button>
            
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666' }}>
                Ödemeniz 100% güvenli SSL altypısı ile korunmaktadır.
            </p>
        </motion.div>

      </div>
    )
  }
  
  export default VaultSignup
