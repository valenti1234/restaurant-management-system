import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTableSchema, tableShapes, type Table } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Plus } from "lucide-react";
import type { z } from "zod";

type TableFormData = z.infer<typeof insertTableSchema>;

export function TableMap() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
    retry: false,
  });

  // Grid size for the table map
  const gridSize = { width: 8, height: 6 };

  // Function to find the first available position in the grid
  const findFirstAvailablePosition = () => {
    const occupiedPositions = new Set(
      tables.map(table => `${table.positionX},${table.positionY}`)
    );

    for (let y = 0; y < gridSize.height; y++) {
      for (let x = 0; x < gridSize.width; x++) {
        if (!occupiedPositions.has(`${x},${y}`)) {
          return { x, y };
        }
      }
    }

    return { x: 0, y: 0 }; // Default position if no space found
  };

  // Function to find the next available table number
  const findNextAvailableTableNumber = () => {
    const existingNumbers = new Set(tables.map(table => table.tableNumber));
    let nextNumber = 1;
    while (existingNumbers.has(nextNumber)) {
      nextNumber++;
    }
    return nextNumber;
  };

  const defaultValues = {
    tableNumber: findNextAvailableTableNumber(),
    capacity: 4,
    shape: "square" as const,
    width: 1,
    height: 1,
    status: "available" as const,
    positionX: 0,
    positionY: 0,
  };

  const form = useForm<TableFormData>({
    resolver: zodResolver(insertTableSchema),
    defaultValues,
  });

  const createTableMutation = useMutation({
    mutationFn: async (data: TableFormData) => {
      try {
        const position = findFirstAvailablePosition();
        const tableData = {
          ...data,
          positionX: position.x,
          positionY: position.y,
          isActive: true,
        };

        const response = await apiRequest("POST", "/api/tables", tableData);
        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.error === "duplicate_table_number") {
            form.setError("tableNumber", {
              type: "manual",
              message: errorData.message || "This table number already exists"
            });
            throw new Error(errorData.message);
          }
          throw new Error("Failed to create table");
        }
        return await response.json();
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setIsAddDialogOpen(false);
      form.reset({
        ...defaultValues,
        tableNumber: findNextAvailableTableNumber(),
      });
      toast({
        title: "Success",
        description: "Table created successfully",
      });
    },
    onError: (error: any) => {
      // Only show toast for non-validation errors
      if (!error.message?.includes("already exists")) {
        toast({
          title: "Error",
          description: error.message || "Failed to create table",
          variant: "destructive",
        });
        setIsAddDialogOpen(false);
      }
    },
  });

  const onSubmit = async (data: TableFormData) => {
    if (tables.length >= gridSize.width * gridSize.height) {
      toast({
        title: "Error",
        description: "No available space for new tables",
        variant: "destructive",
      });
      return;
    }
    await createTableMutation.mutateAsync(data);
  };

  const resetForm = () => {
    form.reset({
      ...defaultValues,
      tableNumber: findNextAvailableTableNumber(),
    });
    form.clearErrors();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Table Map</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Table</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="tableNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table Number</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shape"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shape</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select table shape" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tableShapes.map((shape) => (
                            <SelectItem key={shape} value={shape}>
                              {shape.charAt(0).toUpperCase() + shape.slice(1)}
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
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Width</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="2" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="2" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createTableMutation.isPending}
                >
                  {createTableMutation.isPending ? "Adding..." : "Add Table"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div
        className="border rounded-lg p-6 bg-gray-50"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridSize.width}, minmax(150px, 1fr))`,
          gridTemplateRows: `repeat(${gridSize.height}, 120px)`,
          gap: "1.5rem",
          minHeight: "600px",
        }}
      >
        {tables.map((table: Table) => (
          <div
            key={table.id}
            className={`relative border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 ${
              table.status === 'occupied' ? 'border-red-400 bg-red-50' :
              table.status === 'reserved' ? 'border-yellow-400 bg-yellow-50' :
              'border-green-400 bg-green-50'
            }`}
            style={{
              gridColumn: `${table.positionX + 1} / span ${table.width}`,
              gridRow: `${table.positionY + 1} / span ${table.height}`,
            }}
          >
            <div className="absolute top-2 right-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this table?")) {
                    deleteTableMutation.mutate(table.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
              </Button>
            </div>
            <div className="mt-2 text-center">
              <div className="text-lg font-semibold">Table {table.tableNumber}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Capacity: {table.capacity}
              </div>
              <div className={`text-sm mt-1 font-medium ${
                table.status === 'occupied' ? 'text-red-600' :
                table.status === 'reserved' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}