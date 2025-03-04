import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { categories, allergens, insertMenuItemSchema, type InsertMenuItem, type MenuItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Image as ImageIcon, RefreshCw, ListPlus, Calculator } from "lucide-react";

interface EditMenuItemProps {
  item: MenuItem;
  onClose: () => void;
}

export function EditMenuItem({ item, onClose }: EditMenuItemProps) {
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isGeneratingIngredients, setIsGeneratingIngredients] = useState(false);
  const [isGeneratingNutrition, setIsGeneratingNutrition] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: item.name,
      description: item.description,
      price: item.price / 100,
      category: item.category,
      allergens: item.allergens,
      imageUrl: item.imageUrl,
      available: item.available,
      ingredients: item.ingredients ?? [],
      // Add nutritional values
      calories: item.calories ?? 0,
      protein: item.protein ?? 0,
      carbs: item.carbs ?? 0,
      fat: item.fat ?? 0,
      servingSize: item.servingSize ?? "",
    },
  });

  const imageUrl = form.watch("imageUrl");

  const updateMutation = useMutation({
    mutationFn: async (data: InsertMenuItem) => {
      const res = await apiRequest("PATCH", `/api/menu/${item.id}`, {
        ...data,
        price: Math.round(data.price * 100),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      onClose();
      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update menu item",
        variant: "destructive",
      });
    },
  });

  const regenerateImageMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/menu/generate", {
        foodName: form.getValues("name"),
      });
      return res.json();
    },
    onSuccess: (data) => {
      form.setValue("imageUrl", data.imageUrl);
      setImagePreviewError(false);
      toast({
        title: "Success",
        description: "Image regenerated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to regenerate image",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsRegeneratingImage(false);
    },
  });

  const generateIngredientsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/menu/generate-ingredients", {
        foodName: form.getValues("name"),
      });
      return res.json();
    },
    onSuccess: (data) => {
      form.setValue("ingredients", data.ingredients);
      toast({
        title: "Success",
        description: "Ingredients regenerated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to regenerate ingredients",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGeneratingIngredients(false);
    },
  });

  const generateNutritionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/menu/generate-nutrition", {
        ingredients: form.getValues("ingredients"),
      });
      return res.json();
    },
    onSuccess: (data) => {
      form.setValue("calories", data.calories);
      form.setValue("protein", data.protein);
      form.setValue("carbs", data.carbs);
      form.setValue("fat", data.fat);
      form.setValue("servingSize", data.servingSize);
      toast({
        title: "Success",
        description: "Nutritional information regenerated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to regenerate nutritional information",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGeneratingNutrition(false);
    },
  });

  const onSubmit = (data: InsertMenuItem) => {
    updateMutation.mutate(data);
  };

  const handleImageError = () => {
    setImagePreviewError(true);
  };

  const handleRegenerateImage = () => {
    setIsRegeneratingImage(true);
    regenerateImageMutation.mutate();
  };

  const handleGenerateIngredients = () => {
    setIsGeneratingIngredients(true);
    generateIngredientsMutation.mutate();
  };

  const handleGenerateNutrition = () => {
    const ingredients = form.getValues("ingredients");
    if (!ingredients || ingredients.length === 0) {
      toast({
        title: "Error",
        description: "Please generate or enter ingredients first",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingNutrition(true);
    generateNutritionMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Menu Item</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allergens"
              render={() => (
                <FormItem>
                  <FormLabel>Allergens</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {allergens.map((allergen) => (
                      <FormField
                        key={allergen}
                        control={form.control}
                        name="allergens"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(allergen)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  const updated = checked
                                    ? [...current, allergen]
                                    : current.filter((a) => a !== allergen);
                                  field.onChange(updated);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {allergen.replace("_", " ")}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} onChange={(e) => {
                        setImagePreviewError(false);
                        field.onChange(e);
                      }} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleRegenerateImage}
                      disabled={isRegeneratingImage || updateMutation.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 ${isRegeneratingImage ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <FormMessage />
                  {imageUrl && !imagePreviewError ? (
                    <div className="mt-2 relative aspect-video bg-muted rounded-lg overflow-hidden">
                      <img
                        src={imageUrl}
                        alt="Menu item preview"
                        onError={handleImageError}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : imageUrl && imagePreviewError ? (
                    <div className="mt-2 relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Failed to load image</p>
                      </div>
                    </div>
                  ) : null}
                </FormItem>
              )}
            />
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Ingredients</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateIngredients}
                  disabled={isGeneratingIngredients}
                >
                  <ListPlus className="w-4 h-4 mr-2" />
                  {isGeneratingIngredients ? "Generating..." : "Generate Ingredients"}
                </Button>
              </div>
              <FormField
                control={form.control}
                name="ingredients"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value?.join('\n')}
                        onChange={(e) => field.onChange(e.target.value.split('\n').filter(Boolean))}
                        placeholder="Enter ingredients (one per line)"
                        className="h-32"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Nutritional Information</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateNutrition}
                  disabled={isGeneratingNutrition}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  {isGeneratingNutrition ? "Generating..." : "Generate Nutrition"}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="calories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calories</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="servingSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serving Size</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="protein"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protein (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="carbs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carbs (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fat (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Menu Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}