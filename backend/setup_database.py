import os
from supabase import create_client, Client
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv('.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Conectar a Supabase
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def setup_tables():
    """Lee y ejecuta el script SQL de inicialización"""
    print("📦 Configurando tablas en Supabase...")
    
    with open('init_supabase.sql', 'r') as f:
        sql_script = f.read()
    
    # Ejecutar el script SQL
    try:
        # Nota: Supabase Python SDK no ejecuta SQL directamente
        # Necesitamos hacerlo desde el dashboard de Supabase o usar psycopg2
        print("⚠️  Por favor, ejecuta el contenido de 'init_supabase.sql' en:")
        print("   Supabase Dashboard > SQL Editor")
        print("\nO copia y pega este SQL:")
        print("="*60)
        print(sql_script)
        print("="*60)
    except Exception as e:
        print(f"❌ Error: {e}")

def create_admin_user():
    """Crea el usuario administrador"""
    print("\n👤 Creando usuario administrador...")
    
    try:
        # Verificar si el admin ya existe
        result = supabase.table('users').select('*').eq('email', 'export@iberfoods.com').execute()
        
        if result.data:
            print("✅ Usuario administrador ya existe")
        else:
            # Crear usuario admin
            admin_data = {
                'email': 'export@iberfoods.com',
                'password_hash': pwd_context.hash('Koloro.0364'),
                'name': 'Administrador',
                'role': 'admin'
            }
            
            supabase.table('users').insert(admin_data).execute()
            print("✅ Usuario administrador creado exitosamente")
            print("   Email: export@iberfoods.com")
            print("   Contraseña: Koloro.0364")
    except Exception as e:
        print(f"❌ Error al crear usuario admin: {e}")

if __name__ == "__main__":
    print("🚀 Iniciando configuración de base de datos...\n")
    setup_tables()
    
    input("\n⏸️  Presiona Enter después de ejecutar el SQL en Supabase Dashboard...")
    
    create_admin_user()
    print("\n✅ Configuración completada!")
