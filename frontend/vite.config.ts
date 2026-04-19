import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
 
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      allowedHosts: true, // Allow Cloudflare Tunnel hosts
    },
  }
})

