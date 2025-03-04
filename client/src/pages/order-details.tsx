import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { formatPrice } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Order, OrderItem, MenuItem } from "@shared/schema";

interface OrderWithItems extends Order {
  items: (OrderItem & { menuItem: MenuItem })[];
}

export default function OrderDetails() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const orderId = parseInt(params?.id || "0");

  const { data: order, isLoading } = useQuery<OrderWithItems>({
    queryKey: [`/api/orders/${orderId}`], // Update query key to match the single order endpoint
    enabled: !!orderId && !isNaN(orderId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin/orders")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-destructive">Order Not Found</h1>
        </div>
        <Card className="p-6">
          <p className="text-muted-foreground">The requested order could not be found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin/orders")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Order #{order.id}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Order Information</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{order.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Type</span>
              <span className="font-medium capitalize">{order.orderType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer Name</span>
              <span className="font-medium">{order.customerName}</span>
            </div>
            {order.customerPhone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{order.customerPhone}</span>
              </div>
            )}
            {order.tableNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Table Number</span>
                <span className="font-medium">{order.tableNumber}</span>
              </div>
            )}
            {order.specialInstructions && (
              <div className="space-y-1">
                <span className="text-muted-foreground">Special Instructions</span>
                <p className="font-medium">{order.specialInstructions}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Order Items</h2>
          <div className="space-y-4">
            {order.items && order.items.length > 0 ? (
              order.items.map((item) => (
                <div key={item.id} className="flex items-start gap-4">
                  <img
                    src={item.menuItem.imageUrl}
                    alt={item.menuItem.name}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.menuItem.name}</span>
                      <span>{formatPrice(item.price)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Quantity: {item.quantity}
                    </div>
                    {item.specialInstructions && (
                      <p className="text-sm text-muted-foreground">
                        Note: {item.specialInstructions}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No items in this order.</p>
            )}

            <div className="pt-4 border-t">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}