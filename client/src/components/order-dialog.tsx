import { useState } from "react";
import { type MenuItem } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";

interface OrderDialogProps {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
}

export function OrderDialog({ item, open, onClose }: OrderDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const { dispatch } = useCart();
  const { toast } = useToast();

  const updateQuantity = (newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        menuItem: item,
        quantity,
        specialInstructions: specialInstructions.trim() || undefined,
      },
    });
    toast({
      title: "Added to cart",
      description: `${quantity}x ${item.name} added to your cart`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Cart - {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Quantity</span>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuantity(quantity - 1)}
                >
                  -
                </Button>
                <span className="w-8 text-center">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-medium">Special Instructions (Optional)</span>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests?"
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">Total:</span>
              <span className="text-lg font-semibold">
                {formatPrice(item.price * quantity)}
              </span>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={handleAddToCart}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}