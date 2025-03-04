import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { MenuItem } from "@shared/schema";
import { useCart } from "@/lib/cart-context";

interface MenuItemCustomizationProps {
  menuItem: MenuItem;
  children: React.ReactNode;
}

export function MenuItemCustomization({
  menuItem,
  children,
}: MenuItemCustomizationProps) {
  const { addToCart, removeFromCart, getItemQuantity } = useCart();
  const quantity = getItemQuantity(menuItem.id);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="p-2 flex items-center gap-2 bg-background border"
        >
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => removeFromCart(menuItem.id)}
            disabled={quantity === 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-4 text-center">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => addToCart(menuItem)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
