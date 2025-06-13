import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  BarChart3,
  Box,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User, InventoryAlert as InventoryAlertType } from "@/lib/supabase";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "cashier" | "inventory";
  avatarUrl?: string;
}

interface SalesMetric {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

interface InventoryAlert {
  id: string;
  product: string;
  level: number;
  threshold: number;
  status: "critical" | "warning" | "normal";
}

interface RecentTransaction {
  id: string;
  customer: string;
  amount: number;
  items: number;
  date: string;
  status: "completed" | "pending" | "failed";
}

const Home = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<SalesMetric[]>([
    {
      title: "Total Sales",
      value: "$12,345",
      change: 12.5,
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Transactions",
      value: "432",
      change: 4.2,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      title: "Average Order",
      value: "$28.57",
      change: -2.3,
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      title: "Active Users",
      value: "24",
      change: 8.1,
      icon: <Users className="h-4 w-4" />,
    },
  ]);

  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([
    {
      id: "1",
      product: "Organic Coffee Beans",
      level: 5,
      threshold: 20,
      status: "critical",
    },
    {
      id: "2",
      product: "Ceramic Mugs",
      level: 12,
      threshold: 25,
      status: "warning",
    },
    {
      id: "3",
      product: "Paper Cups",
      level: 150,
      threshold: 200,
      status: "warning",
    },
    {
      id: "4",
      product: "Chocolate Syrup",
      level: 8,
      threshold: 15,
      status: "warning",
    },
  ]);

  const [recentTransactions, setRecentTransactions] = useState<
    RecentTransaction[]
  >([
    {
      id: "TX-1234",
      customer: "John Smith",
      amount: 42.5,
      items: 3,
      date: "2023-06-15 14:30",
      status: "completed",
    },
    {
      id: "TX-1233",
      customer: "Sarah Johnson",
      amount: 18.99,
      items: 1,
      date: "2023-06-15 13:45",
      status: "completed",
    },
    {
      id: "TX-1232",
      customer: "Michael Brown",
      amount: 67.25,
      items: 5,
      date: "2023-06-15 12:20",
      status: "completed",
    },
    {
      id: "TX-1231",
      customer: "Emily Davis",
      amount: 24.75,
      items: 2,
      date: "2023-06-15 11:10",
      status: "completed",
    },
  ]);

  // Check authentication with Supabase
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!session) {
          setIsAuthenticated(false);
          return;
        }

        // Get user profile with role information
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (userError) {
          throw userError;
        }

        setIsAuthenticated(true);
        setCurrentUser(userData);

        // Set up auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === "SIGNED_OUT") {
              setIsAuthenticated(false);
              setCurrentUser(null);
              navigate("/login");
            }
          },
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err) {
        console.error("Auth error:", err);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Helper function to check if user has access to a feature
  const hasAccess = (allowedRoles: string[]) => {
    return currentUser && allowedRoles.includes(currentUser.role);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>POS System Login</CardTitle>
            <CardDescription>
              Sign in to access the point of sale system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* This would be replaced with the actual LoginForm component */}
            <div className="flex justify-center">
              <Button onClick={() => navigate("/login")}>Go to Login</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">POS Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
                <AvatarFallback>AU</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {currentUser?.role}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                setIsAuthenticated(false);
                navigate("/login");
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container px-4 py-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {hasAccess(["admin", "cashier"]) && (
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sales Terminal</CardTitle>
                <CardDescription>Process new transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate("/sales")}>
                  <ShoppingCart className="mr-2 h-4 w-4" /> Open Terminal
                </Button>
              </CardContent>
            </Card>
          )}

          {hasAccess(["admin", "inventory"]) && (
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Inventory</CardTitle>
                <CardDescription>Manage products and stock</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => navigate("/inventory")}
                >
                  <Package className="mr-2 h-4 w-4" /> View Inventory
                </Button>
              </CardContent>
            </Card>
          )}

          {hasAccess(["admin", "inventory"]) && (
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Warehouse</CardTitle>
                <CardDescription>
                  Manage locations and transfers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => navigate("/warehouse")}
                >
                  <Box className="mr-2 h-4 w-4" /> Warehouse Controls
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sales Metrics */}
          <div className="col-span-1 md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" /> Sales Metrics
                </CardTitle>
                <CardDescription>Today's performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {salesMetrics.map((metric, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {metric.title}
                          </span>
                          <span className="bg-primary/10 p-1 rounded-full">
                            {metric.icon}
                          </span>
                        </div>
                        <div className="mt-2">
                          <p className="text-2xl font-bold">{metric.value}</p>
                          <div className="flex items-center mt-1">
                            <Badge
                              variant={
                                metric.change >= 0 ? "default" : "destructive"
                              }
                              className="text-xs"
                            >
                              {metric.change >= 0 ? "+" : ""}
                              {metric.change}%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest sales activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <div>
                        <p className="font-medium">{transaction.customer}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span>{transaction.id}</span>
                          <span className="mx-1">•</span>
                          <span>{transaction.items} items</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${transaction.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/transactions")}
                >
                  View All Transactions
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Inventory Alerts */}
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5" /> Inventory Alerts
                </CardTitle>
                <CardDescription>Items requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inventoryAlerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      variant={
                        alert.status === "critical" ? "destructive" : "default"
                      }
                      className="bg-card"
                    >
                      <AlertTitle className="text-sm font-medium">
                        {alert.product}
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Stock Level: {alert.level}</span>
                            <span>Threshold: {alert.threshold}</span>
                          </div>
                          <Progress
                            value={(alert.level / alert.threshold) * 100}
                            className="h-1"
                          />
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                {hasAccess(["admin", "inventory"]) && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/inventory")}
                  >
                    Manage Inventory
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Role-based Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Actions available for your role: {currentUser?.role}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Admin Actions */}
                  {hasAccess(["admin"]) && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Admin Actions
                      </h4>
                      <Button
                        className="w-full"
                        onClick={() => navigate("/users")}
                      >
                        Manage Users
                      </Button>
                      <Button
                        className="w-full"
                        onClick={() => navigate("/settings")}
                      >
                        System Settings
                      </Button>
                    </div>
                  )}

                  {/* Cashier Actions */}
                  {hasAccess(["admin", "cashier"]) && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Sales Actions
                      </h4>
                      <Button
                        className="w-full"
                        onClick={() => navigate("/sales")}
                      >
                        New Transaction
                      </Button>
                    </div>
                  )}

                  {/* Inventory Actions */}
                  {hasAccess(["admin", "inventory"]) && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Inventory Actions
                      </h4>
                      <Button
                        className="w-full"
                        onClick={() => navigate("/inventory")}
                      >
                        Manage Inventory
                      </Button>
                      <Button
                        className="w-full"
                        onClick={() => navigate("/warehouse")}
                      >
                        Warehouse Controls
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
