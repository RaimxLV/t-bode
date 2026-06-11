import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import type { DBProduct } from "@/hooks/useProducts";

interface Props {
  products: DBProduct[];
  onEdit: (p: DBProduct) => void;
  onDelete: (id: string) => void;
  onReordered?: () => void;
}

function SortableCard({
  product,
  onEdit,
  onDelete,
}: {
  product: DBProduct;
  onEdit: (p: DBProduct) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as any,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Pārvietot"
        className="absolute top-1 left-1 z-20 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={16} />
      </button>
      <ProductCard product={product} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

export function SortableProductGrid({ products, onEdit, onDelete, onReordered }: Props) {
  const [items, setItems] = useState(products);
  useEffect(() => setItems(products), [products]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    // Re-number all visible items with multiples of 10 so future inserts have room
    const updates = next.map((p, idx) => ({ id: p.id, display_order: (idx + 1) * 10 }));
    try {
      await Promise.all(
        updates.map((u) =>
          supabase.from("products").update({ display_order: u.display_order }).eq("id", u.id)
        )
      );
      onReordered?.();
    } catch (err: any) {
      toast.error("Neizdevās saglabāt secību: " + (err?.message ?? String(err)));
      setItems(products);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
          {items.map((p) => (
            <SortableCard key={p.id} product={p} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}