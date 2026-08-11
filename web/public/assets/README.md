# Assets Directory

This directory is used to store static assets for the website (images, icons, vectors, etc.).

Files placed inside `public/assets/` can be referenced directly in Next.js components using URL paths:
- Image path example: `/assets/images/hero-banner.jpg`
- Usage in Next.js `<Image>` component:
  ```jsx
  import Image from 'next/image';

  <Image src="/assets/images/hero-banner.jpg" alt="Hero Banner" width={800} height={600} />
  ```
