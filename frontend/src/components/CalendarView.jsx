import { useState, useEffect, useMemo } from 'react';
import { axiosInstance } from '@/App';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek, isWithinInterval, parseISO, differenceInDays, isSameDay, isAfter, isBefore, isSameMonth, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import EventDialog from './EventDialog';
import EventPopover from './EventPopover';

const CalendarView = ({ user }) => {
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [hoveredEventId, setHoveredEventId] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    loadEvents();
    loadEventTypes();
    loadOrders();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const today = new Date();
  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
  const dayCellMinHeight = isMobile ? 80 : isTablet ? 120 : 140;
  const eventBarHeight = isMobile ? 18 : 22;
  const eventBarOffset = isMobile ? 16 : 24;
  const weeklyColumnMinHeight = isMobile ? 260 : isTablet ? 340 : 400;
  const weeklyEventHeight = isMobile ? 52 : 58;
  const weeklyTrackOffset = isMobile ? 52 : 58;

  const loadEvents = async () => {
    try {
      const response = await axiosInstance.get('/calendar');
      console.log('[CalendarView] Events loaded:', response.data);
      console.log('[CalendarView] First event reminders:', response.data[0]?.reminders);
      setEvents(response.data);
    } catch (error) {
      console.error('[CalendarView] Error loading events:', error);
      toast.error('Error al cargar eventos');
    }
  };

  const loadEventTypes = async () => {
    try {
      const response = await axiosInstance.get('/event-types');
      setEventTypes(response.data);
    } catch (error) {
      toast.error('Error al cargar tipos');
    }
  };

  const loadOrders = async () => {
    try {
      const response = await axiosInstance.get('/orders');
      setOrders(response.data);
      window.dispatchEvent(new Event('orders:refresh'));
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    }
  };

  const getLinkedOrderInfo = (event) => {
    if (!event.linked_order_id) return null;
    return orders.find(order => order.id === event.linked_order_id);
  };

  const handlePrevious = () => {
    if (viewMode === 'week') {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else {
      setSelectedDate(addMonths(selectedDate, 1));
    }
  };

  const getWeekTitle = () => {
    if (viewMode === 'month') {
      return format(selectedDate, 'MMMM yyyy', { locale: es });
    }
    
    // Vista semanal: mostrar rango de fechas
    const start = startOfWeek(selectedDate, { weekStartsOn: 1, locale: es });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1, locale: es });
    
    const startDay = format(start, 'd', { locale: es });
    const startMonth = format(start, 'MMM', { locale: es });
    const endDay = format(end, 'd', { locale: es });
    const endMonth = format(end, 'MMM', { locale: es });
    const year = format(end, 'yyyy', { locale: es });
    
    // Si están en el mismo mes
    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${endMonth} ${year}`;
    }
    
    // Si están en diferentes meses
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  };

  const handleDelete = async (eventId, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm('¿Eliminar este evento?')) return;
    try {
      await axiosInstance.delete(`/calendar/${eventId}`);
      toast.success('Evento eliminado');
      loadEvents();
      loadOrders(); // Recargar pedidos en caso de que sea un pedido
      closeDialog(); // Cerrar el modal si está abierto
    } catch (error) {
      toast.error('Error al eliminar evento');
    }
  };

  const openEditDialog = (event) => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = () => {
    loadEvents();
    loadOrders(); // Recargar pedidos activos después de guardar evento
    closeDialog();
  };

  const getDaysInView = () => {
    if (viewMode === 'month') {
      // Para vista mensual, necesitamos incluir días de semanas completas
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      
      // Obtener el inicio de la semana del primer día del mes
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1, locale: es }); // 1 = Lunes
      // Obtener el final de la semana del último día del mes
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1, locale: es });
      
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1, locale: es });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1, locale: es });
      return eachDayOfInterval({ start, end });
    }
  };

  const getEventType = (eventTypeId) => {
    return eventTypes.find((t) => t.id === eventTypeId);
  };

  const combinedEntries = useMemo(() => {
    if (!events.length) return [];

    const baseEvents = events.map(event => ({ ...event, __kind: 'event' }));
    const reminderEntries = events.flatMap(event => {
      const parentType = eventTypes.find(t => t.id === event.event_type_id);
      return (event.reminders || []).map(reminder => ({
        ...reminder,
        __kind: 'reminder',
        linked_event_id: event.id,
        event_id: event.id,
        title: reminder.title,
        description: reminder.description,
        fecha_inicio: reminder.reminder_date,
        fecha_fin: reminder.reminder_date,
        event_type_id: 'reminder',
        parent_event_type_id: event.event_type_id,
        parent_event_type_name: parentType?.name || 'Evento',
        parent_event_type_category: parentType?.category || 'event'
      }));
    });

    console.log('[CalendarView] Combined entries:', {
      totalEvents: baseEvents.length,
      totalReminders: reminderEntries.length,
      combined: [...baseEvents, ...reminderEntries].length
    });

    return [...baseEvents, ...reminderEntries];
  }, [events, eventTypes]);

  const reminderType = useMemo(() => ({
    id: 'reminder',
    name: 'Recordatorio',
    color: '#9F7AEA',
    category: 'event',
  }), []);

  const getEntryId = (entry) => {
    if (entry.__kind === 'event') {
      return entry.id;
    }
    return entry.id ? `reminder-${entry.id}` : `reminder-${entry.event_id}-${entry.reminder_date}`;
  };

  const isReminderEntry = (entry) => entry.__kind === 'reminder';

  const getEntryType = (entry) => {
    if (isReminderEntry(entry)) {
      return reminderType;
    }
    return getEventType(entry.event_type_id);
  };

  const getEntryBadgeLabel = (entry, eventType) => {
    if (isReminderEntry(entry)) {
      return `Recordatorio ${entry.parent_event_type_name || 'Evento'}`;
    }
    return eventType?.name || 'Evento';
  };

  // Calcula cuántas columnas debe abarcar un evento
  const getEventSpan = (entry, days) => {
    const eventStart = parseISO(entry.fecha_inicio);
    const eventEnd = parseISO(entry.fecha_fin);
    
    // Encontrar en qué día empieza dentro de la vista
    const startDay = days.find(day => isSameDay(day, eventStart));
    if (!startDay) return null; // El evento no comienza en esta vista
    
    const startIndex = days.findIndex(day => isSameDay(day, startDay));
    
    // Calcular cuántos días abarca dentro de la vista
    let span = 1;
    for (let i = startIndex + 1; i < days.length; i++) {
      if (isAfter(days[i], eventEnd)) break;
      span++;
    }
    
    return { startIndex, span };
  };

  const days = getDaysInView();

  // Obtener eventos que comienzan en cada día (para vista mensual)
  const getEventsStartingOnDay = (day) => {
    return combinedEntries.filter(entry => isSameDay(parseISO(entry.fecha_inicio), day));
  };

  return (
    <div className="animate-fade-in" data-testid="calendar-view">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Calendario</h2>
          <p className="text-gray-600 mt-1">Gestiona pedidos, albaranes y documentación</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
            data-testid="calendar-view-toggle"
            variant="outline"
            className="bg-white/70 hover:bg-white"
          >
            {viewMode === 'month' ? 'Vista Semanal' : 'Vista Mensual'}
          </Button>
          <Button
            onClick={() => {
              setEditingEvent(null);
              setDialogOpen(true);
            }}
            data-testid="add-event-button"
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Evento
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2 sm:gap-3">
        <Button
          variant="outline"
          onClick={handlePrevious}
          data-testid="calendar-prev-button"
          className="bg-white/70"
          size="sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-base sm:text-lg md:text-xl font-semibold" data-testid="calendar-month-display">
          {getWeekTitle()}
        </h3>
        <Button
          variant="outline"
          onClick={handleNext}
          data-testid="calendar-next-button"
          className="bg-white/70"
          size="sm"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'month' ? (
        // Vista Mensual con eventos extendidos
        <div className="overflow-x-auto sm:overflow-visible">
          {/* Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-3 mb-3 min-w-full sm:min-w-[640px]">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
              <div key={day} className="text-center font-bold text-gray-700 text-[11px] sm:text-sm md:text-base">
                <span className="hidden sm:inline">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i]}
                </span>
                <span className="sm:hidden">{day}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-3 relative min-w-full sm:min-w-[640px]">
            {/* Capa de fondo: Celdas de días */}
            <div className="contents">
              {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, selectedDate);
                const isToday = isSameDay(day, today);
                const isPast = isBefore(day, startOfDay(today)) && isCurrentMonth;
                return (
                  <div
                    key={day.toString()}
                    className={`p-2 sm:p-3 rounded-lg border transition-colors ${
                      isToday
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : isPast
                        ? 'bg-slate-100 border-slate-200 text-slate-500'
                        : 'glass border-white/40'
                    } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                    data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    style={{ minHeight: dayCellMinHeight }}
                  >
                    <div className={`font-semibold text-[11px] sm:text-xs md:text-sm ${
                      isToday ? 'text-blue-900' : isPast ? 'text-slate-500' : isCurrentMonth ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {format(day, 'd MMM', { locale: es })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Capa superior: Eventos que se extienden */}
            <div 
              className="absolute top-0 left-0 right-0 gap-3" 
              style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridTemplateRows: `repeat(${Math.ceil(days.length / 7)}, minmax(${dayCellMinHeight}px, 1fr))`,
                pointerEvents: 'none' 
              }}
            >
              {(() => {
                const totalDays = days.length;
                
                // Algoritmo de interval scheduling
                const tracks = Array(totalDays).fill(null).map(() => []);
                const eventTracks = {};
                
                const eventSpans = combinedEntries.map(entry => ({
                  entry,
                  span: getEventSpan(entry, days)
                })).filter(item => item.span !== null);
                
                // Ordenar con criterio estable (ID) para evitar que eventos se muevan
                eventSpans.sort((a, b) => {
                  if (a.span.startIndex !== b.span.startIndex) {
                    return a.span.startIndex - b.span.startIndex;
                  }
                  if (a.span.span !== b.span.span) {
                    return b.span.span - a.span.span;
                  }
                  const endDiffA = a.span.startIndex + a.span.span;
                  const endDiffB = b.span.startIndex + b.span.span;
                  if (endDiffA !== endDiffB) {
                    return endDiffA - endDiffB;
                  }
                  const idA = getEntryId(a.entry);
                  const idB = getEntryId(b.entry);
                  return idA.localeCompare(idB);
                });
                
                // Asignar tracks
                eventSpans.forEach(({ entry, span }) => {
                  const startDay = span.startIndex;
                  const endDay = Math.min(span.startIndex + span.span - 1, totalDays - 1);
                  const entryId = getEntryId(entry);
                  
                  let trackNum = 0;
                  let foundTrack = false;
                  
                  while (!foundTrack) {
                    let canUseTrack = true;
                    
                    for (let day = startDay; day <= endDay; day++) {
                      if (tracks[day][trackNum]) {
                        canUseTrack = false;
                        break;
                      }
                    }
                    
                    if (canUseTrack) {
                      for (let day = startDay; day <= endDay; day++) {
                        tracks[day][trackNum] = entryId;
                      }
                      eventTracks[entryId] = trackNum;
                      foundTrack = true;
                    } else {
                      trackNum++;
                    }
                  }
                });
                
                return combinedEntries.map((entry, globalIdx) => {
                  const eventSpan = getEventSpan(entry, days);
                  if (!eventSpan) return null;
                  
                  const entryKey = getEntryId(entry);
                  const track = eventTracks[entryKey] || 0;
                  const eventType = getEntryType(entry);
                  const duration = differenceInDays(parseISO(entry.fecha_fin), parseISO(entry.fecha_inicio));
                  const isReminder = isReminderEntry(entry);
                  
                  const weekRow = Math.floor(eventSpan.startIndex / 7);
                  const dayOfWeek = eventSpan.startIndex % 7;
                  
                  return (
                    <Popover key={entryKey} open={hoveredEventId === entryKey} onOpenChange={(open) => !open && setHoveredEventId(null)}>
                      <PopoverTrigger asChild>
                        <div
                          className="p-1.5 rounded-md text-xs font-medium text-white cursor-pointer hover:opacity-90 hover:scale-105 hover:shadow-xl transition-all"
                          style={{
                            backgroundColor: eventType?.color || '#6366f1',
                            gridColumn: `${dayOfWeek + 1} / span ${Math.min(eventSpan.span, 7 - dayOfWeek)}`,
                            gridRow: weekRow + 1,
                            marginTop: `${eventBarOffset + track * (eventBarHeight + 6)}px`,
                            height: `${eventBarHeight}px`,
                            pointerEvents: 'auto',
                            zIndex: 10 + globalIdx
                          }}
                        onMouseEnter={() => setHoveredEventId(entryKey)}
                        onMouseLeave={() => setHoveredEventId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isReminder) {
                            const parentEvent = events.find(ev => ev.id === entry.event_id);
                            if (parentEvent) {
                              openEditDialog(parentEvent);
                            }
                          } else {
                            openEditDialog(entry);
                          }
                        }}
                        data-testid={`event-${entryKey}`}
                      >
                        <div className="flex items-center justify-between gap-1 h-full">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            {entry.linked_order_id && (
                              <Link2 className="h-3 w-3 flex-shrink-0" />
                            )}
                            <span className="truncate leading-tight">
                              {isReminder ? `🔔 ${entry.title}` : entry.title}
                            </span>
                          </div>
                          {!isReminder && duration > 0 && (
                            <span className="text-xs opacity-90 whitespace-nowrap font-bold leading-tight">
                              {duration + 1}d
                            </span>
                          )}
                        </div>
                        {entry.linked_order_id && (() => {
                          const linkedOrder = getLinkedOrderInfo(entry);
                          return linkedOrder && (
                            <div className="text-xs opacity-75 truncate leading-tight mt-0.5">
                              #{linkedOrder.order_number} - {linkedOrder.supplier}
                            </div>
                          );
                        })()}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent 
                      side="right" 
                      className="p-0 w-auto"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                      onMouseEnter={() => setHoveredEventId(entryKey)}
                      onMouseLeave={() => setHoveredEventId(null)}
                    >
                      <EventPopover 
                        event={entry.__kind === 'event' ? entry : events.find(ev => ev.id === entry.event_id) || entry} 
                        eventType={eventType}
                        reminder={isReminder ? entry : null}
                      />
                    </PopoverContent>
                  </Popover>
                );
              });
              })()}
            </div>
          </div>
        </div>
      ) : (
        // Vista Semanal con eventos extendidos
        <div className="overflow-x-auto sm:overflow-visible">
          {/* Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-3 mb-3 min-w-full sm:min-w-[640px]">
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              const isPast = isBefore(day, startOfDay(today));
              const isCurrentMonth = isSameMonth(day, selectedDate);
              return (
                <div
                  key={day.toString()}
                  className={`text-center p-2 md:p-3 rounded-lg border transition-colors shadow-md ${
                    isToday
                      ? 'bg-blue-500 text-white border-blue-600'
                      : isPast
                      ? 'bg-slate-200 text-slate-600 border-slate-300'
                      : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-transparent'
                  } ${!isCurrentMonth ? 'opacity-80' : ''}`}
                >
                  <div className="font-bold text-base md:text-lg">{format(day, 'd', { locale: es })}</div>
                  <div className={`text-xs md:text-sm ${isToday ? 'opacity-100' : 'opacity-90'}`}>
                    {format(day, 'EEE', { locale: es })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week body con eventos extendidos */}
          <div className="relative min-w-full sm:min-w-[640px]" style={{ minHeight: `${weeklyColumnMinHeight}px` }}>
            {/* Columnas de fondo */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-3">
              {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, selectedDate);
                const isToday = isSameDay(day, today);
                const isPast = isBefore(day, startOfDay(today)) && (isCurrentMonth || viewMode === 'week');
                return (
                  <div
                    key={day.toString()}
                    className={`rounded-lg border transition-colors ${
                      isToday
                        ? 'bg-blue-50 border-blue-200'
                        : isPast
                        ? 'bg-slate-100 border-slate-200'
                        : 'glass border-white/40'
                    } ${!isCurrentMonth ? 'opacity-80' : ''}`}
                    data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    style={{ minHeight: `${weeklyColumnMinHeight}px` }}
                  />
                );
              })}
            </div>
            
            {/* Eventos superpuestos que se extienden */}
            <div
              className="absolute top-0 left-0 right-0 grid grid-cols-7 gap-1 sm:gap-2 lg:gap-3"
              style={{
                pointerEvents: 'none',
                gridAutoRows: `${weeklyEventHeight}px`
              }}
            >
              {(() => {
                // Preparar eventos con sus spans dentro de la semana
                const eventSpans = combinedEntries
                  .map((entry) => ({ entry, span: getEventSpan(entry, days) }))
                  .filter((item) => item.span !== null);

                // Ordenar para asignar tracks de forma determinista y compacta
                eventSpans.sort((a, b) => {
                  if (a.span.startIndex !== b.span.startIndex) {
                    return a.span.startIndex - b.span.startIndex;
                  }
                  if (a.span.span !== b.span.span) {
                    return b.span.span - a.span.span;
                  }
                  const endDiffA = a.span.startIndex + a.span.span;
                  const endDiffB = b.span.startIndex + b.span.span;
                  if (endDiffA !== endDiffB) {
                    return endDiffA - endDiffB;
                  }
                  const idA = getEntryId(a.entry);
                  const idB = getEntryId(b.entry);
                  return idA.localeCompare(idB);
                });

                // Asignar tracks locales día a día evitando huecos
                const dayAssignments = Array.from({ length: 7 }, () => new Set());
                const localTrackByEvent = {};

                eventSpans.forEach(({ entry, span }) => {
                  const startDay = span.startIndex;
                  const endDay = Math.min(span.startIndex + span.span - 1, 6);
                  const entryId = getEntryId(entry);

                  let trackNum = 0;
                  let assigned = false;

                  while (!assigned) {
                    let available = true;

                    for (let day = startDay; day <= endDay; day++) {
                      if (dayAssignments[day].has(trackNum)) {
                        available = false;
                        break;
                      }
                    }

                    if (available) {
                      localTrackByEvent[entryId] = trackNum;
                      for (let day = startDay; day <= endDay; day++) {
                        dayAssignments[day].add(trackNum);
                      }
                      assigned = true;
                    } else {
                      trackNum++;
                    }
                  }
                });

                return eventSpans.map(({ entry, span }, index) => {
                  const entryId = getEntryId(entry);
                  const localTrack = localTrackByEvent[entryId] ?? 0;
                  const startIndex = span.startIndex;
                  const spanLength = span.span;
                  const eventType = getEntryType(entry);
                  const duration = differenceInDays(parseISO(entry.fecha_fin), parseISO(entry.fecha_inicio));
                  const isReminder = isReminderEntry(entry);

                  return (
                    <Popover key={entryId} open={hoveredEventId === entryId} onOpenChange={(open) => !open && setHoveredEventId(null)}>
                      <PopoverTrigger asChild>
                        <div
                          className="p-2 rounded-lg shadow-lg hover:shadow-2xl transition-all cursor-pointer border-l-4"
                          style={{
                            backgroundColor: `${eventType?.color}15`,
                            borderColor: eventType?.color || '#6366f1',
                            gridColumn: `${startIndex + 1} / span ${spanLength}`,
                            gridRowStart: localTrack + 1,
                            height: `${weeklyEventHeight}px`,
                            pointerEvents: 'auto',
                            zIndex: 10 + index
                          }}
                        onMouseEnter={() => setHoveredEventId(entryId)}
                        onMouseLeave={() => setHoveredEventId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isReminder) {
                            const parentEvent = events.find(ev => ev.id === entry.event_id);
                            if (parentEvent) {
                              openEditDialog(parentEvent);
                            }
                          } else {
                            openEditDialog(entry);
                          }
                        }}
                        data-testid={`event-${entryId}`}
                      >
                        <div className="mb-1">
                          <div className="flex items-start gap-1.5 mb-1">
                            {entry.linked_order_id && (
                              <Link2 className="h-4 w-4 text-gray-700 flex-shrink-0 mt-0.5" />
                            )}
                            <h4 className="font-bold text-gray-900 text-sm line-clamp-1">
                              {isReminder ? `🔔 ${entry.title}` : entry.title}
                            </h4>
                          </div>
                          {entry.linked_order_id && (() => {
                            const linkedOrder = getLinkedOrderInfo(entry);
                            return linkedOrder && (
                              <div className="text-xs text-gray-600 mb-1">
                                🔗 Pedido #{linkedOrder.order_number} - {linkedOrder.supplier}
                              </div>
                            );
                          })()}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                              style={{ backgroundColor: eventType?.color }}
                            >
                              {getEntryBadgeLabel(entry, eventType)}
                            </span>
                            {!isReminder && duration > 0 && (
                              <span className="text-xs text-gray-600 font-medium">
                                {format(parseISO(entry.fecha_inicio), 'd MMM', { locale: es })} - {format(parseISO(entry.fecha_fin), 'd MMM', { locale: es })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {entry.description && (
                          <p className="text-xs text-gray-700 line-clamp-1">{entry.description}</p>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent 
                      side="right" 
                      className="p-0 w-auto"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                      onMouseEnter={() => setHoveredEventId(entryId)}
                      onMouseLeave={() => setHoveredEventId(null)}
                    >
                      <EventPopover 
                        event={entry.__kind === 'event' ? entry : events.find(ev => ev.id === entry.event_id) || entry} 
                        eventType={eventType}
                        reminder={isReminder ? entry : null}
                      />
                    </PopoverContent>
                  </Popover>
                );
              });
              })()}
            </div>
          </div>
        </div>
      )}

      <EventDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSave={handleSaveEvent}
        onDelete={handleDelete}
        editingEvent={editingEvent}
        eventTypes={eventTypes}
      />
    </div>
  );
};

export default CalendarView;
