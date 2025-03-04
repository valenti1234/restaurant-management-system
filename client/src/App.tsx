import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Menu from "@/pages/menu";
import Manage from "@/pages/manage";
import Orders from "@/pages/orders";
import OrderHistory from "@/pages/order-history";
import AuthPage from "@/pages/auth";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CartProvider } from "@/lib/cart-context";
import { Cart } from "@/components/cart";
import { ShoppingCart } from "lucide-react";
import OrderDetails from "@/pages/order-details";
import { TablesPage } from "@/pages/tables";

function Navigation() {
  const { user, logoutMutation } = useAuth();

  return (
    <nav className="bg-primary text-primary-foreground p-4">
      <div className="container mx-auto flex justify-between items-center">
        <a href="/" className="text-xl font-bold">Restaurant Menu</a>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <div className="flex items-center space-x-4">
                <span className="text-sm hidden md:inline">
                  Welcome, {user.fullName}
                </span>
                <a href="/menu" className="hover:text-accent-foreground">
                  View Menu
                </a>
              </div>

              {["manager", "chef", "kitchen_staff", "server"].includes(user.role) && (
                <div className="flex items-center space-x-4 border-l border-primary-foreground/20 ml-4 pl-4">
                  <span className="text-sm text-primary-foreground/70 hidden md:inline">
                    Staff
                  </span>
                  {["manager", "chef"].includes(user.role) && (
                    <a href="/admin/menu" className="hover:text-accent-foreground">
                      Manage Menu
                    </a>
                  )}
                  <a href="/admin/orders" className="hover:text-accent-foreground">
                    Orders
                  </a>
                  {["manager", "server"].includes(user.role) && (
                    <a href="/admin/tables" className="hover:text-accent-foreground">
                      Tables
                    </a>
                  )}
                </div>
              )}

              <Cart>
                <Button variant="ghost" size="icon">
                  <ShoppingCart className="h-5 w-5" />
                </Button>
              </Cart>

              <Button
                variant="ghost"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                Logout
              </Button>
            </>
          ) : (
            <a href="/auth" className="hover:text-accent-foreground">Login</a>
          )}
        </div>
      </div>
    </nav>
  );
}

function AdminRoutes() {
  const { user } = useAuth();

  if (!user || !["manager", "chef", "kitchen_staff", "server"].includes(user.role)) {
    return <NotFound />;
  }

  return (
    <Switch>
      <Route path="/admin/menu" component={Manage} />
      <Route path="/admin/orders" component={Orders} />
      <Route path="/admin/order-history" component={OrderHistory} />
      <Route path="/admin/orders/:id" component={OrderDetails} />
      <Route path="/admin/tables" component={TablesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-8 px-4">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/menu" component={Menu} />
          <Route path="/admin/*" component={AdminRoutes} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <Router />
          <Toaster />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}