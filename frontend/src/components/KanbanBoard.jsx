import { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Edit } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableTask } from './SortableTask';
import { DroppableColumn } from './DroppableColumn';

const columns = [
  { id: 'todo', title: 'Por Hacer', color: 'from-blue-500 to-blue-600', icon: '📋' },
  { id: 'in_progress', title: 'En Progreso', color: 'from-amber-500 to-orange-600', icon: '⚡' },
  { id: 'done', title: 'Completado', color: 'from-emerald-500 to-green-600', icon: '✅' },
];

const priorityConfig = {
  low: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'Baja', icon: '⚪' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', label: 'Media', icon: '🟡' },
  high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Alta', icon: '🔴' },
};

const KanbanBoard = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [users, setUsers] = useState([]); // Nuevo estado para usuarios
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    task_type_id: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 12,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    loadTasks();
    loadTaskTypes();
    loadUsers(); // Cargar usuarios
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axiosInstance.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      // No mostrar toast de error, puede fallar si no es admin
    }
  };

  const loadTaskTypes = async () => {
    try {
      const response = await axiosInstance.get('/task-types');
      setTaskTypes(response.data);
      if (response.data.length > 0 && !formData.task_type_id) {
        setFormData((prev) => ({ ...prev, task_type_id: response.data[0].id }));
      }
    } catch (error) {
      toast.error('Error al cargar tipos de tareas');
    }
  };

  const loadTasks = async () => {
    try {
      const response = await axiosInstance.get('/kanban');
      setTasks(response.data);
    } catch (error) {
      toast.error('Error al cargar tareas');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await axiosInstance.put(`/kanban/${editingTask.id}`, formData);
        toast.success('Tarea actualizada');
      } else {
        await axiosInstance.post('/kanban', formData);
        toast.success('Tarea creada');
      }
      loadTasks();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Error al guardar tarea');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('¿Eliminar esta tarea?')) return;
    try {
      await axiosInstance.delete(`/kanban/${taskId}`);
      toast.success('Tarea eliminada');
      loadTasks();
    } catch (error) {
      toast.error('Error al eliminar tarea');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      assigned_to: '',
      task_type_id: taskTypes.length > 0 ? taskTypes[0].id : '',
    });
    setEditingTask(null);
  };

  const openEditDialog = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assigned_to: task.assigned_to || '',
      task_type_id: task.task_type_id || (taskTypes.length > 0 ? taskTypes[0].id : ''),
    });
    setDialogOpen(true);
  };

  const getTaskType = (taskTypeId) => {
    return taskTypes.find((t) => t.id === taskTypeId);
  };

  const getTasksByStatus = (status) => {
    return tasks
      .filter((task) => task.status === status)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    console.log('=== DRAG OVER ===');
    console.log('Over ID:', over.id);
    console.log('Is column?', over.id.toString().startsWith('column-'));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    console.log('=== DRAG END DEBUG ===');
    console.log('Active ID:', active.id);
    console.log('Over ID:', over?.id);

    if (!over) {
      console.log('No over target, aborting');
      setActiveId(null);
      return;
    }

    const activeTask = tasks.find((t) => t.id === active.id);
    const overTask = tasks.find((t) => t.id === over.id);

    console.log('Active Task:', activeTask?.title, 'Status:', activeTask?.status);
    console.log('Over Task:', overTask?.title, 'Status:', overTask?.status);
    console.log('Over ID starts with column-?', over.id.toString().startsWith('column-'));

    if (!activeTask) {
      console.log('Active task not found, aborting');
      setActiveId(null);
      return;
    }

    // Determinar status de destino
    let newStatus = activeTask.status;
    if (over.id.toString().startsWith('column-')) {
      // Drop en columna vacía
      newStatus = over.id.replace('column-', '');
      console.log('✅ Detected column drop, newStatus:', newStatus);
    } else if (overTask) {
      // Drop sobre otra tarea
      newStatus = overTask.status;
      console.log('✅ Detected task drop, newStatus:', newStatus);
    } else {
      console.log('⚠️ No valid drop target detected');
    }

    console.log('Final newStatus:', newStatus, 'Original:', activeTask.status);

    // SIMPLIFICADO: Siempre intentar actualizar si hay cambio de status
    if (newStatus !== activeTask.status) {
      console.log('🚀 Status changed, updating task...');
      try {
        await axiosInstance.put(`/kanban/${activeTask.id}`, {
          status: newStatus,
        });
        toast.success(`Tarea movida a ${newStatus}`);
        loadTasks();
      } catch (error) {
        console.error('Error updating task:', error);
        toast.error('Error al mover tarea');
      }
    } else {
      console.log('ℹ️ No status change, no update needed');
    }

    setActiveId(null);
  };

  return (
    <div className="animate-fade-in" data-testid="kanban-board">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Tablero Kanban</h2>
          <p className="text-gray-600 mt-1">Organiza y gestiona tus tareas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="add-task-button"
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nueva Tarea
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="task-dialog" aria-describedby="task-dialog-description">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
            </DialogHeader>
            <p id="task-dialog-description" className="sr-only">Formulario para crear o editar una tarea en el tablero Kanban</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  data-testid="task-title-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  data-testid="task-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task_type_id">Tipo de Tarea</Label>
                {taskTypes.length > 0 ? (
                  <Select
                    value={formData.task_type_id}
                    onValueChange={(value) => setFormData({ ...formData, task_type_id: value })}
                  >
                    <SelectTrigger data-testid="task-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taskTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: type.color }}
                            />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-gray-500">
                    No hay tipos creados. El administrador debe crear tipos primero.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger data-testid="task-priority-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Asignado a</Label>
                <Select
                  value={formData.assigned_to || "unassigned"}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value === "unassigned" ? "" : value })}
                >
                  <SelectTrigger data-testid="task-assigned-select">
                    <SelectValue placeholder="Seleccionar usuario (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.name || user.email}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" data-testid="save-task-button" className="w-full bg-teal-600 hover:bg-teal-700">
                {editingTask ? 'Actualizar' : 'Crear'} Tarea
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        {/* Scroll horizontal en móvil */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          <div className="flex lg:contents gap-3 sm:gap-4 overflow-x-auto pb-4 lg:pb-0 snap-x snap-mandatory touch-pan-x">
            {columns.map((column) => {
              const columnTasks = getTasksByStatus(column.id);
              return (
                <div
                  key={column.id}
                  data-testid={`kanban-column-${column.id}`}
                  className="glass rounded-xl p-4 sm:p-5 shadow-lg min-w-[260px] sm:min-w-[280px] flex-shrink-0 snap-start lg:min-w-0"
                >
                  <div className={`bg-gradient-to-r ${column.color} text-white p-3 sm:p-4 md:p-5 rounded-xl mb-4 shadow-lg`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg sm:text-xl md:text-2xl">{column.icon}</span>
                          <h3 className="text-base sm:text-lg md:text-xl font-bold">{column.title}</h3>
                        </div>
                        <p className="text-xs sm:text-sm opacity-90">
                          {columnTasks.length} {columnTasks.length === 1 ? 'tarea' : 'tareas'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <DroppableColumn
                    id={`column-${column.id}`}
                    className="space-y-3 min-h-[360px] sm:min-h-[420px]"
                  >
                    <SortableContext
                      items={columnTasks.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {columnTasks.map((task) => {
                        const taskType = getTaskType(task.task_type_id);
                        return (
                          <SortableTask
                            key={task.id}
                            task={task}
                            taskType={taskType}
                            priorityConfig={priorityConfig}
                            onEdit={openEditDialog}
                            onDelete={handleDelete}
                          />
                        );
                      })}
                    </SortableContext>
                  </DroppableColumn>
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            (() => {
              const task = tasks.find((t) => t.id === activeId);
              if (!task) return null;
              const taskType = getTaskType(task.task_type_id);
              const priority = priorityConfig[task.priority];
              return (
                <Card
                  className="cursor-move shadow-2xl border-2 border-teal-400 rotate-3"
                  style={{
                    backgroundColor: task.task_type_id ? `${taskType?.color}10` : 'white',
                    borderLeftWidth: '4px',
                    borderLeftColor: task.task_type_id ? taskType?.color : '#e5e7eb',
                  }}
                >
                  <CardContent className="p-4">
                    <h4 className="font-bold text-gray-900 text-base mb-2">{task.title}</h4>
                    {task.task_type_id && taskType && (
                      <span
                        className="text-xs px-2 py-1 rounded-full text-white font-medium inline-block mb-2"
                        style={{ backgroundColor: taskType.color }}
                      >
                        {taskType.name}
                      </span>
                    )}
                    {task.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium border ${priority.bg} ${priority.text} ${priority.border}`}>
                        {priority.icon} {priority.label}
                      </span>
                      {task.assigned_to && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">{task.assigned_to}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default KanbanBoard;