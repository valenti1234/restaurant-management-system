import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Users, Square, Circle, RectangleHorizontal, Clock, User } from "lucide-react";
import type { Table, TableShape } from "@shared/schema";
import { cn } from "@/lib/utils";

const customerInfoSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  tableNumber: z.string().regex(/^\d+$/, "Table number must be a valid number"),
});

type CustomerInfo = z.infer<typeof customerInfoSchema>;

const getStatusColor = (status: string) => {
  switch (status) {
    case "occupied":
      return "border-red-500/50 bg-gradient-to-br from-red-50 to-red-100/50";
    case "reserved":
      return "border-amber-500/50 bg-gradient-to-br from-amber-50 to-amber-100/50";
    case "available":
      return "border-emerald-500/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50";
    default:
      return "border-gray-200";
  }
};

const getTableIcon = (shape: TableShape) => {
  switch (shape) {
    case "square":
      return <Square className="h-5 w-5" />;
    case "round":
      return <Circle className="h-5 w-5" />;
    case "rectangular":
      return <RectangleHorizontal className="h-5 w-5" />;
    default:
      return <Square className="h-5 w-5" />;
  }
};

export default function Home() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<CustomerInfo>({
    resolver: zodResolver(customerInfoSchema),
    defaultValues: {
      customerName: "",
      tableNumber: "",
    },
  });

  // Fetch all tables
  const { data: tables = [], isLoading: isLoadingTables } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
    select: (tables) => tables.filter(table => table.isActive),
  });

  // Create customer mutation
  const customerMutation = useMutation({
    mutationFn: async (data: CustomerInfo) => {
      const response = await apiRequest("POST", "/api/customers", {
        name: data.customerName,
        tableNumber: parseInt(data.tableNumber),
      });
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("customerInfo", JSON.stringify({
        id: data.id,
        name: data.name,
        tableNumber: data.tableNumber,
      }));
    },
  });

  // Update table status mutation
  const updateTableStatusMutation = useMutation({
    mutationFn: async ({ tableNumber, customerName }: { tableNumber: string; customerName: string }) => {
      // First, get the table ID using the table number
      const table = tables.find((t) => t.tableNumber === parseInt(tableNumber));
      
      if (!table) {
        throw new Error("Table not found");
      }

      // Then update the table status
      await apiRequest("PATCH", `/api/tables/${table.id}/status`, {
        status: "occupied",
        customerName,
      });
    },
  });

  // Check for existing customer
  const { data: existingCustomer, isLoading } = useQuery({
    queryKey: ["customerInfo"],
    queryFn: async () => {
      const storedInfo = localStorage.getItem("customerInfo");
      if (!storedInfo) return null;

      const { name, tableNumber } = JSON.parse(storedInfo);
      const response = await apiRequest(
        "GET", 
        `/api/customers/search?name=${encodeURIComponent(name)}&tableNumber=${encodeURIComponent(tableNumber)}`
      );
      if (!response.ok) return null;
      return response.json();
    },
  });

  const onSubmit = async (data: CustomerInfo) => {
    try {
      // Create/update customer record
      await customerMutation.mutateAsync(data);

      // Update table status
      await updateTableStatusMutation.mutateAsync({
        tableNumber: data.tableNumber,
        customerName: data.customerName,
      });

      toast({
        title: "Welcome!",
        description: `Table ${data.tableNumber}, ready to take your order.`,
      });

      navigate("/menu");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save customer information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTableSelect = (tableId: number) => {
    navigate(`/table/${tableId}/orders`);
  };

  if (isLoading || isLoadingTables) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (existingCustomer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Back!</CardTitle>
              <CardDescription>
                We remember you from your last visit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-lg">
                  Welcome back, {existingCustomer.name}!
                </p>
                <p className="text-muted-foreground">
                  Your previous table number: {existingCustomer.tableNumber}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem("customerInfo");
                  window.location.reload();
                }}
              >
                Not you?
              </Button>
              <Button onClick={() => navigate("/menu")}>
                Continue to Menu
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Group tables by status for better organization
  const groupedTables = tables.reduce((acc, table) => {
    const status = table.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(table);
    return acc;
  }, {} as Record<string, Table[]>);

  // Order of status display
  const statusOrder = ["occupied", "reserved", "available"];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Table Map</h1>
          <p className="text-muted-foreground mt-2">
            View and manage table orders
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {statusOrder.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                {
                  "bg-red-500": status === "occupied",
                  "bg-amber-500": status === "reserved",
                  "bg-emerald-500": status === "available",
                }
              )} />
              <span className="capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {statusOrder.map((status) => (
        groupedTables[status]?.length > 0 && (
          <div key={status} className="mb-8">
            <h2 className="text-xl font-semibold mb-4 capitalize">{status} Tables</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {groupedTables[status].map((table) => (
                <div
                  key={table.id}
                  className={cn(
                    "relative border-2 rounded-xl p-6 cursor-pointer transition-all",
                    "hover:shadow-lg hover:scale-102 hover:-translate-y-1",
                    "transform duration-200 ease-in-out",
                    getStatusColor(table.status)
                  )}
                  onClick={() => handleTableSelect(table.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-muted-foreground">
                        {getTableIcon(table.shape)}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Table {table.tableNumber}</h3>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{table.capacity} seats</span>
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium capitalize",
                      {
                        "bg-red-100 text-red-700": table.status === "occupied",
                        "bg-amber-100 text-amber-700": table.status === "reserved",
                        "bg-emerald-100 text-emerald-700": table.status === "available",
                      }
                    )}>
                      {table.status}
                    </span>
                  </div>
                  
                  {table.customerName && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Customer:</span>
                        <span className="font-medium">{table.customerName}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-black/5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTableSelect(table.id);
                      }}
                    >
                      View Orders →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {tables.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No tables available</p>
        </div>
      )}
    </div>
  );
}