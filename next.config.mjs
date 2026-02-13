/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "album-art"],
  
  // 环境变量（客户端可访问的）
  env: {
    // 开发模式自动登录（构建时注入到客户端）
    NEXT_PUBLIC_DEV_AUTO_LOGIN: process.env.NODE_ENV === 'development' && process.env.DEV_AUTO_LOGIN === 'true' ? 'true' : 'false',
  },
  
  // 图片域名配置（封面图片）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
      {
        protocol: 'https',
        hostname: 'is1-ssl.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
