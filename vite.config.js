import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ENV = process.env.VITE_APP_ENV
const BASE_MAP = {
  sandbox: '/Home-Command-Center/sandbox/',
  develop: '/Home-Command-Center/develop/',
  preprod: '/Home-Command-Center/preprod/',
}

export default defineConfig({
  plugins: [react()],
  base: BASE_MAP[ENV] ?? '/Home-Command-Center/',
})
