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
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const customerInfoSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  tableNumber: z.string().regex(/^\d+$/, "Table number must be a valid number"),
});

type CustomerInfo = z.infer<typeof customerInfoSchema>;

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

  // Create customer mutation
  const customerMutation = useMutation({
    mutationFn: async (data: CustomerInfo) => {
      const response = await apiRequest("POST", "/api/customers", {
        name: data.customerName,
        tableNumber: data.tableNumber,
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
      await customerMutation.mutateAsync(data);

      toast({
        title: "Welcome!",
        description: `Table ${data.tableNumber}, ready to take your order.`,
      });

      navigate("/menu");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save customer information. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to Our Restaurant</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Please enter your details to start ordering
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>
              Enter your table number and name to proceed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="tableNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your table number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={customerMutation.isPending}
                >
                  {customerMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  View Menu
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}