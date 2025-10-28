import { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Palette } from 'lucide-react';

const colorPresets = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#f43f5e', '#0ea5e9', '#a855f7', '#22c55e'
];

const EventTypesManagement = () => {
  const [eventTypes, setEventTypes] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
  });

  useEffect(() => {
    // Esperar un momento para asegurarse de que el token está disponible
    const timer = setTimeout(() => {
      loadEventTypes();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingType) {
        await axiosInstance.put(`/event-types/${editingType.id}`, formData);
        toast.success('Tipo actualizado');
      } else {
        await axiosInstance.post('/event-types', formData);
        toast.success('Tipo creado');
      }
      loadEventTypes();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Error al guardar tipo');
    }
  };

  const handleDelete = async (typeId) => {
    if (!window.confirm('¿Eliminar este tipo de evento?')) return;
    try {
      await axiosInstance.delete(`/event-types/${typeId}`);
      toast.success('Tipo eliminado');
      loadEventTypes();
    } catch (error) {
      toast.error('Error al eliminar tipo');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3b82f6',
    });
    setEditingType(null);
  };

  const openEditDialog = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      color: type.color,
    });
    setDialogOpen(true);
  };

  return (
    <div className="animate-fade-in" data-testid="event-types-management">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Tipos de Eventos</h2>
          <p className="text-gray-600 mt-1">Gestiona y personaliza los tipos de eventos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="add-event-type-button"
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nuevo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="event-type-dialog" aria-describedby="event-type-dialog-description">
            <DialogHeader>
              <DialogTitle>{editingType ? 'Editar Tipo' : 'Nuevo Tipo'}</DialogTitle>
            </DialogHeader>
            <p id="event-type-dialog-description" className="sr-only">Formulario para crear o editar un tipo de evento</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  data-testid="event-type-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Pedido, Albarán, Factura..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    data-testid="event-type-color-picker"
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
              <Button type="submit" data-testid="save-event-type-button" className="w-full bg-teal-600 hover:bg-teal-700">
                {editingType ? 'Actualizar' : 'Crear'} Tipo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventTypes.map((type) => (
          <Card key={type.id} className="glass hover:shadow-lg transition-shadow" data-testid={`event-type-card-${type.id}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: type.color }}
                  >
                    <Palette className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900" data-testid={`event-type-name-${type.id}`}>
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
                    data-testid={`edit-event-type-${type.id}`}
                    className="hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(type.id)}
                    data-testid={`delete-event-type-${type.id}`}
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

      {eventTypes.length === 0 && (
        <div className="text-center py-12">
          <Palette className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No hay tipos de eventos creados</p>
          <p className="text-gray-400 text-sm mt-2">Crea tu primer tipo de evento para comenzar</p>
        </div>
      )}
    </div>
  );
};

export default EventTypesManagement;
