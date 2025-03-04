import { useQuery } from "@tanstack/react-query";
import { Order, OrderStatus, Category } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Clock, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

const statusBadgeVariants: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  preparing: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
  ready: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  completed: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
  cancelled: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
};

interface OrderWithItems extends Order {
  items: Array<{
    id: number;
    orderId: number;
    quantity: number;
    price: number;
    specialInstructions?: string | null;
    menuItem: {
      id: number;
      name: string;
      category: Category;
      imageUrl: string;
      price: number;
    };
  }>;
}

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const [openOrders, setOpenOrders] = useState<Record<number, boolean>>({});
  const [, setLocation] = useLocation();

  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/history"],
    refetchInterval: 60000, // Refetch every minute
  });

  const toggleOrder = (orderId: number) => {
    setOpenOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  if (!user || !["manager", "chef", "kitchen_staff"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const ordersByStatus = (orders || []).reduce((acc, order) => {
    const status = order.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(order);
    return acc;
  }, {} as Record<OrderStatus, OrderWithItems[]>);

  const historyStatuses = ["completed", "cancelled"] as const;

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order History</h1>
        <Button variant="outline" onClick={() => setLocation("/admin/orders")}>
          View Active Orders
        </Button>
      </div>

      {historyStatuses.map((status) => (
        <div key={status} className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Badge className={statusBadgeVariants[status]} variant="secondary">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({ordersByStatus[status]?.length || 0} orders)
              </span>
            </h2>
          </div>

          <div className="divide-y">
            {ordersByStatus[status]?.map((order) => (
              <Collapsible
                key={order.id}
                className="px-4 py-2"
                open={openOrders[order.id]}
                onOpenChange={() => toggleOrder(order.id)}
              >
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="link"
                        className="p-0 font-medium hover:no-underline"
                        onClick={() => setLocation(`/admin/orders/${order.id}`)}
                      >
                        Order #{order.id}
                      </Button>
                      <Badge variant="outline">
                        {order.orderType === "dine_in" ? "Dine In" : "Takeaway"}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.customerName}
                      {order.tableNumber && ` • Table #${order.tableNumber}`}
                      {order.customerPhone && ` • ${order.customerPhone}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-medium">{formatPrice(order.totalAmount)}</p>
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/admin/orders/${order.id}`)}
                    >
                      View Details
                    </Button>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            openOrders[order.id] ? "transform rotate-180" : ""
                          }`}
                        />
                        <span className="sr-only">Toggle order details</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                <CollapsibleContent className="pb-4">
                  {order.items && order.items.length > 0 ? (
                    <div className="rounded-lg border mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Special Instructions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.items.map((item) => (
                            <TableRow key={`${order.id}-${item.menuItem.id}`}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.menuItem.imageUrl}
                                    alt={item.menuItem.name}
                                    className="w-12 h-12 rounded-md object-cover"
                                  />
                                  <div>
                                    <div className="font-medium">{item.menuItem.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {item.menuItem.category}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{item.quantity}x</TableCell>
                              <TableCell>{formatPrice(item.price * item.quantity)}</TableCell>
                              <TableCell>
                                {item.specialInstructions || (
                                  <span className="text-muted-foreground">None</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-4">No items in this order.</p>
                  )}
                  {order.specialInstructions && (
                    <div className="mt-4 p-4 rounded-lg border bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Special Instructions: </span>
                        {order.specialInstructions}
                      </p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}