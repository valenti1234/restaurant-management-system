import { Badge } from "@/components/ui/badge";
import { allergens, type Allergen } from "@shared/schema";
import { Toggle } from "@/components/ui/toggle";

interface AllergenFilterProps {
  selectedAllergens: Allergen[];
  onToggleAllergen: (allergen: Allergen) => void;
}

export function AllergenFilter({ selectedAllergens, onToggleAllergen }: AllergenFilterProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Filter by Allergens</h3>
      <div className="flex flex-wrap gap-2">
        {allergens.map((allergen) => (
          <Toggle
            key={allergen}
            pressed={selectedAllergens.includes(allergen)}
            onPressedChange={() => onToggleAllergen(allergen)}
            className="data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground"
          >
            <Badge variant="outline" className="font-normal">
              {allergen.replace('_', ' ')}
            </Badge>
          </Toggle>
        ))}
      </div>
    </div>
  );
}
