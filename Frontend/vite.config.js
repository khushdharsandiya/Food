import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
  tailwindcss()
  ],
  // Customer site — keep 5173 so Backend FRONTEND_URL matches; admin uses 5174.
  server: { port: 5173, strictPort: true },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('react-icons')) return 'vendor-icons'
          if (id.includes('axios')) return 'vendor-http'
          if (id.includes('react-hot-toast')) return 'vendor-toast'
          if (id.includes('react-router')) return 'vendor-react'
          if (id.includes('react-dom')) return 'vendor-react'
          if (id.includes('/node_modules/react/')) return 'vendor-react'
        },
      },
    },
  },
})
