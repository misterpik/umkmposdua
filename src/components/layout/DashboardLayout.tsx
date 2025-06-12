import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: "admin" | "cashier" | "inventory";
  userName?: string;
}

const DashboardLayout = ({
  children,
  userRole = "admin",
  userName = "User",
}: DashboardLayoutProps) => {
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
      roles: ["admin", "cashier", "inventory"],
    },
    {
      title: "Sales Terminal",
      href: "/sales",
      icon: <ShoppingCart className="h-5 w-5" />,
      roles: ["admin", "cashier"],
    },
    {
      title: "Inventory",
      href: "/inventory",
      icon: <Package className="h-5 w-5" />,
      roles: ["admin", "inventory"],
    },
    {
      title: "Warehouse",
      href: "/warehouse",
      icon: <Warehouse className="h-5 w-5" />,
      roles: ["admin", "inventory"],
    },
    {
      title: "Users",
      href: "/users",
      icon: <Users className="h-5 w-5" />,
      roles: ["admin"],
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
      roles: ["admin"],
    },
  ];

  const handleLogout = () => {
    // Handle logout logic here
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card text-card-foreground">
        <div className="p-6">
          <h2 className="text-2xl font-bold">POS System</h2>
        </div>
        <nav className="space-y-1 px-3">
          {navItems
            .filter((item) => item.roles.includes(userRole))
            .map((item, index) => (
              <Link
                key={index}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                  "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span className="mr-3">{item.icon}</span>
                {item.title}
              </Link>
            ))}
          <Button
            variant="ghost"
            className="w-full justify-start mt-4 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b h-16 flex items-center justify-between px-6">
          <div className="flex items-center w-1/3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 w-full" />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">
                3
              </Badge>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user123" />
                    <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center">
                    <span className="mr-2">{userName}</span>
                    <Badge variant="outline" className="capitalize">
                      {userRole}
                    </Badge>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-500"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6 bg-muted/10">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
