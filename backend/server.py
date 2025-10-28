from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "user"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: str
    created_at: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class EventTypeCreate(BaseModel):
    name: str
    color: str
    category: str = "event"  # 'document' o 'event'

class EventType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    color: str
    category: str = "event"
    created_by: str
    created_at: Optional[str] = None

class TaskTypeCreate(BaseModel):
    name: str
    color: str

class TaskType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    color: str
    created_by: str
    created_at: Optional[str] = None

class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    fecha_inicio: str
    fecha_fin: str
    event_type_id: str
    custom_fields: Optional[Dict[str, Any]] = None
    # Campos para sistema de pedidos
    order_number: Optional[str] = None
    client: Optional[str] = None
    supplier: Optional[str] = None
    amount: Optional[float] = None
    linked_order_id: Optional[str] = None

class CalendarEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = None
    fecha_inicio: str
    fecha_fin: str
    event_type_id: str
    custom_fields: Optional[Dict[str, Any]] = None
    created_by: str
    created_at: Optional[str] = None
    # Campos para sistema de pedidos
    order_number: Optional[str] = None
    client: Optional[str] = None
    supplier: Optional[str] = None
    amount: Optional[float] = None
    linked_order_id: Optional[str] = None

class OrderCreate(BaseModel):
    calendar_event_id: str
    order_number: str
    supplier: str
    client: str
    amount: Optional[float] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    calendar_event_id: str
    order_number: str
    supplier: str
    client: str
    amount: Optional[float] = None
    status: str
    created_by: str
    created_at: Optional[str] = None

class EventLinkCreate(BaseModel):
    order_id: str
    event_id: str

class EventLink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    order_id: str
    event_id: str
    created_at: Optional[str] = None

class KanbanTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: str = "medium"
    task_type_id: Optional[str] = None
    position: Optional[int] = 0

class KanbanTask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = None
    status: str = "todo"
    assigned_to: Optional[str] = None
    priority: str
    task_type_id: Optional[str] = None
    position: int = 0
    created_by: str
    created_at: Optional[str] = None

class KanbanTaskUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    task_type_id: Optional[str] = None
    position: Optional[int] = None

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    result = supabase.table('users').select('*').eq('id', user_id).execute()
    if not result.data:
        raise credentials_exception
    
    return User(**result.data[0])

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

# Auth routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    result = supabase.table('users').select('*').eq('email', user_data.email).execute()
    if result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_dict = {
        'email': user_data.email,
        'password_hash': get_password_hash(user_data.password),
        'name': user_data.name,
        'role': user_data.role
    }
    
    result = supabase.table('users').insert(user_dict).execute()
    user = User(**result.data[0])
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    result = supabase.table('users').select('*').eq('email', login_data.email).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    user_data = result.data[0]
    if not verify_password(login_data.password, user_data['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    user = User(**user_data)
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# User routes
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_admin_user)):
    result = supabase.table('users').select('id, email, name, role, created_at').execute()
    return result.data

