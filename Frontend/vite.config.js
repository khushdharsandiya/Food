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
})
