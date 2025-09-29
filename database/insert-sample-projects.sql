-- Insertar proyectos de ejemplo para pruebas
-- Ejecutar este script en el SQL Editor de Supabase

INSERT INTO projects (name, description, location, start_date, end_date, status, budget) VALUES
(
  'Edificio Los Robles',
  'Edificio residencial de 15 pisos con departamentos de lujo',
  'Av. Las Condes 1234, Las Condes',
  '2024-01-15',
  '2024-12-15',
  'active',
  2500000000
),
(
  'Condominio Vista Hermosa',
  'Condominio familiar con vista panorámica de la ciudad',
  'Av. Providencia 5678, Providencia',
  '2024-03-01',
  '2025-03-20',
  'active',
  1800000000
),
(
  'Torre Central',
  'Torre corporativa con oficinas premium',
  'Av. Apoquindo 9876, Las Condes',
  '2023-06-01',
  '2024-06-30',
  'completed',
  4200000000
),
(
  'Residencial El Bosque',
  'Proyecto residencial sustentable con áreas verdes',
  'Calle Los Arrayanes 456, La Reina',
  '2024-08-01',
  '2025-08-15',
  'paused',
  950000000
),
(
  'Plaza Comercial Norte',
  'Centro comercial con locales y oficinas',
  'Av. Kennedy 2345, Las Condes',
  '2024-09-15',
  NULL,
  'planning',
  3100000000
);

-- Verificar que se insertaron correctamente
SELECT * FROM projects ORDER BY created_at DESC;
