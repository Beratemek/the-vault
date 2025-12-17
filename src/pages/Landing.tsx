import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Shield, Crown, ArrowRight } from 'lucide-react'

const Landing = () => {
  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  }

  const stagger: Variants = {
    visible: { transition: { staggerChildren: 0.2 } }
  }

  return (
    <>
      <main>
        <section className="container" style={{ paddingTop: '180px', paddingBottom: '120px', textAlign: 'center', position: 'relative' }}>
          <div className="hero-glow" style={{ top: '20%', left: '10%' }}></div>
          <div className="hero-glow" style={{ bottom: '10%', right: '10%', background: '#4B0082', opacity: '0.1' }}></div>
          
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={stagger}
            style={{ position: 'relative', zIndex: 2 }}
          >
             <motion.h1 
                variants={fadeInUp}
                style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)', marginBottom: '1.5rem', lineHeight: '1.05', letterSpacing: '-0.02em' }}
             >
               <span className="text-gradient-gold">Ayrıcalığın</span><br /> Bağlantıyla Buluştuğu Yer
             </motion.h1>
             <motion.p 
                variants={fadeInUp}
                style={{ fontSize: '1.25rem', marginBottom: '3.5rem', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', color: 'var(--text-secondary)' }}
             >
               Dünyanın en özel tanışma topluluğu. <br/>
               Seçkinler için anonim üyelik. Çekici profiller için doğrulanmış güvenilirlik.
             </motion.p>
             
             <motion.div 
                variants={fadeInUp}
                style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '3rem' }}
             >
                <Link to="/register">
                  <button className="btn-primary">Aramıza Katıl</button>
                </Link>
             </motion.div>
          </motion.div>
        </section>

        {/* Features / Types */}
        <section className="container" style={{ paddingBottom: '60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
             <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="glass feature-card" 
                style={{ padding: '3rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
             >
                 <div style={{ marginBottom: '1.5rem', color: 'var(--gold-primary)', padding: '1rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '12px' }}>
                    <Crown size={32} />
                 </div>
                 <h3 style={{ color: '#fff', marginBottom: '0.75rem', fontSize: '1.75rem' }}>👑 VIP Üyeler</h3>
                 <p style={{ marginBottom: '2rem', flex: 1, lineHeight: '1.8' }}>
                     <strong style={{ color: 'var(--gold-primary)' }}>Zengin sosyete ve A-sınıf üyeler</strong> için özel erişim. 
                     Doğrulanmış kaliteli profilleri keşfet, beğen ve istediğin kişiye ilk mesajı sen at.
                     Kimliğin gizli kalır, şıklığın korunur.
                 </p>
                 <Link to="/join/member" style={{ fontSize: '0.9rem', fontWeight: '700', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
                    VIP Üye Ol <ArrowRight size={16} />
                 </Link>
             </motion.div>

             <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="glass feature-card" 
                style={{ padding: '3rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
             >
                 <div style={{ marginBottom: '1.5rem', color: 'var(--gold-primary)', padding: '1rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '12px' }}>
                    <Shield size={32} />
                 </div>
                 <h3 style={{ color: '#fff', marginBottom: '0.75rem', fontSize: '1.75rem' }}>✨ Doğrulanmış Profiller</h3>
                 <p style={{ marginBottom: '2rem', flex: 1, lineHeight: '1.8' }}>
                     <strong style={{ color: 'var(--gold-primary)' }}>Güzel, çekici ve kaliteli</strong> bireyler için ücretsiz üyelik.
                     Yüz doğrulaması yaparak zengin sosyete üyelerinden mesaj al.
                     Profilleri keşfetmek için VIP üyelik gerekir.
                 </p>
                 <Link to="/join/apply" style={{ fontSize: '0.9rem', fontWeight: '700', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
                    Ücretsiz Başvur <ArrowRight size={16} />
                 </Link>
             </motion.div>
        </section>

        {/* How It Works */}
        <section className="container" style={{ paddingBottom: '100px' }}>
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="glass"
                style={{ 
                    padding: '3rem', 
                    borderRadius: '24px', 
                    maxWidth: '900px', 
                    margin: '0 auto',
                    border: '1px solid rgba(255,215,0,0.2)'
                }}
            >
                <h2 style={{ 
                    textAlign: 'center', 
                    marginBottom: '2.5rem', 
                    fontSize: '2rem',
                    color: 'var(--gold-primary)'
                }}>
                    🔐 Nasıl Çalışır?
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                    {/* Step 1 */}
                    <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <div style={{ 
                            width: '60px', height: '60px', borderRadius: '50%',
                            background: 'rgba(255,215,0,0.15)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1rem', fontSize: '1.5rem', fontWeight: 'bold',
                            color: 'var(--gold-primary)', border: '2px solid var(--gold-primary)'
                        }}>1</div>
                        <h4 style={{ color: '#fff', marginBottom: '0.75rem' }}>🎭 VIP Üye (Anonim)</h4>
                        <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Zengin ve sosyete üyeleri anonim kalarak doğrulanmış profilleri keşfeder ve beğendiği kişilere mesaj atar.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <div style={{ 
                            width: '60px', height: '60px', borderRadius: '50%',
                            background: 'rgba(255,215,0,0.15)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1rem', fontSize: '1.5rem', fontWeight: 'bold',
                            color: 'var(--gold-primary)', border: '2px solid var(--gold-primary)'
                        }}>2</div>
                        <h4 style={{ color: '#fff', marginBottom: '0.75rem' }}>✅ Doğrulanmış Profil</h4>
                        <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Çekici ve kaliteli bireyler yüz doğrulaması yaparak üst düzey üyelerden mesaj almaya hak kazanır.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <div style={{ 
                            width: '60px', height: '60px', borderRadius: '50%',
                            background: 'rgba(255,215,0,0.15)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1rem', fontSize: '1.5rem', fontWeight: 'bold',
                            color: 'var(--gold-primary)', border: '2px solid var(--gold-primary)'
                        }}>3</div>
                        <h4 style={{ color: '#fff', marginBottom: '0.75rem' }}>💬 Bağlantı Kur</h4>
                        <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Karşılıklı beğeni veya VIP üyenin ilk adımıyla sohbet başlar. Kaliteli tanışmalar için güvenli ortam.
                        </p>
                    </div>
                </div>

                {/* Info box */}
                <div style={{ 
                    marginTop: '2.5rem', 
                    padding: '1.5rem', 
                    background: 'rgba(255,215,0,0.08)', 
                    borderRadius: '16px',
                    border: '1px solid rgba(255,215,0,0.2)'
                }}>
                    <p style={{ textAlign: 'center', color: '#ccc', lineHeight: '1.8', margin: 0 }}>
                        💡 <strong style={{ color: '#fff' }}>Özetle:</strong> VIP üyeler herkes profilini görebilir ve mesaj atabilir. 
                        Doğrulanmış üyeler ise sadece VIP'lerden gelen mesajları alır. 
                        <br/>
                        <span style={{ color: 'var(--gold-primary)' }}>Güzellik burada, zenginlik orada - The Vault ikisini bir araya getirir.</span>
                    </p>
                </div>
            </motion.div>
        </section>
      </main>
    </>
  )
}

export default Landing
