#!/usr/bin/env python3
"""
Script para ejecutar la migración del sistema de pedidos directamente
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: Falta configuración de Supabase en .env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def main():
    print("🚀 Ejecutando migración del sistema de pedidos...\n")
    
    try:
        # 1. Verificar tabla calendar_events existe
        print("1️⃣ Verificando tabla calendar_events...")
        result = supabase.table('calendar_events').select('id').limit(1).execute()
        print("   ✅ Tabla calendar_events existe\n")
        
        # 2. Crear tabla orders
        print("2️⃣ Creando tabla orders...")
        # Esta operación debe hacerse desde el dashboard de Supabase
        # pero intentaremos verificar si existe
        try:
            result = supabase.table('orders').select('id').limit(1).execute()
            print("   ✅ Tabla orders ya existe\n")
        except:
            print("   ⚠️  Tabla orders no existe aún - necesita ejecutarse el SQL manualmente\n")
        
        # 3. Crear tabla event_links
        print("3️⃣ Verificando tabla event_links...")
        try:
            result = supabase.table('event_links').select('id').limit(1).execute()
            print("   ✅ Tabla event_links ya existe\n")
        except:
            print("   ⚠️  Tabla event_links no existe aún - necesita ejecutarse el SQL manualmente\n")
        
        # 4. Insertar tipos de eventos predefinidos
        print("4️⃣ Insertando tipos de eventos predefinidos...")
        
        # Obtener un admin user
        admin_result = supabase.table('users').select('id').eq('role', 'admin').limit(1).execute()
        
        if not admin_result.data:
            print("   ⚠️  No se encontró usuario admin")
            return
        
        admin_id = admin_result.data[0]['id']
        
        event_types = [
            {'name': 'Pedido', 'color': '#3b82f6', 'created_by': admin_id},
            {'name': 'Albarán', 'color': '#8b5cf6', 'created_by': admin_id},
            {'name': 'Factura Proforma', 'color': '#10b981', 'created_by': admin_id},
            {'name': 'Factura', 'color': '#f59e0b', 'created_by': admin_id},
            {'name': 'Factura Comisiones IBERFOODS', 'color': '#ef4444', 'created_by': admin_id},
        ]
        
        for event_type in event_types:
            try:
                # Check if exists
                existing = supabase.table('event_types').select('id').eq('name', event_type['name']).execute()
                
                if not existing.data:
                    result = supabase.table('event_types').insert(event_type).execute()
                    print(f"   ✅ Tipo '{event_type['name']}' creado")
                else:
                    print(f"   ℹ️  Tipo '{event_type['name']}' ya existe")
            except Exception as e:
                print(f"   ⚠️  Error al crear tipo '{event_type['name']}': {e}")
        
        print("\n✅ Migración completada!")
        print("\n⚠️  IMPORTANTE: Si las tablas 'orders' y 'event_links' no existen,")
        print("   debes ejecutar el SQL manualmente desde el dashboard de Supabase.")
        print("   El SQL está en: /app/backend/add_orders_system.sql")
        
    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")
        exit(1)

if __name__ == "__main__":
    main()
