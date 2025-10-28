-- Agregar columna position a kanban_tasks
ALTER TABLE kanban_tasks 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Asignar posiciones iniciales basadas en created_at
UPDATE kanban_tasks 
SET position = subquery.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at) as row_num
  FROM kanban_tasks
) AS subquery
WHERE kanban_tasks.id = subquery.id;
