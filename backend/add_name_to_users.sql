-- Agregar columna name a users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Actualizar usuarios existentes con un nombre por defecto basado en su email
UPDATE users 
SET name = SPLIT_PART(email, '@', 1)
WHERE name IS NULL OR name = '';
