import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MenuItem, Allergen, categories } from "@shared/schema";
import { MenuItemCard } from "@/components/menu-item-card";
import { AllergenFilter } from "@/components/allergen-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default function Menu() {
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>([]);
  const [search, setSearch] = useState("");

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"]
  });

  const toggleAllergen = (allergen: Allergen) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const filterItems = (items: MenuItem[] = []) => {
    return items.filter(item => {
      // Only show available items
      if (!item.available) return false;
      
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const noAllergensSelected = selectedAllergens.length === 0;
      const hasNoSelectedAllergens = selectedAllergens.every(
        allergen => !item.allergens.includes(allergen)
      );
      return matchesSearch && (noAllergensSelected || hasNoSelectedAllergens);
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Input
          placeholder="Search menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <AllergenFilter
          selectedAllergens={selectedAllergens}
          onToggleAllergen={toggleAllergen}
        />
      </div>

      <Tabs defaultValue={categories[0]}>
        <TabsList>
          {categories.map(category => (
            <TabsTrigger key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterItems(menuItems).filter(item => item.category === category)
                .map(item => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
