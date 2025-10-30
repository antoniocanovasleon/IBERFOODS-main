import { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const EventDialog = ({ open, onClose, onSave, onDelete, editingEvent, eventTypes }) => {
  const [selectedCategory, setSelectedCategory] = useState('event'); // Nuevo estado
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin: format(new Date(), 'yyyy-MM-dd'),
    event_type_id: '',
    custom_fields: {},
    // Campos para sistema de pedidos
    order_number: '',
    client: '',
    supplier: '',
    amount: '',
    linked_order_id: '',
  });
  const [orders, setOrders] = useState([]);
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (editingEvent) {
      // Cuando editamos, inferir la categoría del tipo seleccionado
      const selectedType = eventTypes.find(t => t.id === editingEvent.event_type_id);
      const category = selectedType?.category || 'event';
      setSelectedCategory(category);
      
      setFormData({
        title: editingEvent.title,
        description: editingEvent.description || '',
        fecha_inicio: editingEvent.fecha_inicio,
        fecha_fin: editingEvent.fecha_fin,
        event_type_id: editingEvent.event_type_id,
        custom_fields: editingEvent.custom_fields || {},
        order_number: editingEvent.order_number || '',
        client: editingEvent.client || '',
        supplier: editingEvent.supplier || '',
        amount: editingEvent.amount || '',
        linked_order_id: editingEvent.linked_order_id || '',
      });
    } else {
      resetForm();
    }
  }, [editingEvent, eventTypes]);

  const loadOrders = async () => {
    try {
      const response = await axiosInstance.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const resetForm = () => {
    setSelectedCategory('event'); // Reset categoría
    const firstEventTypeOfCategory = eventTypes.find(t => (t.category || 'event') === 'event');
    
    setFormData({
      title: '',
      description: '',
      fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
      fecha_fin: format(new Date(), 'yyyy-MM-dd'),
      event_type_id: firstEventTypeOfCategory?.id || '',
      custom_fields: {},
      order_number: '',
      client: '',
      supplier: '',
      amount: '',
      linked_order_id: '',
    });
    setCustomFieldKey('');
    setCustomFieldValue('');
  };

  const getSelectedEventTypeName = () => {
    const selectedType = eventTypes.find(t => t.id === formData.event_type_id);
    return selectedType ? selectedType.name : '';
  };

  const requiresOrderFields = () => {
    const selectedType = eventTypes.find(t => t.id === formData.event_type_id);
    // Verificar si el tipo seleccionado es categoría 'document'
    return selectedType?.category === 'document';
  };

  const isOrderBaseType = () => {
    const typeName = getSelectedEventTypeName();
    // Solo Pedido y Factura Proforma crean orders
    return ['Pedido', 'Factura Proforma'].includes(typeName);
  };

  const buildPayload = () => {
    const payload = {
      ...formData,
      custom_fields: formData.custom_fields || {},
    };

    // Normalizar campos opcionales ('' -> null)
    ['order_number', 'client', 'supplier', 'linked_order_id', 'description'].forEach((field) => {
      if (payload[field] === '') {
        payload[field] = null;
      }
    });

    // Convertir amount a número o null
    if (payload.amount === '' || payload.amount === null || payload.amount === undefined) {
      payload.amount = null;
    } else {
      const parsedAmount = parseFloat(payload.amount);
      payload.amount = Number.isFinite(parsedAmount) ? parsedAmount : null;
    }

    // Si la categoría es "event", limpiar campos específicos de pedidos
    if (selectedCategory !== 'document') {
      payload.order_number = null;
      payload.client = null;
      payload.supplier = null;
      payload.amount = null;
      payload.linked_order_id = payload.linked_order_id || null;
    }

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = buildPayload();

      if (editingEvent) {
        await axiosInstance.put(`/calendar/${editingEvent.id}`, payload);
        toast.success('Evento actualizado');
      } else {
        await axiosInstance.post('/calendar', payload);
        toast.success('Evento creado');
      }
      onSave();
    } catch (error) {
      toast.error('Error al guardar evento');
    }
  };

  const addCustomField = () => {
    if (customFieldKey && customFieldValue) {
      setFormData({
        ...formData,
        custom_fields: {
          ...formData.custom_fields,
          [customFieldKey]: customFieldValue,
        },
      });
      setCustomFieldKey('');
      setCustomFieldValue('');
    }
  };

  const removeCustomField = (key) => {
    const newFields = { ...formData.custom_fields };
    delete newFields[key];
    setFormData({ ...formData, custom_fields: newFields });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="event-dialog" aria-describedby="event-dialog-description">
        <DialogHeader>
          <DialogTitle>{editingEvent ? 'Editar Evento' : 'Nuevo Evento'}</DialogTitle>
        </DialogHeader>
        <p id="event-dialog-description" className="sr-only">Formulario para crear o editar un evento del calendario</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              data-testid="event-title-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              data-testid="event-description-input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
              <Input
                id="fecha_inicio"
                data-testid="event-fecha-inicio-input"
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha Fin</Label>
              <Input
                id="fecha_fin"
                data-testid="event-fecha-fin-input"
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                required
              />
            </div>
          </div>
          
          {/* NUEVO: Selector de Categoría */}
          <div className="space-y-2">
            <Label>Categoría</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value="event"
                  checked={selectedCategory === 'event'}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    // Reset tipo de evento cuando cambia categoría
                    const firstType = eventTypes.find(t => (t.category || 'event') === 'event');
                    setFormData({ ...formData, event_type_id: firstType?.id || '' });
                  }}
                  className="w-4 h-4 text-teal-600"
                />
                <span className="text-sm font-medium">📅 Evento</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value="document"
                  checked={selectedCategory === 'document'}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    // Reset tipo de evento cuando cambia categoría
                    const firstType = eventTypes.find(t => (t.category || 'event') === 'document');
                    setFormData({ ...formData, event_type_id: firstType?.id || '' });
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium">📄 Documento</span>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              {selectedCategory === 'document' 
                ? 'Los documentos incluyen pedidos, albaranes, facturas, etc.'
                : 'Los eventos incluyen reuniones, viajes, citas, etc.'}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="event_type_id">Tipo de {selectedCategory === 'document' ? 'Documento' : 'Evento'}</Label>
            {eventTypes.length > 0 ? (
              <Select
                value={formData.event_type_id}
                onValueChange={(value) => setFormData({ ...formData, event_type_id: value })}
              >
                <SelectTrigger data-testid="event-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes
                    .filter(type => (type.category || 'event') === selectedCategory)
                    .map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: type.color }} />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-gray-500">
                No hay tipos de {selectedCategory === 'document' ? 'documento' : 'evento'} creados.
              </p>
            )}
          </div>

          {/* Campos adicionales para documentos */}
          {selectedCategory === 'document' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-sm text-blue-900">Información del Documento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order_number">Número</Label>
                  <Input
                    id="order_number"
                    data-testid="order-number-input"
                    value={formData.order_number}
                    onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                    placeholder="Ej: PED-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Cantidad €</Label>
                  <Input
                    id="amount"
                    data-testid="amount-input"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente</Label>
                  <Input
                    id="client"
                    data-testid="client-input"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    placeholder="Nombre del cliente"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Proveedor</Label>
                  <Input
                    id="supplier"
                    data-testid="supplier-input"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Nombre del proveedor"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Selector de vinculación a pedido (solo si NO es Pedido/Factura Proforma) */}
          {requiresOrderFields() && !isOrderBaseType() && orders.length > 0 && (
            <div className="space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
              <Label htmlFor="linked_order_id">Vincular a Pedido/Factura Proforma (opcional)</Label>
              <div className="flex gap-2 items-center">
                <Select
                  value={formData.linked_order_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, linked_order_id: value })}
                >
                  <SelectTrigger data-testid="linked-order-select" className="flex-1">
                    <SelectValue placeholder="Sin vincular - Seleccionar pedido (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        #{order.order_number} - {order.supplier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.linked_order_id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, linked_order_id: '' })}
                    className="flex-shrink-0"
                  >
                    Limpiar
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-600">
                Vincula este evento a un pedido existente para hacer seguimiento
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Label>Campos Personalizados</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Campo"
                data-testid="custom-field-key-input"
                value={customFieldKey}
                onChange={(e) => setCustomFieldKey(e.target.value)}
              />
              <Input
                placeholder="Valor"
                data-testid="custom-field-value-input"
                value={customFieldValue}
                onChange={(e) => setCustomFieldValue(e.target.value)}
              />
              <Button type="button" onClick={addCustomField} data-testid="add-custom-field-button">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {Object.keys(formData.custom_fields).length > 0 && (
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                {Object.entries(formData.custom_fields).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center" data-testid={`custom-field-${key}`}>
                    <span className="text-sm">
                      <strong>{key}:</strong> {value}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomField(key)}
                      data-testid={`remove-custom-field-${key}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            {editingEvent && (
              <Button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que quieres eliminar este evento?')) {
                    onDelete(editingEvent.id, true); // skipConfirm = true
                  }
                }}
                variant="destructive"
                data-testid="delete-event-button"
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
            <Button
              type="submit"
              data-testid="save-event-button"
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              disabled={eventTypes.length === 0}
            >
              {editingEvent ? 'Actualizar' : 'Crear'} Evento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventDialog;
