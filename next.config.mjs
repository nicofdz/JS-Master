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
    
    // Incluir archivos .docx en el build
    if (isServer) {
      config.module.rules.push({
        test: /\.docx$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/templates/[name][ext]'
        }
      });
    }
    
    return config;
  },
  // Configuración experimental para manejar workers
  experimental: {
    esmExternals: 'loose'
  }
};

export default nextConfig;
