// Componente DroppableColumn - Para columnas que aceptan drops
import { useDroppable } from '@dnd-kit/core';

export const DroppableColumn = ({ id, children, className }) => {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
};
