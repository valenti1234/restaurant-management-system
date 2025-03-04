import { TableMap } from "@/components/table-map";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

export function TablesPage() {
  const [, setLocation] = useLocation();
  const { data: user } = useQuery<User>({ 
    queryKey: ["/api/user"],
    retry: false,
  });

  // Only managers and servers can access this page
  if (!user || !["manager", "server"].includes(user.role)) {
    setLocation("/");
    return null;
  }

  return (
    <div className="container mx-auto">
      <TableMap />
    </div>
  );
}

export default TablesPage;