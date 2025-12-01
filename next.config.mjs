/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Configuración para pdfjs-dist
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Configuración para worker de pdfjs
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
    };

    return config;
  },
  // Configuración experimental para manejar workers y archivos estáticos
  experimental: {
    esmExternals: 'loose',
    outputFileTracingIncludes: {
      '/api/contracts/generate': ['./public/templates/**/*']
    }
  }
};

export default nextConfig;
