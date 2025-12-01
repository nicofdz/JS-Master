// Configuración específica para Vercel
export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
