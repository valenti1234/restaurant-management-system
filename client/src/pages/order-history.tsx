import { useQuery } from "@tanstack/react-query";
import { Order, OrderStatus, Category } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Clock, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { formatDistanceToNow, format, startOfDay, endOfDay, subDays } from "date-fns";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "all">("7days");
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

  const filterOrdersByDate = (orders: OrderWithItems[], days: number | null = null) => {
    if (!days) return orders;
    const cutoffDate = subDays(new Date(), days);
    return orders.filter(order => new Date(order.createdAt) >= cutoffDate);
  };

  const filteredOrders = filterOrdersByDate(orders || [], 
    timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : null
  );

  const ordersByStatus = filteredOrders.reduce((acc, order) => {
    const status = order.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(order);
    return acc;
  }, {} as Record<OrderStatus, OrderWithItems[]>);

  // Calculate summary statistics
  const summary = {
    totalOrders: filteredOrders.length,
    totalRevenue: filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    averageOrderValue: filteredOrders.length > 0
      ? filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0) / filteredOrders.length
      : 0,
    completedOrders: filteredOrders.filter(order => order.status === "completed").length,
    cancelledOrders: filteredOrders.filter(order => order.status === "cancelled").length,
  };

  // Prepare chart data
  const chartData = filteredOrders.reduce((acc, order) => {
    const date = format(new Date(order.createdAt), "MMM d");
    if (!acc[date]) {
      acc[date] = {
        date,
        revenue: 0,
        orders: 0,
      };
    }
    acc[date].revenue += order.totalAmount;
    acc[date].orders += 1;
    return acc;
  }, {} as Record<string, { date: string; revenue: number; orders: number }>);

  const chartDataArray = Object.values(chartData);

  const historyStatuses = ["completed", "cancelled"] as const;

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order History</h1>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(value: "7days" | "30days" | "all") => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setLocation("/admin/orders")}>
            View Active Orders
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {summary.completedOrders} completed, {summary.cancelledOrders} cancelled
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(summary.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(summary.averageOrderValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalOrders > 0
                ? Math.round((summary.completedOrders / summary.totalOrders) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Daily revenue and order count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataArray}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue" />
                <Bar yAxisId="right" dataKey="orders" fill="#82ca9d" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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