import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Allergen, MenuItem } from "@shared/schema";
import { FaGlassCheers, FaLeaf, FaCheese, FaFish, FaBreadSlice, FaEgg } from "react-icons/fa";
import { formatPrice } from "@/lib/utils";
import { ContaminationWarning } from "./contamination-warning";
import { MenuItemDetails } from "./menu-item-details";
import { MenuItemCustomization } from "./menu-item-customization";
import { useState } from "react";

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

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <MenuItemCustomization menuItem={item}>
        <Card 
          className="h-full cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setShowDetails(true)}
        >
          <CardHeader className="p-4">
            <img 
              src={item.imageUrl} 
              alt={item.name}
              className="w-full h-32 object-cover rounded-md mb-2"
            />
            <CardTitle className="flex justify-between items-center text-lg">
              <span>{item.name}</span>
              <span className="text-base font-normal">{formatPrice(item.price)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{item.description}</p>
            <div className="flex flex-wrap gap-1">
              {item.allergens.map((allergen) => (
                <Badge key={allergen} variant="secondary" className="flex items-center gap-1 text-xs py-0">
                  {allergenIcons[allergen]}
                  {allergen.replace('_', ' ')}
                </Badge>
              ))}
            </div>
            {item.allergens.length > 0 && (
              <ContaminationWarning
                menuItemId={item.id}
                allergens={item.allergens}
              />
            )}
          </CardContent>
        </Card>
      </MenuItemCustomization>

      <MenuItemDetails 
        item={item}
        open={showDetails}
        onClose={() => setShowDetails(false)}
      />
    </>
  );
}