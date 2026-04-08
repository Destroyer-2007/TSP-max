import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',      // Создает папку 'out' для приложения
  images: {
    unoptimized: true,   // Отключает оптимизацию картинок (необходима для APK)
  },
};

export default nextConfig;