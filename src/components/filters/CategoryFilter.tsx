import { useTranslation } from "react-i18next";
import { CATEGORY_ICONS } from "@/components/CategoryIcons";

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

  return (
    <div className="space-y-1">
      {categories.map((cat) => {
        const Icon = CATEGORY_ICONS[cat.id] || CATEGORY_ICONS.all;
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body font-medium transition-all ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Icon size={18} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
            <span>{t(cat.key)}</span>
          </button>
        );
      })}
    </div>
  );
};
