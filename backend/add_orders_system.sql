-- Script para agregar sistema de pedidos y vinculaciones
-- Ejecutar después de init_supabase.sql

-- 1. Agregar campos adicionales a calendar_events
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS order_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS client VARCHAR(255),
ADD COLUMN IF NOT EXISTS supplier VARCHAR(255),
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS linked_order_id UUID;

-- 2. Crear tabla orders (pedidos activos en sidebar)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  order_number VARCHAR(100) NOT NULL,
  supplier VARCHAR(255) NOT NULL,
  client VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'active', -- active, completed, deleted
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Crear tabla event_links (vinculaciones entre eventos y pedidos)
CREATE TABLE IF NOT EXISTS event_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(order_id, event_id)
);

-- 4. Agregar foreign key constraint para linked_order_id (si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_linked_order_id_fkey'
  ) THEN
    ALTER TABLE calendar_events 
    ADD CONSTRAINT calendar_events_linked_order_id_fkey 
    FOREIGN KEY (linked_order_id) REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_calendar_event ON orders(calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_event_links_order ON event_links(order_id);
CREATE INDEX IF NOT EXISTS idx_event_links_event ON event_links(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_linked_order ON calendar_events(linked_order_id);

-- 6. Insertar tipos de eventos predefinidos para el sistema de pedidos
INSERT INTO event_types (name, color, created_by) 
SELECT 'Pedido', '#3b82f6', id FROM users WHERE role = 'admin' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO event_types (name, color, created_by) 
SELECT 'Albarán', '#8b5cf6', id FROM users WHERE role = 'admin' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO event_types (name, color, created_by) 
SELECT 'Factura Proforma', '#10b981', id FROM users WHERE role = 'admin' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO event_types (name, color, created_by) 
SELECT 'Factura', '#f59e0b', id FROM users WHERE role = 'admin' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO event_types (name, color, created_by) 
SELECT 'Factura Comisiones IBERFOODS', '#ef4444', id FROM users WHERE role = 'admin' LIMIT 1
ON CONFLICT (name) DO NOTHING;

-- Completado
SELECT 'Orders system tables and event types created successfully!' as result;
