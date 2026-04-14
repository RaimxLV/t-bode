import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X, FolderTree } from "lucide-react";
import { useCategories, getTopLevel, getChildren, type Category } from "@/hooks/useCategories";
import { useQueryClient } from "@tanstack/react-query";

export const CategoryManager = () => {
  const { data: allCategories = [], isLoading } = useCategories();
  const queryClient = useQueryClient();
  const topCategories = getTopLevel(allCategories);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newParent, setNewParent] = useState<string>("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9āčēģīķļņšūž]+/g, "-").replace(/(^-|-$)/g, "");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const slug = newSlug.trim() || generateSlug(name);
    const parentId = newParent === "none" ? null : newParent;

    // Determine sort_order
    const siblings = parentId
      ? allCategories.filter((c) => c.parent_id === parentId)
      : topCategories;
    const sortOrder = siblings.length + 1;

    const { error } = await supabase.from("categories").insert({
      name,
      slug,
      parent_id: parentId,
      sort_order: sortOrder,
    });

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Šāds slug jau eksistē" : "Kļūda pievienojot kategoriju");
    } else {
      toast.success("Kategorija pievienota");
      setNewName("");
      setNewSlug("");
      setNewParent("none");
      refresh();
    }
  };

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    const { error } = await supabase.from("categories").update({ name }).eq("id", id);
    if (error) toast.error("Kļūda saglabājot");
    else { toast.success("Nosaukums mainīts"); setEditingId(null); refresh(); }
  };

  const handleDelete = async (cat: Category) => {
    const children = getChildren(allCategories, cat.id);
    const msg = children.length > 0
      ? `Dzēst "${cat.name}" un tās ${children.length} apakškategorijas?`
      : `Dzēst kategoriju "${cat.name}"?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("categories").delete().eq("id", cat.id);
    if (error) toast.error("Kļūda dzēšot: " + error.message);
    else { toast.success("Kategorija dzēsta"); refresh(); }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  if (isLoading) return <p className="text-muted-foreground text-sm text-center py-8">Ielādē kategorijas...</p>;

  return (
    <div className="space-y-4">
      {/* Add new category */}
      <Card className="border border-border">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <h3 className="text-sm font-display flex items-center gap-2">
            <Plus className="w-4 h-4" /> Jauna kategorija
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs font-body">Nosaukums</Label>
              <Input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newSlug || newSlug === generateSlug(newName)) {
                    setNewSlug(generateSlug(e.target.value));
                  }
                }}
                placeholder="Piem. Sporta"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-body">Slug</Label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="sporta"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-body">Pieder pie</Label>
              <Select value={newParent} onValueChange={setNewParent}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Galvenā kategorija —</SelectItem>
                  {topCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} className="w-full bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Pievienot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category tree */}
      <Card className="border border-border">
        <CardContent className="p-3 sm:p-4">
          <h3 className="text-sm font-display flex items-center gap-2 mb-3">
            <FolderTree className="w-4 h-4" /> Kategoriju koks
          </h3>
          <div className="space-y-1">
            {topCategories.map((cat) => {
              const children = getChildren(allCategories, cat.id);
              return (
                <div key={cat.id}>
                  <CategoryRow
                    cat={cat}
                    editing={editingId === cat.id}
                    editName={editName}
                    onEditName={setEditName}
                    onStartEdit={() => startEdit(cat)}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveEdit={() => handleRename(cat.id)}
                    onDelete={() => handleDelete(cat)}
                  />
                  {children.length > 0 && (
                    <div className="ml-5 sm:ml-8 border-l border-border pl-3 space-y-0.5">
                      {children.map((child) => (
                        <CategoryRow
                          key={child.id}
                          cat={child}
                          isChild
                          editing={editingId === child.id}
                          editName={editName}
                          onEditName={setEditName}
                          onStartEdit={() => startEdit(child)}
                          onCancelEdit={() => setEditingId(null)}
                          onSaveEdit={() => handleRename(child.id)}
                          onDelete={() => handleDelete(child)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface CategoryRowProps {
  cat: Category;
  isChild?: boolean;
  editing: boolean;
  editName: string;
  onEditName: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}

const CategoryRow = ({ cat, isChild, editing, editName, onEditName, onStartEdit, onCancelEdit, onSaveEdit, onDelete }: CategoryRowProps) => (
  <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors ${isChild ? "text-sm" : "text-sm font-medium"}`}>
    {editing ? (
      <>
        <Input
          value={editName}
          onChange={(e) => onEditName(e.target.value)}
          className="h-7 flex-1 min-w-0 text-sm"
          onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
          autoFocus
        />
        <button onClick={onSaveEdit} className="p-1 text-primary hover:text-primary/80"><Check className="w-4 h-4" /></button>
        <button onClick={onCancelEdit} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </>
    ) : (
      <>
        <span className="flex-1 truncate font-body">{cat.name}</span>
        <span className="text-[10px] text-muted-foreground font-mono">{cat.slug}</span>
        <button onClick={onStartEdit} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1 text-destructive/60 hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </>
    )}
  </div>
);
