import { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
    order_date: '',
  });
  const [reminders, setReminders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [markAsPending, setMarkAsPending] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (editingEvent) {
      // Cuando editamos, inferir la categoría del tipo seleccionado
      const selectedType = eventTypes.find(t => t.id === editingEvent.event_type_id);
      const category = selectedType?.category || 'event';
      setSelectedCategory(category);
      const isPendingFlag = Boolean(editingEvent.custom_fields?.is_pending);
      setMarkAsPending(isPendingFlag);
      
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
        order_date: editingEvent.custom_fields?.order_date || '',
      });
      const mappedReminders = (editingEvent.reminders || []).map((reminder) => {
        let reminderDate = reminder.reminder_date || '';
        try {
          const parsed = parseISO(reminderDate);
          reminderDate = format(parsed, 'yyyy-MM-dd');
        } catch (error) {
          console.error('Error parsing reminder date:', error);
          reminderDate = '';
        }
        return {
          title: reminder.title || '',
          description: reminder.description || '',
          reminder_date: reminderDate,
        };
      });
      setReminders(mappedReminders);
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
    setMarkAsPending(false);
    
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
      order_date: '',
    });
    setCustomFieldKey('');
    setCustomFieldValue('');
    setReminders([]);
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
      custom_fields: { ...(formData.custom_fields || {}) },
    };

    // Normalizar campos opcionales ('' -> null)
    ['order_number', 'client', 'supplier', 'linked_order_id', 'description'].forEach((field) => {
      if (payload[field] === '') {
        payload[field] = null;
      }
    });

    const orderDate = payload.order_date;
    delete payload.order_date;

    // Convertir amount a número o null
    if (payload.amount === '' || payload.amount === null || payload.amount === undefined) {
      payload.amount = null;
    } else {
      const parsedAmount = parseFloat(payload.amount);
      payload.amount = Number.isFinite(parsedAmount) ? parsedAmount : null;
    }

    // Gestionar flag de pendiente para eventos
    if (selectedCategory === 'event') {
      if (markAsPending) {
        payload.custom_fields.is_pending = true;
      } else {
        if (payload.custom_fields && 'is_pending' in payload.custom_fields) {
          const { is_pending, ...rest } = payload.custom_fields;
          payload.custom_fields = Object.keys(rest).length ? rest : {};
        }
      }
    } else if (payload.custom_fields && 'is_pending' in payload.custom_fields) {
      const { is_pending, ...rest } = payload.custom_fields;
      payload.custom_fields = Object.keys(rest).length ? rest : {};
    }

    // Si la categoría es "event", limpiar campos específicos de pedidos
    if (selectedCategory !== 'document') {
      payload.order_number = null;
      payload.client = null;
      payload.supplier = null;
      payload.amount = null;
      payload.linked_order_id = payload.linked_order_id || null;
      if (payload.custom_fields && 'order_date' in payload.custom_fields) {
        const { order_date, ...restFields } = payload.custom_fields;
        payload.custom_fields = Object.keys(restFields).length ? restFields : {};
      }
    }

    if (selectedCategory === 'document') {
      if (orderDate) {
        payload.custom_fields.order_date = orderDate;
      } else if (payload.custom_fields && 'order_date' in payload.custom_fields) {
        const { order_date, ...restFields } = payload.custom_fields;
        payload.custom_fields = Object.keys(restFields).length ? restFields : {};
      }
    }

    if (reminders.length) {
      payload.reminders = reminders
        .filter((reminder) => reminder.title && reminder.reminder_date)
        .map((reminder) => ({
          title: reminder.title,
          description: reminder.description || null,
          reminder_date: reminder.reminder_date,
        }));
    } else {
      payload.reminders = [];
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

  const addReminder = () => {
    setReminders((prev) => [
      ...prev,
      {
        title: '',
        description: '',
        reminder_date: format(new Date(), 'yyyy-MM-dd'),
      },
    ]);
  };

  const updateReminder = (index, key, value) => {
    setReminders((prev) => prev.map((reminder, idx) => (idx === index ? { ...reminder, [key]: value } : reminder)));
  };

  const removeReminder = (index) => {
    setReminders((prev) => prev.filter((_, idx) => idx !== index));
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
                    setMarkAsPending(false);
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
                    setMarkAsPending(false);
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

          {selectedCategory === 'event' && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <Label className="text-sm font-medium text-gray-800">Marcar como pendiente</Label>
                <p className="text-xs text-gray-500">
                  El evento aparecerá en el lateral hasta que lo marques como resuelto.
                </p>
              </div>
              <Switch
                checked={markAsPending}
                onCheckedChange={(checked) => setMarkAsPending(checked)}
                data-testid="event-mark-pending-switch"
              />
            </div>
          )}

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
                  <Label htmlFor="order_date">Fecha del pedido</Label>
                  <Input
                    id="order_date"
                    data-testid="order-date-input"
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
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

          {/* Recordatorios asociados */}
          <div className="space-y-3 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-900">Recordatorios adicionales</h3>
                <p className="text-xs text-slate-500">Programa avisos automáticos para este evento.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addReminder} data-testid="event-add-reminder">
                <Plus className="w-4 h-4 mr-2" /> Añadir recordatorio
              </Button>
            </div>

            {reminders.length === 0 ? (
              <p className="text-xs text-slate-500">No hay recordatorios añadidos.</p>
            ) : (
              <div className="space-y-4">
                {reminders.map((reminder, index) => (
                  <div key={`reminder-${index}`} className="space-y-3 rounded-md border border-slate-200 p-3 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Recordatorio #{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeReminder(index)}
                        aria-label={`Eliminar recordatorio ${index + 1}`}
                        data-testid={`event-remove-reminder-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs" htmlFor={`reminder-title-${index}`}>Título</Label>
                        <Input
                          id={`reminder-title-${index}`}
                          value={reminder.title}
                          onChange={(e) => updateReminder(index, 'title', e.target.value)}
                          placeholder="Ej: Llamar al cliente"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs" htmlFor={`reminder-date-${index}`}>Fecha y hora</Label>
                        <Input
                          id={`reminder-date-${index}`}
                          type="date"
                          value={reminder.reminder_date}
                          onChange={(e) => updateReminder(index, 'reminder_date', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2 md:col-span-1">
                        <Label className="text-xs" htmlFor={`reminder-description-${index}`}>Descripción</Label>
                        <Input
                          id={`reminder-description-${index}`}
                          value={reminder.description}
                          onChange={(e) => updateReminder(index, 'description', e.target.value)}
                          placeholder="Detalles opcionales"
                        />
                      </div>
                    </div>
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
