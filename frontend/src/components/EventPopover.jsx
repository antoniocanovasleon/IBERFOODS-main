import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, FileText } from 'lucide-react';

const EventPopover = ({ event, eventType }) => {
  // Verificar si es un documento
  const isDocument = eventType?.category === 'document';
  
  // Verificar si tiene información de documento
  const hasDocumentInfo = event.order_number || event.client || event.supplier || event.amount;
  
  return (
    <Card className="w-80 shadow-2xl border-2" style={{ borderColor: eventType?.color }}>
      <CardHeader className="pb-3" style={{ backgroundColor: `${eventType?.color}15` }}>
        <CardTitle className="text-base font-bold text-gray-900">{event.title}</CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="text-xs px-2 py-1 rounded-full text-white font-medium"
            style={{ backgroundColor: eventType?.color }}
          >
            {isDocument ? '📄' : '📅'} {eventType?.name}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>
              {format(parseISO(event.fecha_inicio), 'd MMM', { locale: es })} - {format(parseISO(event.fecha_fin), 'd MMM', { locale: es })}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3 space-y-3">
        {event.description && (
          <div>
            <p className="text-sm text-gray-700">{event.description}</p>
          </div>
        )}
        
        {/* Información del Documento - Solo para documentos */}
        {isDocument && hasDocumentInfo && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Información del Documento:
            </p>
            <div className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
              {event.order_number && (
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-700">Número:</span>
                  <span className="text-gray-900 font-semibold">{event.order_number}</span>
                </div>
              )}
              {event.client && (
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-700">Cliente:</span>
                  <span className="text-gray-900">{event.client}</span>
                </div>
              )}
              {event.supplier && (
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-700">Proveedor:</span>
                  <span className="text-gray-900">{event.supplier}</span>
                </div>
              )}
              {event.amount && (
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-700">Cantidad:</span>
                  <span className="text-green-700 font-bold">{parseFloat(event.amount).toFixed(2)} €</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {event.custom_fields && Object.keys(event.custom_fields).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Información adicional:
            </p>
            <div className="space-y-1 bg-gray-50 p-2 rounded">
              {Object.entries(event.custom_fields).map(([key, value]) => (
                <div key={key} className="text-xs">
                  <span className="font-medium text-gray-700">{key}:</span>{' '}
                  <span className="text-gray-600">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EventPopover;
