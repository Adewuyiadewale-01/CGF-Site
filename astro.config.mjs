// CGF Security & Electrical — concept site (Astro, static output)
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://cgfsecurityandelectrical.com.au',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
