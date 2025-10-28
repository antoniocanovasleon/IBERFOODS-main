import { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Palette, Calendar, KanbanSquare } from 'lucide-react';

const colorPresets = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#f43f5e', '#0ea5e9', '#a855f7', '#22c55e'
];

const TypesManagement = () => {
  const [eventTypes, setEventTypes] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [activeTab, setActiveTab] = useState('events');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    category: 'event', // Nuevo campo
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEventTypes();
      loadTaskTypes();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadEventTypes = async () => {
    try {
      const response = await axiosInstance.get('/event-types');
      setEventTypes(response.data);
    } catch (error) {
      console.error('Error loading event types:', error);
      if (error.response?.status === 401) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else {
        toast.error('Error al cargar tipos de eventos');
      }
    }
  };

  const loadTaskTypes = async () => {
    try {
      const response = await axiosInstance.get('/task-types');
      setTaskTypes(response.data);
    } catch (error) {
      console.error('Error loading task types:', error);
      if (error.response?.status !== 401) {
        toast.error('Error al cargar tipos de tareas');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = activeTab === 'events' ? '/event-types' : '/task-types';
      
      if (editingType) {
        await axiosInstance.put(`${endpoint}/${editingType.id}`, formData);
        toast.success('Tipo actualizado');
      } else {
        await axiosInstance.post(endpoint, formData);
        toast.success('Tipo creado');
      }
      
      if (activeTab === 'events') {
        loadEventTypes();
      } else {
        loadTaskTypes();
      }
      
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Error al guardar tipo');
    }
  };

  const handleDelete = async (typeId) => {
    if (!window.confirm('¿Eliminar este tipo?')) return;
    try {
      const endpoint = activeTab === 'events' ? '/event-types' : '/task-types';
      await axiosInstance.delete(`${endpoint}/${typeId}`);
      toast.success('Tipo eliminado');
      
      if (activeTab === 'events') {
        loadEventTypes();
      } else {
        loadTaskTypes();
      }
    } catch (error) {
      toast.error('Error al eliminar tipo');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3b82f6',
      category: 'event', // Resetear a valor por defecto
    });
    setEditingType(null);
  };

  const openEditDialog = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      color: type.color,
      category: type.category || 'event', // Asegurar valor por defecto
    });
    setDialogOpen(true);
  };

  const currentTypes = activeTab === 'events' ? eventTypes : taskTypes;
  const currentIcon = activeTab === 'events' ? Calendar : KanbanSquare;

  return (
    <div className="animate-fade-in" data-testid="types-management">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Gestión de Tipos</h2>
          <p className="text-gray-600 mt-1">Gestiona tipos de eventos y tareas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="add-type-button"
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nuevo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="type-dialog" aria-describedby="type-dialog-description">
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Editar' : 'Nuevo'} Tipo de {activeTab === 'events' ? 'Evento' : 'Tarea'}
              </DialogTitle>
            </DialogHeader>
            <p id="type-dialog-description" className="sr-only">Formulario para crear o editar un tipo</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  data-testid="type-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={`Ej: ${activeTab === 'events' ? 'Pedido, Albarán, Factura' : 'Desarrollo, Diseño, Testing'}...`}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    data-testid="type-color-picker"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-12 w-16 rounded-lg cursor-pointer border-2 border-gray-300"
                  />
                  <div className="flex-1 flex flex-wrap gap-2">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-teal-500' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        data-testid={`color-preset-${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Nuevo: Selector de categoría solo para event types */}
              {activeTab === 'events' && (
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <select
                    id="category"
                    data-testid="type-category-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="event">Evento</option>
                    <option value="document">Documento</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    {formData.category === 'document' 
                      ? '📄 Documentos incluyen campos: Número, Cliente, Proveedor, Cantidad'
                      : '📅 Eventos regulares (reuniones, viajes, etc.)'}
                  </p>
                </div>
              )}
              
              <Button type="submit" data-testid="save-type-button" className="w-full bg-teal-600 hover:bg-teal-700">
                {editingType ? 'Actualizar' : 'Crear'} Tipo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Tipos de Eventos
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <KanbanSquare className="h-4 w-4" />
            Tipos de Tareas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventTypes.map((type) => (
              <Card key={type.id} className="glass hover:shadow-lg transition-shadow" data-testid={`type-card-${type.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: type.color }}
                      >
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900" data-testid={`type-name-${type.id}`}>
                            {type.name}
                          </h3>
                          {/* Badge de categoría */}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            type.category === 'document' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {type.category === 'document' ? '📄 Doc' : '📅 Evento'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{type.color}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(type)}
                        data-testid={`edit-type-${type.id}`}
                        className="hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(type.id)}
                        data-testid={`delete-type-${type.id}`}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {taskTypes.map((type) => (
              <Card key={type.id} className="glass hover:shadow-lg transition-shadow" data-testid={`type-card-${type.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: type.color }}
                      >
                        <KanbanSquare className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900" data-testid={`type-name-${type.id}`}>
                          {type.name}
                        </h3>
                        <p className="text-sm text-gray-600">{type.color}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(type)}
                        data-testid={`edit-type-${type.id}`}
                        className="hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(type.id)}
                        data-testid={`delete-type-${type.id}`}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {currentTypes.length === 0 && (
        <div className="text-center py-12">
          <Palette className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No hay tipos de {activeTab === 'events' ? 'eventos' : 'tareas'} creados</p>
          <p className="text-gray-400 text-sm mt-2">Crea tu primer tipo para comenzar</p>
        </div>
      )}
    </div>
  );
};

export default TypesManagement;
