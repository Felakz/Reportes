CREATE TABLE IF NOT EXISTS areas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS reportes_diarios (
  id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL REFERENCES areas(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  progreso TEXT NOT NULL,
  plan TEXT NOT NULL,
  bloqueos TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_area_fecha UNIQUE (area_id, fecha)
);

INSERT INTO areas (nombre) VALUES
  ('E-commerce'),
  ('Diseño'),
  ('Ventas 1'),
  ('Ventas 2')
ON CONFLICT (nombre) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_reportes_diarios_fecha
  ON reportes_diarios (fecha);
