-- Crear tablas para la aplicación de gestión empresarial

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' o 'user'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de tipos de eventos
CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de eventos del calendario
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  event_type_id UUID REFERENCES event_types(id) ON DELETE CASCADE,
  custom_fields JSONB,
  sub_items JSONB,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de tareas Kanban
CREATE TABLE IF NOT EXISTS kanban_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'done'
  assigned_to TEXT,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_status ON kanban_tasks(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Políticas RLS (Row Level Security) - Opcional pero recomendado
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;