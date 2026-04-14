import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORY_ICONS } from "@/components/CategoryIcons";
import { ChevronDown } from "lucide-react";
import { useCategories, getChildren, type Category } from "@/hooks/useCategories";

interface CategoryDef {
  id: string;
  key: string;
}

interface CategoryFilterProps {
  categories: CategoryDef[];
  selected: string;
  onChange: (id: string) => void;
}

export const CategoryFilter = ({ categories, selected, onChange }: CategoryFilterProps) => {
  const { t } = useTranslation();
  const { data: allCategories = [] } = useCategories();
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {categories.map((cat) => {
        const Icon = CATEGORY_ICONS[cat.id] || CATEGORY_ICONS.all;
        const isActive = selected === cat.id;

        // Find DB category to check for children
        const dbCat = allCategories.find((c) => c.slug === cat.id);
        const children: Category[] = dbCat ? getChildren(allCategories, dbCat.id) : [];
        const hasChildren = children.length > 0;
        const isExpanded = expandedParent === cat.id;

        // Check if a child is selected
        const childSelected = children.some((c) => selected === c.slug);

        return (
          <div key={cat.id}>
            <button
              onClick={() => {
                onChange(cat.id);
                if (hasChildren) {
                  setExpandedParent(isExpanded ? null : cat.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body font-medium transition-all ${
                isActive || childSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon size={18} className={isActive || childSelected ? "text-primary-foreground" : "text-muted-foreground"} />
              <span className="flex-1 text-left">{t(cat.key)}</span>
              {hasChildren && (
                <ChevronDown
                  size={14}
                  className={`transition-transform ${isExpanded ? "rotate-180" : ""} ${
                    isActive || childSelected ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                />
              )}
            </button>

            {/* Subcategories */}
            {hasChildren && isExpanded && (
              <div className="ml-6 mt-1 space-y-0.5">
                {children.map((child) => {
                  const isChildActive = selected === child.slug;
                  return (
                    <button
                      key={child.id}
                      onClick={() => onChange(child.slug)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body font-medium transition-all ${
                        isChildActive
                          ? "bg-primary/80 text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span>{child.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
