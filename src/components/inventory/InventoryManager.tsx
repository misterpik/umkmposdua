import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ArrowLeftRight,
  Package,
  Filter,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  supabase,
  ProductWithInventory,
  Category,
  Warehouse,
  StockTransferWithItems,
} from "@/lib/supabase";

interface ProductDisplay {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  location: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

interface WarehouseDisplay {
  id: string;
  name: string;
  location: string;
  products: number;
}

interface CategoryDisplay {
  id: string;
  name: string;
  productCount: number;
}

const InventoryManager = () => {
  const [activeTab, setActiveTab] = useState("products");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductDisplay[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDisplay[]>([]);
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [transfers, setTransfers] = useState<StockTransferWithItems[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProducts(),
        loadWarehouses(),
        loadCategories(),
        loadTransfers(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase.from("products").select(`
        *,
        category:categories(*),
        inventory(
          *,
          warehouse:warehouses(*)
        )
      `);

    if (error) {
      console.error("Error loading products:", error);
      return;
    }

    const productsDisplay: ProductDisplay[] = (
      data as ProductWithInventory[]
    ).map((product) => {
      const totalStock = product.inventory.reduce(
        (sum, inv) => sum + inv.stock_level,
        0,
      );
      const primaryWarehouse =
        product.inventory[0]?.warehouse?.name || "No Warehouse";

      let status: "In Stock" | "Low Stock" | "Out of Stock";
      if (totalStock === 0) {
        status = "Out of Stock";
      } else if (totalStock <= (product.inventory[0]?.reorder_point || 10)) {
        status = "Low Stock";
      } else {
        status = "In Stock";
      }

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category?.name || "Uncategorized",
        price: Number(product.price),
        stock: totalStock,
        location: primaryWarehouse,
        status,
      };
    });

    setProducts(productsDisplay);
  };

  const loadWarehouses = async () => {
    const { data: warehousesData, error: warehousesError } = await supabase
      .from("warehouses")
      .select("*");

    if (warehousesError) {
      console.error("Error loading warehouses:", warehousesError);
      return;
    }

    const { data: inventoryData, error: inventoryError } = await supabase
      .from("inventory")
      .select("warehouse_id");

    if (inventoryError) {
      console.error("Error loading inventory counts:", inventoryError);
      return;
    }

    const warehouseProductCounts = inventoryData.reduce(
      (acc, inv) => {
        acc[inv.warehouse_id] = (acc[inv.warehouse_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const warehousesDisplay: WarehouseDisplay[] = warehousesData.map(
      (warehouse) => ({
        id: warehouse.id,
        name: warehouse.name,
        location: warehouse.location,
        products: warehouseProductCounts[warehouse.id] || 0,
      }),
    );

    setWarehouses(warehousesDisplay);
  };

  const loadCategories = async () => {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("*");

    if (categoriesError) {
      console.error("Error loading categories:", categoriesError);
      return;
    }

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("category_id");

    if (productsError) {
      console.error("Error loading product counts:", productsError);
      return;
    }

    const categoryProductCounts = productsData.reduce(
      (acc, product) => {
        if (product.category_id) {
          acc[product.category_id] = (acc[product.category_id] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const categoriesDisplay: CategoryDisplay[] = categoriesData.map(
      (category) => ({
        id: category.id,
        name: category.name,
        productCount: categoryProductCounts[category.id] || 0,
      }),
    );

    setCategories(categoriesDisplay);
  };

  const loadTransfers = async () => {
    const { data, error } = await supabase
      .from("stock_transfers")
      .select(
        `
        *,
        stock_transfer_items(
          *,
          product:products(*)
        ),
        from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(*),
        to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(*),
        user:users(*)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading transfers:", error);
      return;
    }

    setTransfers(data as StockTransferWithItems[]);
  };

  // Filter products based on search and status
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "in-stock" && product.status === "In Stock") ||
      (statusFilter === "low-stock" && product.status === "Low Stock") ||
      (statusFilter === "out-of-stock" && product.status === "Out of Stock");

    return matchesSearch && matchesStatus;
  });

  // Mock data for fallback (keeping original structure)
  const mockProducts: ProductDisplay[] = [
    {
      id: "1",
      name: "Laptop",
      sku: "TECH-001",
      category: "Electronics",
      price: 999.99,
      stock: 15,
      location: "Warehouse A",
      status: "In Stock",
    },
    {
      id: "2",
      name: "Smartphone",
      sku: "TECH-002",
      category: "Electronics",
      price: 599.99,
      stock: 8,
      location: "Warehouse B",
      status: "In Stock",
    },
    {
      id: "3",
      name: "Headphones",
      sku: "TECH-003",
      category: "Electronics",
      price: 99.99,
      stock: 3,
      location: "Warehouse A",
      status: "Low Stock",
    },
    {
      id: "4",
      name: "Desk Chair",
      sku: "FURN-001",
      category: "Furniture",
      price: 199.99,
      stock: 0,
      location: "Warehouse C",
      status: "Out of Stock",
    },
    {
      id: "5",
      name: "Coffee Maker",
      sku: "APPL-001",
      category: "Appliances",
      price: 79.99,
      stock: 12,
      location: "Warehouse B",
      status: "In Stock",
    },
  ];

  const mockWarehouses: WarehouseDisplay[] = [
    { id: "1", name: "Warehouse A", location: "New York", products: 120 },
    { id: "2", name: "Warehouse B", location: "Los Angeles", products: 85 },
    { id: "3", name: "Warehouse C", location: "Chicago", products: 64 },
  ];

  const mockCategories: CategoryDisplay[] = [
    { id: "1", name: "Electronics", productCount: 45 },
    { id: "2", name: "Furniture", productCount: 28 },
    { id: "3", name: "Appliances", productCount: 17 },
    { id: "4", name: "Clothing", productCount: 36 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Stock":
        return <Badge className="bg-green-500">In Stock</Badge>;
      case "Low Stock":
        return <Badge className="bg-yellow-500">Low Stock</Badge>;
      case "Out of Stock":
        return <Badge variant="destructive">Out of Stock</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 bg-background">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </Button>
          <Button onClick={() => setProductDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="transfers">Stock Transfers</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Product Catalog</CardTitle>
              <CardDescription>
                Manage your product inventory across all warehouses.
              </CardDescription>
              <div className="flex justify-between mt-4">
                <div className="relative w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" /> Filter
                  </Button>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low-stock">Low Stock</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading products...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right">
                          ${product.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.stock}
                        </TableCell>
                        <TableCell>{product.location}</TableCell>
                        <TableCell>{getStatusBadge(product.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you sure?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the selected product from
                                    your inventory.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Management</CardTitle>
              <CardDescription>
                Manage your warehouse locations and inventory.
              </CardDescription>
              <div className="flex justify-between mt-4">
                <div className="relative w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search warehouses..."
                    className="pl-8"
                    disabled={loading}
                  />
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Warehouse
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading warehouses...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-center">Products</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouses.map((warehouse) => (
                      <TableRow key={warehouse.id}>
                        <TableCell className="font-medium">
                          {warehouse.name}
                        </TableCell>
                        <TableCell>{warehouse.location}</TableCell>
                        <TableCell className="text-center">
                          {warehouse.products}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Product Categories</CardTitle>
              <CardDescription>
                Manage your product categories and organization.
              </CardDescription>
              <div className="flex justify-between mt-4">
                <div className="relative w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search categories..."
                    className="pl-8"
                    disabled={loading}
                  />
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading categories...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Products</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell className="text-center">
                          {category.productCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Transfers Tab */}
        <TabsContent value="transfers">
          <Card>
            <CardHeader>
              <CardTitle>Stock Transfers</CardTitle>
              <CardDescription>
                Manage inventory transfers between warehouses.
              </CardDescription>
              <div className="flex justify-end mt-4">
                <Button onClick={() => setTransferDialogOpen(true)}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" /> New Transfer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading transfers...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transfer ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No stock transfers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      transfers.map((transfer) => {
                        const getStatusBadge = (status: string) => {
                          switch (status) {
                            case "completed":
                              return (
                                <Badge className="bg-green-500">
                                  Completed
                                </Badge>
                              );
                            case "in_transit":
                              return (
                                <Badge className="bg-blue-500">
                                  In Transit
                                </Badge>
                              );
                            case "pending":
                              return <Badge variant="outline">Pending</Badge>;
                            case "cancelled":
                              return (
                                <Badge variant="destructive">Cancelled</Badge>
                              );
                            default:
                              return <Badge>{status}</Badge>;
                          }
                        };

                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">
                              {transfer.transfer_number}
                            </TableCell>
                            <TableCell>
                              {new Date(
                                transfer.created_at,
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {transfer.from_warehouse?.name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {transfer.to_warehouse?.name || "Unknown"}
                            </TableCell>
                            <TableCell className="text-center">
                              {transfer.stock_transfer_items.length}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(transfer.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Enter the details for the new product. Click save when you're
              done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" placeholder="Enter product name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" placeholder="Enter SKU" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="appliances">Appliances</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Initial Stock</Label>
                <Input id="stock" type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse-a">Warehouse A</SelectItem>
                    <SelectItem value="warehouse-b">Warehouse B</SelectItem>
                    <SelectItem value="warehouse-c">Warehouse C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter product description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProductDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setProductDialogOpen(false)}>
              Save Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
            <DialogDescription>
              Transfer inventory between warehouses. Select source, destination,
              and products to transfer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Source Warehouse</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse-a">Warehouse A</SelectItem>
                    <SelectItem value="warehouse-b">Warehouse B</SelectItem>
                    <SelectItem value="warehouse-c">Warehouse C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination Warehouse</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse-a">Warehouse A</SelectItem>
                    <SelectItem value="warehouse-b">Warehouse B</SelectItem>
                    <SelectItem value="warehouse-c">Warehouse C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Products to Transfer</h3>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Product
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Laptop</TableCell>
                    <TableCell className="text-center">15</TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        defaultValue="2"
                        className="w-20 mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Headphones</TableCell>
                    <TableCell className="text-center">3</TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        defaultValue="1"
                        className="w-20 mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Transfer Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this transfer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setTransferDialogOpen(false)}>
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManager;
