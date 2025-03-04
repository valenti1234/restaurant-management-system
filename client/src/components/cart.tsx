import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { orderTypes } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CartProps {
  children: React.ReactNode;
}

interface StoredCustomerInfo {
  name: string;
  tableNumber: string | number;
}

export function Cart({ children }: CartProps) {
  const [open, setOpen] = useState(false);
  const { state, dispatch } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load customer information when cart opens
  useEffect(() => {
    if (open) {
      const storedInfo = localStorage.getItem("customerInfo");
      if (storedInfo) {
        try {
          const { name, tableNumber } = JSON.parse(storedInfo) as StoredCustomerInfo;
          setCustomerName(name);
          setTableNumber(typeof tableNumber === 'string' ? tableNumber : String(tableNumber));
          setOrderType("dine_in"); // Force dine-in for stored customers
        } catch (error) {
          console.error("Error parsing stored customer info:", error);
          toast({
            title: "Error",
            description: "Failed to load customer information. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  }, [open]);

  // Add a function to store customer information
  const storeCustomerInfo = async () => {
    if (!customerName.trim() || !tableNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter both name and table number",
        variant: "destructive",
      });
      return false;
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customerName.trim(),
          tableNumber: parseInt(tableNumber),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save customer information');
      }

      const customerData = await response.json();
      localStorage.setItem('customerInfo', JSON.stringify({
        name: customerName.trim(),
        tableNumber: parseInt(tableNumber),
      }));

      return true;
    } catch (error: any) {
      console.error('Error storing customer info:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save customer information. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const totalAmount = state.items.reduce(
    (total, item) => total + item.menuItem.price * item.quantity,
    0
  );

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      try {
        const orderData = {
          orderType,
          customerName,
          customerPhone: customerPhone || undefined,
          tableNumber: orderType === "dine_in" ? parseInt(tableNumber) : undefined,
          specialInstructions: specialInstructions || undefined,
          totalAmount: Math.max(0, totalAmount),
          orderItems: state.items.map((item) => ({
            menuItemId: item.menuItem.id,
            quantity: Math.max(1, item.quantity),
            price: Math.max(0, item.menuItem.price),
            specialInstructions: item.specialInstructions,
          })),
        };

        const res = await apiRequest("POST", "/api/orders", orderData);

        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const error = await res.json();
            throw new Error(error.message || "Failed to place order");
          } else {
            throw new Error("Failed to place order. Please try again.");
          }
        }

        return res.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Failed to place order. Please try again.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setOpen(false);
      dispatch({ type: "CLEAR_CART" });
      toast({
        title: "Order placed successfully",
        description: "Your order has been received and is being prepared. We'll notify you when it's ready.",
      });
      // Don't reset customer info as it should persist
      setCustomerPhone("");
      setSpecialInstructions("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "dine_in") {
      const tableNum = parseInt(tableNumber);
      if (!tableNumber || isNaN(tableNum) || tableNum < 1) {
        toast({
          title: "Error",
          description: "Please enter a valid table number",
          variant: "destructive",
        });
        return;
      }

      // Store customer information before proceeding
      const stored = await storeCustomerInfo();
      if (!stored) {
        return;
      }
    }

    if (customerPhone && !/^\+?[\d\s-]{10,}$/.test(customerPhone.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    if (state.items.length === 0) {
      toast({
        title: "Error",
        description: "Your cart is empty",
        variant: "destructive",
      });
      return;
    }

    // Validate order items
    const invalidItems = state.items.filter(
      item => !item.menuItem.id || item.quantity < 1 || item.menuItem.price < 0
    );
    
    if (invalidItems.length > 0) {
      toast({
        title: "Error",
        description: "Some items in your cart are invalid. Please remove them and try again.",
        variant: "destructive",
      });
      return;
    }

    // Validate total amount
    if (totalAmount <= 0) {
      toast({
        title: "Error",
        description: "Order total must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    placeOrderMutation.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-10rem)]">
          {state.items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-6">
                  <div className="space-y-4">
                    {state.items.map((item) => (
                      <div key={item.menuItem.id} className="flex items-center gap-4">
                        <img
                          src={item.menuItem.imageUrl}
                          alt={item.menuItem.name}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.menuItem.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(item.menuItem.price)} × {item.quantity}
                          </p>
                          {item.specialInstructions && (
                            <p className="text-sm text-muted-foreground">
                              Note: {item.specialInstructions}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            dispatch({
                              type: "REMOVE_ITEM",
                              payload: { menuItemId: item.menuItem.id },
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Order Type</label>
                      <Select
                        value={orderType}
                        onValueChange={(value) =>
                          setOrderType(value as "dine_in" | "takeaway")
                        }
                        disabled={!!localStorage.getItem("customerInfo")} // Disable for stored customers
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {orderTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type === "dine_in" ? "Dine In" : "Takeaway"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {orderType === "dine_in" && (
                      <div>
                        <label className="text-sm font-medium">Table Number</label>
                        <Input
                          type="number"
                          min={1}
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          placeholder="Enter your table number"
                          disabled={!!localStorage.getItem("customerInfo")} // Disable for stored customers
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter your name"
                        disabled={!!localStorage.getItem("customerInfo")} // Disable for stored customers
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Phone Number (Optional)
                      </label>
                      <Input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Special Instructions (Optional)
                      </label>
                      <Textarea
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder="Any special requests for the entire order?"
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="border-t mt-6 pt-4">
                <div className="flex justify-between text-lg font-semibold mb-4">
                  <span>Total</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
                <Button
                  className="w-full"
                  disabled={isSubmitting || placeOrderMutation.isPending}
                  onClick={handleCheckout}
                >
                  {isSubmitting || placeOrderMutation.isPending
                    ? "Placing Order..."
                    : `Place Order (${formatPrice(totalAmount)})`}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}