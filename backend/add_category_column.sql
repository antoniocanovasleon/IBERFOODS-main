-- Agregar columna category a event_types
ALTER TABLE event_types 
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'event';

-- Actualizar tipos existentes que son documentos
UPDATE event_types 
SET category = 'document'
WHERE name IN ('Pedido', 'Albarán', 'Factura Proforma', 'Factura', 'Factura Comisiones IBERFOODS');

-- Actualizar el resto como eventos
UPDATE event_types 
SET category = 'event'
WHERE category IS NULL OR category = '';
