import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Tüm bağlantılara izin ver
    port: 5173, // Çalıştığınız portu belirtin
    
    // ------------------------------------------------------------------
    // Hatanın istediği kesin çözüm: ALLOWED HOSTS
    // Ngrok URL'sini buraya tırnaklar içinde ekleyin!
    allowedHosts: [
      'tatum-nonequable-verdie.ngrok-free.dev' // BURAYA GÜNCEL NGROK ADRESİNİZİ YAZIN
    ],
    // ------------------------------------------------------------------
    
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})