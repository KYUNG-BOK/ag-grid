import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'        // ✅ 추가

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [tailwindcss(), react()],            // ✅ tailwindcss()만 추가
})