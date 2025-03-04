import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MenuItem, Allergen } from "@shared/schema";
import { FaGlassCheers, FaLeaf, FaCheese, FaFish, FaBreadSlice, FaEgg } from "react-icons/fa";
import { formatPrice } from "@/lib/utils";
import { MenuItemReviews } from "./menu-item-reviews";
import { SocialShare } from "./social-share";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";

const allergenIcons: Record<Allergen, JSX.Element> = {
  dairy: <FaCheese className="h-4 w-4" />,
  eggs: <FaEgg className="h-4 w-4" />,
  fish: <FaFish className="h-4 w-4" />,
  shellfish: <FaFish className="h-4 w-4" />,
  tree_nuts: <FaLeaf className="h-4 w-4" />,
  peanuts: <FaLeaf className="h-4 w-4" />,
  wheat: <FaBreadSlice className="h-4 w-4" />,
  soy: <FaGlassCheers className="h-4 w-4" />
};

interface MenuItemDetailsProps {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
}

export function MenuItemDetails({ item, open, onClose }: MenuItemDetailsProps) {
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
    setQuantity(1);
    setSpecialInstructions("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 sticky top-0 bg-background z-10 border-b">
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-full max-h-[calc(90vh-5rem)]">
          <div className="px-6 py-4 space-y-6">
            {/* Image */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Order Form */}
            {item.available && (
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-medium">Place Order</h3>
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
            )}

            {/* Price and Description */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">{formatPrice(item.price)}</h3>
                <Badge variant={item.available ? "default" : "destructive"}>
                  {item.available ? "Available" : "Unavailable"}
                </Badge>
              </div>
              <p className="text-muted-foreground">{item.description}</p>
            </div>

            {/* Allergens */}
            {item.allergens.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Allergens</h3>
                <div className="flex flex-wrap gap-1">
                  {item.allergens.map((allergen) => (
                    <Badge key={allergen} variant="secondary" className="flex items-center gap-1">
                      {allergenIcons[allergen]}
                      {allergen.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            {item.ingredients && item.ingredients.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Ingredients</h3>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {item.ingredients.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Nutritional Information */}
            {item.servingSize && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Nutritional Information</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Serving Size: {item.servingSize}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Calories:</span> {item.calories}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Protein:</span> {item.protein}g
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Carbs:</span> {item.carbs}g
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Fat:</span> {item.fat}g
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Suggested Beverages */}
            {item.suggestedBeverages && item.suggestedBeverages.length > 0 && item.category !== 'drinks' && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Suggested Beverages</h3>
                <div className="space-y-2">
                  {item.suggestedBeverages.map((beverage, index) => (
                    <Badge key={index} variant="outline" className="mr-2">
                      <FaGlassCheers className="h-4 w-4 mr-1" />
                      {beverage}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Social Share */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Share</h3>
              <SocialShare
                title={item.name}
                description={item.description}
                imageUrl={item.imageUrl}
              />
            </div>

            {/* Reviews Section */}
            <MenuItemReviews menuItemId={item.id} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}