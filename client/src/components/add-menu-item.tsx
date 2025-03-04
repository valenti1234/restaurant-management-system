import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { categories, allergens, insertMenuItemSchema, type InsertMenuItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Wand2, Image as ImageIcon, ListPlus, Calculator } from "lucide-react";

export function AddMenuItem() {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingIngredients, setIsGeneratingIngredients] = useState(false);
  const [isGeneratingNutrition, setIsGeneratingNutrition] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      category: "mains",
      allergens: [],
      imageUrl: "",
      available: true,
      ingredients: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      servingSize: "",
    },
  });

  const imageUrl = form.watch("imageUrl");

  const generateMutation = useMutation({
    mutationFn: async (foodName: string) => {
      const res = await apiRequest("POST", "/api/menu/generate", { foodName });
      return res.json();
    },
    onSuccess: (data) => {
      form.reset(data);
      setImagePreviewError(false);
      toast({
        title: "Generated",
        description: "Menu item details generated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate menu item details",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    },
  });

  const generateIngredientsMutation = useMutation({
    mutationFn: async (foodName: string) => {
      const res = await apiRequest("POST", "/api/menu/generate-ingredients", { foodName });
      return res.json();
    },
    onSuccess: (data) => {
      form.setValue("ingredients", data.ingredients);
      toast({
        title: "Generated",
        description: "Ingredients generated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate ingredients",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGeneratingIngredients(false);
    },
  });

  const generateNutritionMutation = useMutation({
    mutationFn: async (ingredients: string[]) => {
      const res = await apiRequest("POST", "/api/menu/generate-nutrition", { ingredients });
      return res.json();
    },
    onSuccess: (data) => {
      form.setValue("calories", data.calories);
      form.setValue("protein", data.protein);
      form.setValue("carbs", data.carbs);
      form.setValue("fat", data.fat);
      form.setValue("servingSize", data.servingSize);
      toast({
        title: "Generated",
        description: "Nutritional information generated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate nutritional information",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGeneratingNutrition(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertMenuItem) => {
      const res = await apiRequest("POST", "/api/menu", {
        ...data,
        price: Math.round(data.price * 100),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      setOpen(false);
      toast({
        title: "Success",
        description: "Menu item added successfully",
      });
      form.reset();
      setImagePreviewError(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add menu item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMenuItem) => {
    createMutation.mutate(data);
  };

  const handleGenerate = async () => {
    const foodName = form.getValues("name");
    if (!foodName) {
      toast({
        title: "Error",
        description: "Please enter a food name first",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    generateMutation.mutate(foodName);
  };

  const handleGenerateIngredients = async () => {
    const foodName = form.getValues("name");
    if (!foodName) {
      toast({
        title: "Error",
        description: "Please enter a food name first",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingIngredients(true);
    generateIngredientsMutation.mutate(foodName);
  };

  const handleGenerateNutrition = async () => {
    const ingredients = form.getValues("ingredients");
    if (!ingredients || ingredients.length === 0) {
      toast({
        title: "Error",
        description: "Please generate ingredients first",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingNutrition(true);
    generateNutritionMutation.mutate(ingredients);
  };

  const handleImageError = () => {
    setImagePreviewError(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Menu Item</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Menu Item</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                className="mt-8"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            </div>
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
                  <FormControl>
                    <Input {...field} onChange={(e) => {
                      setImagePreviewError(false);
                      field.onChange(e);
                    }} />
                  </FormControl>
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Menu Item"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}