import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableStatus, tableStatuses } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function TableMap() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageTables = user?.role === "manager";

  const { data: tables, isLoading } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const updateTableStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TableStatus }) => {
      await apiRequest("PATCH", `/api/tables/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      toast({
        title: "Success",
        description: "Table status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update table status",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Table Map</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables?.map((table) => (
          <div
            key={table.id}
            className="p-4 border rounded-lg bg-card text-card-foreground"
            style={{
              gridColumn: `span ${table.width}`,
              gridRow: `span ${table.height}`,
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">Table {table.tableNumber}</h3>
                <p className="text-sm text-muted-foreground">
                  Capacity: {table.capacity}
                </p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs ${
                table.status === "available"
                  ? "bg-green-100 text-green-800"
                  : table.status === "occupied"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}>
                {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
              </div>
            </div>

            {(user?.role === "manager" || user?.role === "server") && (
              <div className="space-y-2">
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={table.status}
                  onChange={(e) =>
                    updateTableStatusMutation.mutate({
                      id: table.id,
                      status: e.target.value as TableStatus,
                    })
                  }
                  disabled={updateTableStatusMutation.isPending}
                >
                  {tableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
