import { useQuery, useMutation } from "@tanstack/react-query";
import { Order, OrderStatus, orderStatuses, OrderPriority, orderPriorities } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, Volume2, VolumeX, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, addMinutes } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";
import { soundManager } from "@/lib/sound";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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
      category: string;
      imageUrl: string;
      price: number;
    };
  }>;
}

const statusBadgeVariants: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  preparing: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
  ready: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  completed: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
  cancelled: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
};

const priorityBadgeVariants: Record<OrderPriority, string> = {
  low: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
  medium: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  high: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
  urgent: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
};

export default function KitchenDisplay() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(soundManager.isMuted());
  const [sortBy, setSortBy] = useState<"priority" | "time">("priority");

  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 5000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: OrderStatus }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update order status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ orderId, priority }: { orderId: number; priority: OrderPriority }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/priority`, { priority });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update order priority");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Success",
        description: "Order priority updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order priority",
        variant: "destructive",
      });
    },
  });

  const updateEstimatedTimeMutation = useMutation({
    mutationFn: async ({ orderId, minutes }: { orderId: number; minutes: number }) => {
      const estimatedReadyTime = addMinutes(new Date(), minutes).toISOString();
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/estimated-time`, { estimatedReadyTime });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update estimated time");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Success",
        description: "Estimated preparation time updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update estimated time",
        variant: "destructive",
      });
    },
  });

  // Play sound for new orders
  useEffect(() => {
    if (orders?.some(order => order.status === "pending")) {
      soundManager.play("newOrder");
    }
  }, [orders]);

  const toggleMute = () => {
    const newMutedState = soundManager.toggleMute();
    setIsMuted(newMutedState);
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

  const activeOrders = orders?.filter(
    order => ["pending", "confirmed", "preparing"].includes(order.status)
  ) || [];

  const sortedOrders = [...activeOrders].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority as OrderPriority] - priorityOrder[b.priority as OrderPriority];
      return priorityDiff !== 0 ? priorityDiff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
  });

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const statusFlow: OrderStatus[] = ["pending", "confirmed", "preparing", "ready"];
    const currentIndex = statusFlow.indexOf(currentStatus);
    return currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Kitchen Display</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="ml-4"
            title={isMuted ? "Unmute notifications" : "Mute notifications"}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as "priority" | "time")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Sort by Priority</SelectItem>
              <SelectItem value="time">Sort by Time</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className={statusBadgeVariants.pending}>
            Pending: {activeOrders.filter(order => order.status === "pending").length}
          </Badge>
          <Badge variant="outline" className={statusBadgeVariants.confirmed}>
            Confirmed: {activeOrders.filter(order => order.status === "confirmed").length}
          </Badge>
          <Badge variant="outline" className={statusBadgeVariants.preparing}>
            Preparing: {activeOrders.filter(order => order.status === "preparing").length}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedOrders.map((order) => {
          const nextStatus = getNextStatus(order.status);
          const timeElapsed = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true });
          const isOverdue = order.estimatedReadyTime && new Date(order.estimatedReadyTime) < new Date();

          return (
            <Card key={order.id} className={`p-6 space-y-4 ${order.priority === "urgent" ? "border-red-500" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Order #{order.id}</h3>
                  <p className="text-sm text-muted-foreground">{order.orderType}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge variant="outline" className={statusBadgeVariants[order.status]}>
                    {order.status}
                  </Badge>
                  <Badge variant="outline" className={priorityBadgeVariants[order.priority as OrderPriority]}>
                    {order.priority}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-16 h-16">
                      <img
                        src={item.menuItem.imageUrl}
                        alt={item.menuItem.name}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {item.quantity}x {item.menuItem.name}
                      </p>
                      {item.specialInstructions && (
                        <p className="text-sm text-muted-foreground">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {timeElapsed}
                  </div>
                  {isOverdue && (
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">Overdue</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    defaultValue={order.priority}
                    onValueChange={(value) =>
                      updatePriorityMutation.mutate({ orderId: order.id, priority: value as OrderPriority })
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {orderPriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Minutes"
                      className="w-20"
                      min={1}
                      defaultValue={15}
                      onChange={(e) =>
                        updateEstimatedTimeMutation.mutate({
                          orderId: order.id,
                          minutes: parseInt(e.target.value) || 15,
                        })
                      }
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>

                  {nextStatus && (
                    <Button
                      onClick={() =>
                        updateStatusMutation.mutate({ orderId: order.id, status: nextStatus })
                      }
                      disabled={updateStatusMutation.isPending}
                      className="ml-auto"
                    >
                      Mark as {nextStatus}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 