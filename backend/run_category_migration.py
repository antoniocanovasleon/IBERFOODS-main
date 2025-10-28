#!/usr/bin/env python3
"""
Script para agregar la columna category a la tabla event_types
y clasificar los tipos existentes
"""

from server import supabase
import sys

def main():
    print("🔄 Iniciando migración de categorías...")
    
    try:
        # Leer el archivo SQL
        with open('/app/backend/add_category_column.sql', 'r') as f:
            sql_content = f.read()
        
        print("\n📄 SQL a ejecutar:")
        print(sql_content)
        print("\n" + "="*60)
        
        # Nota: Supabase Python client no soporta ejecutar SQL directamente
        # Las instrucciones deben ejecutarse manualmente en el Dashboard de Supabase
        
        print("\n⚠️  INSTRUCCIONES MANUALES:")
        print("="*60)
        print("1. Ve al Dashboard de Supabase")
        print("2. Navega a SQL Editor")
        print("3. Copia y ejecuta el contenido de: /app/backend/add_category_column.sql")
        print("4. Verifica que la columna 'category' se haya agregado correctamente")
        print("="*60)
        
        # Intentar verificar si ya se ejecutó
        result = supabase.table('event_types').select('*').limit(1).execute()
        if result.data and len(result.data) > 0:
            if 'category' in result.data[0]:
                print("\n✅ ¡La columna 'category' ya existe!")
                
                # Mostrar tipos actuales con su categoría
                all_types = supabase.table('event_types').select('*').execute()
                print("\n📊 Tipos de eventos actuales:")
                for t in all_types.data:
                    category = t.get('category', 'N/A')
                    print(f"  - {t['name']}: {category}")
                
                return 0
            else:
                print("\n❌ La columna 'category' aún no existe")
                print("Por favor, ejecuta el SQL manualmente según las instrucciones arriba.")
                return 1
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
