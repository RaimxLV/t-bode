import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "floating";
}

export const WishlistButton = ({
  productId,
  className,
  size = "md",
  variant = "floating",
}: WishlistButtonProps) => {
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const active = isInWishlist(productId);

  const sizeMap = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };
  const iconSize = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info(t("wishlist.loginRequired", "Lai saglabātu, ielogojies"));
      navigate("/auth");
      return;
    }
    const added = await toggleWishlist(productId);
    toast.success(added ? t("wishlist.added", "Pievienots vēlmju sarakstam") : t("wishlist.removed", "Noņemts no vēlmju saraksta"));
  };

  const baseClass = variant === "floating"
    ? "rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:scale-110 active:scale-95"
    : "rounded-md hover:bg-muted";

  return (
    <button
      onClick={handleClick}
      aria-label={active ? t("wishlist.remove", "Noņemt no vēlmju saraksta") : t("wishlist.add", "Pievienot vēlmju sarakstam")}
      className={cn(
        "flex items-center justify-center transition-all",
        sizeMap[size],
        baseClass,
        className,
      )}
    >
      <Heart
        className={cn(iconSize[size], "transition-colors", active ? "fill-red-500 text-red-500" : "text-foreground")}
      />
    </button>
  );
};
