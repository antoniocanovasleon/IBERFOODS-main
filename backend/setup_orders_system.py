#!/usr/bin/env python3
"""
Script para agregar el sistema de pedidos y vinculaciones a la base de datos
"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados en .env")
    exit(1)

# Create Supabase client with service key
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def run_sql_script(filepath):
    """Execute SQL script file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        sql_script = f.read()
    
    print(f"📝 Ejecutando {filepath}...")
    
    # Split by statements and execute
    statements = [s.strip() for s in sql_script.split(';') if s.strip() and not s.strip().startswith('--')]
    
    for statement in statements:
        if statement:
            try:
                result = supabase.rpc('exec_sql', {'sql': statement}).execute()
                print(f"✅ Statement ejecutado correctamente")
            except Exception as e:
                # Try with postgrest
                print(f"⚠️  Usando método alternativo para ejecutar SQL...")
                # Para Supabase, necesitamos usar la API REST directamente o ejecutar manualmente
                print(f"   SQL: {statement[:100]}...")

def main():
    print("🚀 Configurando sistema de pedidos en Supabase...")
    
    script_path = '/app/backend/add_orders_system.sql'
    
    try:
        # Note: Supabase Python client doesn't support raw SQL execution directly
        # The SQL needs to be executed via Supabase dashboard or psql
        print("\n📋 INSTRUCCIONES:")
        print("=" * 70)
        print("El script SQL ha sido creado en:", script_path)
        print("\nPara ejecutarlo:")
        print("1. Ve a tu dashboard de Supabase")
        print("2. Navega a SQL Editor")
        print("3. Copia y pega el contenido de add_orders_system.sql")
        print("4. Ejecuta el script")
        print("\nO usa psql si tienes acceso directo:")
        print(f"   psql <connection_string> -f {script_path}")
        print("=" * 70)
        
        # Read and display the SQL for convenience
        with open(script_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("\n📄 Contenido del SQL:\n")
        print(sql_content)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        exit(1)

if __name__ == "__main__":
    main()
