-- Crear tabla de tipos de tareas
CREATE TABLE IF NOT EXISTS task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columna task_type_id a la tabla kanban_tasks
ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS task_type_id UUID REFERENCES task_types(id) ON DELETE SET NULL;

-- Índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_type ON kanban_tasks(task_type_id);
