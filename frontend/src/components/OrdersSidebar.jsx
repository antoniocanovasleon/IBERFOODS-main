import { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Package, Trash2, FileText } from 'lucide-react';

const OrdersSidebar = () => {
  const [orders, setOrders] = useState([]);
  const [linkedEvents, setLinkedEvents] = useState({});
  const [loadingEvents, setLoadingEvents] = useState({});

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await axiosInstance.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error al cargar pedidos');
    }
  };

  const loadLinkedEvents = async (orderId) => {
    if (linkedEvents[orderId]) {
      return; // Ya cargado
    }

    setLoadingEvents(prev => ({ ...prev, [orderId]: true }));
    try {
      const response = await axiosInstance.get(`/orders/${orderId}/linked-events`);
      setLinkedEvents(prev => ({ ...prev, [orderId]: response.data }));
    } catch (error) {
      console.error('Error loading linked events:', error);
    } finally {
      setLoadingEvents(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('¿Eliminar este pedido de la lista?')) return;

    try {
      await axiosInstance.delete(`/orders/${orderId}`);
      toast.success('Pedido eliminado');
      loadOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Error al eliminar pedido');
    }
  };

  if (orders.length === 0) {
    return null; // No mostrar nada si no hay pedidos
  }

  return (
    <div className="mt-auto pt-4 border-t border-gray-200">
      <div className="px-4 mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Pedidos Activos
        </h3>
        <p className="text-xs text-gray-500 mt-1">{orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}</p>
      </div>
      
      <div className="space-y-2 px-4 max-h-64 overflow-y-auto">
        {orders.map((order) => (
          <Popover key={order.id} onOpenChange={(open) => {
            if (open) {
              loadLinkedEvents(order.id);
            }
          }}>
            <PopoverTrigger asChild>
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                data-testid={`order-${order.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          #{order.order_number}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{order.supplier}</p>
                      {linkedEvents[order.id] && linkedEvents[order.id].length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <FileText className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">
                            {linkedEvents[order.id].length} vinculado{linkedEvents[order.id].length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOrder(order.id);
                      }}
                      className="p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                      data-testid={`delete-order-${order.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </PopoverTrigger>
            
            <PopoverContent side="right" align="start" className="w-80">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    Pedido #{order.order_number}
                  </h4>
                  <div className="text-xs space-y-1 text-gray-600">
                    <p><span className="font-medium">Proveedor:</span> {order.supplier}</p>
                    <p><span className="font-medium">Cliente:</span> {order.client}</p>
                    {order.amount && (
                      <p><span className="font-medium">Cantidad:</span> {order.amount}€</p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h5 className="font-medium text-xs mb-2 text-gray-700">Eventos Vinculados:</h5>
                  
                  {loadingEvents[order.id] ? (
                    <p className="text-xs text-gray-500">Cargando...</p>
                  ) : linkedEvents[order.id] && linkedEvents[order.id].length > 0 ? (
                    <div className="space-y-2">
                      {linkedEvents[order.id].map((event) => (
                        <div 
                          key={event.id} 
                          className="bg-gray-50 p-2 rounded text-xs"
                          data-testid={`linked-event-${event.id}`}
                        >
                          <p className="font-medium text-gray-900">{event.event_type_name}</p>
                          {event.order_number && (
                            <p className="text-gray-600">#{event.order_number}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Sin eventos vinculados</p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>
    </div>
  );
};

export default OrdersSidebar;
