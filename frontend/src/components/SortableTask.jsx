// Componente SortableTask - Para tareas arrastrables
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';

export const SortableTask = ({ task, taskType, priorityConfig, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: task.task_type_id ? `${taskType?.color}10` : 'white',
    borderLeftWidth: '4px',
    borderLeftColor: task.task_type_id ? taskType?.color : '#e5e7eb',
  };

  const priority = priorityConfig[task.priority];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`task-${task.id}`}
      className="cursor-move hover:shadow-2xl transition-all duration-300 border-2 hover:border-teal-400"
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 text-base mb-2">{task.title}</h4>
            {task.task_type_id && taskType && (
              <span
                className="text-xs px-2 py-1 rounded-full text-white font-medium inline-block mb-2"
                style={{ backgroundColor: taskType.color }}
              >
                {taskType.name}
              </span>
            )}
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onEdit(task)}
              data-testid={`edit-task-${task.id}`}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            >
              <Edit className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              data-testid={`delete-task-${task.id}`}
              className="p-1.5 hover:bg-red-100 rounded transition-colors"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          </div>
        </div>
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
};
