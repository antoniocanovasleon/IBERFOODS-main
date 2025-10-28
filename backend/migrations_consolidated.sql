-- ============================================================
-- SCRIPT CONSOLIDADO DE MIGRACIONES PARA SUPABASE
-- ============================================================
-- Este script incluye todas las migraciones pendientes
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. AGREGAR COLUMNA 'category' A event_types
-- Para diferenciar entre Documentos y Eventos
-- ============================================================
ALTER TABLE event_types 
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'event';

-- Clasificar tipos existentes como documentos
UPDATE event_types 
SET category = 'document'
WHERE name IN ('Pedido', 'Albarán', 'Factura Proforma', 'Factura', 'Factura Comisiones IBERFOODS');

-- Asegurar que el resto sean eventos
UPDATE event_types 
SET category = 'event'
WHERE category IS NULL OR category = '';


-- 2. AGREGAR COLUMNA 'position' A kanban_tasks
-- Para permitir reordenamiento persistente de tareas en Kanban
-- ============================================================
ALTER TABLE kanban_tasks 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Asignar posiciones iniciales basadas en fecha de creación
UPDATE kanban_tasks 
SET position = subquery.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at) as row_num
  FROM kanban_tasks
) AS subquery
WHERE kanban_tasks.id = subquery.id;


-- 3. AGREGAR COLUMNA 'name' A users
-- Para mostrar nombres de usuarios en lugar de solo emails
-- ============================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Actualizar usuarios existentes con nombre basado en email
-- (Solo si el campo está vacío)
UPDATE users 
SET name = SPLIT_PART(email, '@', 1)
WHERE name IS NULL OR name = '';


-- ============================================================
-- VERIFICACIÓN DE MIGRACIONES
-- ============================================================
-- Ejecuta estas queries para verificar que todo se aplicó correctamente:

-- Verificar event_types con category
-- SELECT name, category FROM event_types ORDER BY category, name;

-- Verificar kanban_tasks con position
-- SELECT title, status, position FROM kanban_tasks ORDER BY status, position;

-- Verificar users con name
-- SELECT email, name FROM users;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