@api_router.post("/users", response_model=User)
async def create_user_by_admin(user_data: UserCreate, current_user: User = Depends(get_admin_user)):
    # Check if email already exists
    existing = supabase.table('users').select('*').eq('email', user_data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    data = {
        'email': user_data.email,
        'name': user_data.name,
        'password_hash': hashed_password,
        'role': user_data.role if hasattr(user_data, 'role') else 'user'
    }
    
    result = supabase.table('users').insert(data).execute()
    return User(**result.data[0])

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: dict, current_user: User = Depends(get_admin_user)):
    # Remove password if empty
    if 'password' in user_update and user_update['password']:
        user_update['password_hash'] = get_password_hash(user_update['password'])
        del user_update['password']  # Remove the plain password field
    elif 'password' in user_update and not user_update['password']:
        del user_update['password']
    
    try:
        result = supabase.table('users').update(user_update).eq('id', user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        return User(**result.data[0])
    except Exception as e:
        if "invalid input syntax for type uuid" in str(e):
            raise HTTPException(status_code=404, detail="User not found")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_admin_user)):
    try:
        result = supabase.table('users').delete().eq('id', user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted successfully"}
    except Exception as e:
        if "invalid input syntax for type uuid" in str(e):
            raise HTTPException(status_code=404, detail="User not found")
        raise HTTPException(status_code=500, detail="Internal server error")

# Event Type routes
@api_router.post("/event-types", response_model=EventType)
async def create_event_type(event_type_data: EventTypeCreate, current_user: User = Depends(get_admin_user)):
    data = {
        'name': event_type_data.name,
        'color': event_type_data.color,
        'category': event_type_data.category,
        'created_by': current_user.id
    }
    result = supabase.table('event_types').insert(data).execute()
    return EventType(**result.data[0])

@api_router.get("/event-types", response_model=List[EventType])
async def get_event_types(current_user: User = Depends(get_current_user)):
    result = supabase.table('event_types').select('*').execute()
    # Asegurar que todos los tipos tengan category (fallback para datos antiguos)
    for event_type in result.data:
        if 'category' not in event_type or not event_type['category']:
            # Inferir categoría basándose en el nombre
            doc_names = ['Pedido', 'Albarán', 'Factura Proforma', 'Factura', 'Factura Comisiones IBERFOODS']
            event_type['category'] = 'document' if event_type['name'] in doc_names else 'event'
    return result.data

@api_router.put("/event-types/{type_id}", response_model=EventType)
async def update_event_type(
    type_id: str,
    event_type_data: EventTypeCreate,
    current_user: User = Depends(get_admin_user)
):
    update_data = event_type_data.model_dump()
    result = supabase.table('event_types').update(update_data).eq('id', type_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Event type not found")
    
    return EventType(**result.data[0])

@api_router.delete("/event-types/{type_id}")
async def delete_event_type(type_id: str, current_user: User = Depends(get_admin_user)):
    result = supabase.table('event_types').delete().eq('id', type_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event type not found")
    return {"message": "Event type deleted successfully"}

# Task Type routes
@api_router.post("/task-types", response_model=TaskType)
async def create_task_type(task_type_data: TaskTypeCreate, current_user: User = Depends(get_admin_user)):
    data = {
        'name': task_type_data.name,
        'color': task_type_data.color,
        'created_by': current_user.id
    }
    result = supabase.table('task_types').insert(data).execute()
    return TaskType(**result.data[0])

@api_router.get("/task-types", response_model=List[TaskType])
async def get_task_types(current_user: User = Depends(get_current_user)):
    result = supabase.table('task_types').select('*').execute()
    return result.data

@api_router.put("/task-types/{type_id}", response_model=TaskType)
async def update_task_type(
    type_id: str,
    task_type_data: TaskTypeCreate,
    current_user: User = Depends(get_admin_user)
):
    update_data = task_type_data.model_dump()
    result = supabase.table('task_types').update(update_data).eq('id', type_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Task type not found")
    
    return TaskType(**result.data[0])

@api_router.delete("/task-types/{type_id}")
async def delete_task_type(type_id: str, current_user: User = Depends(get_admin_user)):
    result = supabase.table('task_types').delete().eq('id', type_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task type not found")
    return {"message": "Task type deleted successfully"}

# Calendar routes
@api_router.post("/calendar", response_model=CalendarEvent)
async def create_event(event_data: CalendarEventCreate, current_user: User = Depends(get_current_user)):
    data = event_data.model_dump()
    data['created_by'] = current_user.id
    
    # Convert empty strings to None for optional fields
    for field in ['order_number', 'client', 'supplier', 'amount', 'linked_order_id']:
        if data.get(field) == '':
            data[field] = None
    
    # Crear evento en calendar_events
    result = supabase.table('calendar_events').insert(data).execute()
    created_event = result.data[0]
    
    # Si el evento es tipo "Pedido" o "Factura Proforma", crear entrada en orders
    event_type_result = supabase.table('event_types').select('name').eq('id', data['event_type_id']).execute()
    if event_type_result.data:
        event_type_name = event_type_result.data[0]['name']
        
        if event_type_name in ['Pedido', 'Factura Proforma']:
            order_data = {
                'calendar_event_id': created_event['id'],
                'order_number': data.get('order_number', ''),
                'supplier': data.get('supplier', ''),
                'client': data.get('client', ''),
                'amount': data.get('amount'),
                'status': 'active',
                'created_by': current_user.id
            }
            supabase.table('orders').insert(order_data).execute()
    
    # Si el evento tiene linked_order_id, crear vinculación en event_links
    if data.get('linked_order_id'):
        link_data = {
            'order_id': data['linked_order_id'],
            'event_id': created_event['id']
        }
        supabase.table('event_links').insert(link_data).execute()
        
        # Si es "Factura Comisiones IBERFOODS", marcar pedido como completado
        if event_type_result.data:
            event_type_name = event_type_result.data[0]['name']
            if event_type_name == 'Factura Comisiones IBERFOODS':
                supabase.table('orders').update({'status': 'completed'}).eq('id', data['linked_order_id']).execute()
    
    return CalendarEvent(**created_event)

@api_router.get("/calendar", response_model=List[CalendarEvent])
async def get_events(current_user: User = Depends(get_current_user)):
    result = supabase.table('calendar_events').select('*').execute()
    return result.data

@api_router.put("/calendar/{event_id}", response_model=CalendarEvent)
async def update_event(
    event_id: str,
    event_data: CalendarEventCreate,
    current_user: User = Depends(get_current_user)
):
    update_data = event_data.model_dump()
    
    # Convert empty strings to None for optional fields
    for field in ['order_number', 'client', 'supplier', 'amount', 'linked_order_id']:
        if update_data.get(field) == '':
            update_data[field] = None
    
    # Obtener el evento actual
    current_event_result = supabase.table('calendar_events').select('*').eq('id', event_id).execute()
    if not current_event_result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    
    current_event = current_event_result.data[0]
    
    # Actualizar el evento
    result = supabase.table('calendar_events').update(update_data).eq('id', event_id).execute()
    updated_event = result.data[0]
    
    # Si el evento es tipo "Pedido" o "Factura Proforma", actualizar en orders
    event_type_result = supabase.table('event_types').select('name').eq('id', update_data['event_type_id']).execute()
    if event_type_result.data:
        event_type_name = event_type_result.data[0]['name']
        
        if event_type_name in ['Pedido', 'Factura Proforma']:
            order_result = supabase.table('orders').select('*').eq('calendar_event_id', event_id).execute()
            if order_result.data:
                # Actualizar orden existente
                order_update = {
                    'order_number': update_data.get('order_number', ''),
                    'supplier': update_data.get('supplier', ''),
                    'client': update_data.get('client', ''),
                    'amount': update_data.get('amount')
                }
                supabase.table('orders').update(order_update).eq('calendar_event_id', event_id).execute()
    
    # Manejar cambios en linked_order_id
    if update_data.get('linked_order_id') != current_event.get('linked_order_id'):
        # Eliminar vinculación anterior si existe
        if current_event.get('linked_order_id'):
            supabase.table('event_links').delete().eq('event_id', event_id).execute()
        
        # Crear nueva vinculación si se especifica
        if update_data.get('linked_order_id'):
            link_data = {
                'order_id': update_data['linked_order_id'],
                'event_id': event_id
            }
            supabase.table('event_links').insert(link_data).execute()
            
            # Si es "Factura Comisiones IBERFOODS", marcar pedido como completado
            if event_type_result.data:
                event_type_name = event_type_result.data[0]['name']
                if event_type_name == 'Factura Comisiones IBERFOODS':
                    supabase.table('orders').update({'status': 'completed'}).eq('id', update_data['linked_order_id']).execute()
    
    return CalendarEvent(**updated_event)

@api_router.delete("/calendar/{event_id}")
async def delete_event(event_id: str, current_user: User = Depends(get_current_user)):
    # Verificar si el evento existe y obtener sus datos
    event_result = supabase.table('calendar_events').select('*').eq('id', event_id).execute()
    if not event_result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Eliminar el evento (CASCADE eliminará la orden automáticamente si existe)
    result = supabase.table('calendar_events').delete().eq('id', event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"message": "Event deleted successfully"}

# Kanban routes
@api_router.post("/kanban", response_model=KanbanTask)
async def create_task(task_data: KanbanTaskCreate, current_user: User = Depends(get_current_user)):
    data = task_data.model_dump()
    data['created_by'] = current_user.id
    
    result = supabase.table('kanban_tasks').insert(data).execute()
    return KanbanTask(**result.data[0])

@api_router.get("/kanban", response_model=List[KanbanTask])
async def get_tasks(current_user: User = Depends(get_current_user)):
    # Ordenar solo por status (position se manejará en el cliente si no existe la columna)
    result = supabase.table('kanban_tasks').select('*').order('status').execute()
    
    # Asegurar que todos tengan campo position (fallback para datos antiguos o sin columna)
    for task in result.data:
        if 'position' not in task or task['position'] is None:
            task['position'] = 0
    
    return result.data

@api_router.put("/kanban/{task_id}", response_model=KanbanTask)
async def update_task(
    task_id: str,
    task_update: KanbanTaskUpdate,
    current_user: User = Depends(get_current_user)
):
    update_data = {k: v for k, v in task_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Eliminar 'position' si está presente (columna aún no existe en DB)
    # Esto permite que el drag & drop funcione sin error hasta que se ejecute el SQL
    if 'position' in update_data:
        update_data.pop('position')
    
    # Si después de eliminar position no queda nada, no hacer update
    if not update_data:
        # Solo devolver la tarea actual sin actualizar
        result = supabase.table('kanban_tasks').select('*').eq('id', task_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Task not found")
        task = result.data[0]
        task['position'] = 0  # Fallback
        return KanbanTask(**task)
    
    result = supabase.table('kanban_tasks').update(update_data).eq('id', task_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Agregar position al resultado si no existe
    task = result.data[0]
    if 'position' not in task:
        task['position'] = 0
    
    return KanbanTask(**task)

@api_router.delete("/kanban/{task_id}")
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)):
    result = supabase.table('kanban_tasks').delete().eq('id', task_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

# Orders routes (Sistema de pedidos en sidebar)
@api_router.get("/orders", response_model=List[Order])
async def get_active_orders(current_user: User = Depends(get_current_user)):
    """Obtener todos los pedidos activos para mostrar en sidebar"""
    result = supabase.table('orders').select('*').eq('status', 'active').order('created_at', desc=True).execute()
    return result.data

@api_router.get("/orders/{order_id}/linked-events")
async def get_order_linked_events(order_id: str, current_user: User = Depends(get_current_user)):
    """Obtener todos los eventos vinculados a un pedido"""
    # Obtener los IDs de eventos vinculados
    links_result = supabase.table('event_links').select('event_id').eq('order_id', order_id).execute()
    
    if not links_result.data:
        return []
    
    event_ids = [link['event_id'] for link in links_result.data]
    
    # Obtener los eventos completos
    events_result = supabase.table('calendar_events').select('id, title, event_type_id, order_number').in_('id', event_ids).execute()
    
    # Enriquecer con nombre del tipo de evento
    enriched_events = []
    for event in events_result.data:
        event_type_result = supabase.table('event_types').select('name').eq('id', event['event_type_id']).execute()
        event_type_name = event_type_result.data[0]['name'] if event_type_result.data else 'Unknown'
        
        enriched_events.append({
            'id': event['id'],
            'title': event['title'],
            'event_type_name': event_type_name,
            'order_number': event.get('order_number', '')
        })
    
    return enriched_events

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, current_user: User = Depends(get_current_user)):
    """Eliminar un pedido manualmente desde el sidebar"""
    # Cambiar status a 'deleted' en lugar de eliminar físicamente
    result = supabase.table('orders').update({'status': 'deleted'}).eq('id', order_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted successfully"}

@api_router.post("/event-links", response_model=EventLink)
async def create_event_link(link_data: EventLinkCreate, current_user: User = Depends(get_current_user)):
    """Crear vinculación entre evento y pedido"""
    data = link_data.model_dump()
    
    # Verificar que el pedido existe
    order_result = supabase.table('orders').select('*').eq('id', data['order_id']).execute()
    if not order_result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verificar que el evento existe
    event_result = supabase.table('calendar_events').select('*').eq('id', data['event_id']).execute()
    if not event_result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Crear vinculación
    result = supabase.table('event_links').insert(data).execute()
    
    # Actualizar linked_order_id en el evento
    supabase.table('calendar_events').update({'linked_order_id': data['order_id']}).eq('id', data['event_id']).execute()
    
    # Si el evento es "Factura Comisiones IBERFOODS", completar el pedido
    event_type_result = supabase.table('event_types').select('name').eq('id', event_result.data[0]['event_type_id']).execute()
    if event_type_result.data:
        event_type_name = event_type_result.data[0]['name']
        if event_type_name == 'Factura Comisiones IBERFOODS':
            supabase.table('orders').update({'status': 'completed'}).eq('id', data['order_id']).execute()
    
    return EventLink(**result.data[0])

@api_router.delete("/event-links/{link_id}")
async def delete_event_link(link_id: str, current_user: User = Depends(get_current_user)):
    """Eliminar vinculación entre evento y pedido"""
    # Obtener la vinculación para actualizar el evento
    link_result = supabase.table('event_links').select('*').eq('id', link_id).execute()
    if not link_result.data:
        raise HTTPException(status_code=404, detail="Link not found")
    
    event_id = link_result.data[0]['event_id']
    
    # Eliminar vinculación
    supabase.table('event_links').delete().eq('id', link_id).execute()
    
    # Actualizar linked_order_id en el evento a NULL
    supabase.table('calendar_events').update({'linked_order_id': None}).eq('id', event_id).execute()
    
    return {"message": "Link deleted successfully"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
