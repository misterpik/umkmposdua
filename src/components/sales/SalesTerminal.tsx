import React, { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Printer,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Product as ProductType, Inserts } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product extends ProductType {
  category: string;
  stock: number;
  image_url?: string;
}

interface CartItem extends Product {
  quantity: number;
}

const SalesTerminal = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  // Fetch products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);

        // Get current user
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser({ id: session.user.id });
        }

        // Fetch products with their categories and inventory
        const { data: productsData, error: productsError } =
          await supabase.from("products").select(`
            *,
            category:category_id(name),
            inventory(*)
          `);

        if (productsError) throw productsError;

        // Transform data to match our Product interface
        const formattedProducts: Product[] = productsData.map(
          (product: any) => ({
            ...product,
            category: product.category?.name || "Uncategorized",
            stock: product.inventory.reduce(
              (total: number, inv: any) => total + inv.stock_level,
              0,
            ),
          }),
        );

        setProducts(formattedProducts);

        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(formattedProducts.map((p) => p.category)),
        );
        setCategories(uniqueCategories);
      } catch (err: any) {
        console.error("Error fetching products:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on search query and selected category
  const filteredProducts = products.filter(
    (product) =>
      (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.barcode && product.barcode.includes(searchQuery))) &&
      (selectedCategory === "all" ||
        product.category.toLowerCase() === selectedCategory.toLowerCase()),
  );

  // Add product to cart
  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  // Update item quantity in cart
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );
  };

  // Remove item from cart
  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  // Calculate cart total
  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  // Handle payment process
  const processPayment = async () => {
    try {
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Calculate totals
      const subtotal = cartTotal;
      const taxAmount = cartTotal * 0.08;
      const totalAmount = subtotal + taxAmount;

      // Generate transaction number
      const transactionNumber = `TX-${Date.now().toString().slice(-6)}`;

      // Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          transaction_number: transactionNumber,
          user_id: currentUser.id,
          payment_method: paymentMethod,
          status: "completed",
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          customer_name: "Walk-in Customer", // Could be customized in a real app
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create transaction items
      const transactionItems = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(transactionItems);

      if (itemsError) throw itemsError;

      // Update inventory levels
      for (const item of cart) {
        // Get all inventory records for this product
        const { data: inventoryItems } = await supabase
          .from("inventory")
          .select("*")
          .eq("product_id", item.id)
          .order("stock_level", { ascending: false });

        if (!inventoryItems || inventoryItems.length === 0) continue;

        let remainingQuantity = item.quantity;

        // Deduct from inventory, starting with locations that have the most stock
        for (const invItem of inventoryItems) {
          if (remainingQuantity <= 0) break;

          const deduction = Math.min(invItem.stock_level, remainingQuantity);
          remainingQuantity -= deduction;

          // Update inventory record
          await supabase
            .from("inventory")
            .update({ stock_level: invItem.stock_level - deduction })
            .eq("id", invItem.id);
        }
      }

      setPaymentDialogOpen(false);
      setReceiptDialogOpen(true);
    } catch (err: any) {
      console.error("Error processing payment:", err);
      alert(`Payment processing error: ${err.message}`);
    }
  };

  // Complete transaction and clear cart
  const completeTransaction = () => {
    setReceiptDialogOpen(false);
    setCart([]);
    // Transaction is already saved to the database in processPayment
  };

  return (
    <div className="flex h-full bg-background">
      {/* Product Search and Display */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Sales Terminal</h1>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading products...</span>
          </div>
        ) : error ? (
          <div className="p-4 border border-red-300 bg-red-50 text-red-800 rounded-md">
            {error}
          </div>
        ) : (
          <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Products</TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger key={category} value={category.toLowerCase()}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-100">
                          <ShoppingCart className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          {product.name}
                        </CardTitle>
                        <Badge variant="outline">{product.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 pb-2">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-lg">
                          ${product.price.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Stock: {product.stock}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-2">
                      <Button
                        onClick={() => addToCart(product)}
                        className="w-full"
                        disabled={product.stock <= 0}
                      >
                        Add to Cart
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Category-specific tabs */}
            {categories.map((category) => (
              <TabsContent
                key={category}
                value={category.toLowerCase()}
                className="mt-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      <div className="aspect-video w-full overflow-hidden bg-muted">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-100">
                            <ShoppingCart className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">
                            {product.name}
                          </CardTitle>
                          <Badge variant="outline">{product.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 pb-2">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-lg">
                            ${product.price.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Stock: {product.stock}
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-2">
                        <Button
                          onClick={() => addToCart(product)}
                          className="w-full"
                          disabled={product.stock <= 0}
                        >
                          Add to Cart
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Shopping Cart */}
      <div className="w-96 border-l bg-card">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Cart
            </h2>
            <Badge variant="secondary">{cart.length} items</Badge>
          </div>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
              <p>Your cart is empty</p>
              <p className="text-sm">Add products to get started</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center py-3 border-b last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${item.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t mt-auto">
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-4">
              <span>Tax (8%)</span>
              <span>${(cartTotal * 0.08).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold mb-6">
              <span>Total</span>
              <span>${(cartTotal * 1.08).toFixed(2)}</span>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0}
              onClick={() => setPaymentDialogOpen(true)}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Checkout
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Select Payment Method</p>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile">Mobile Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "card" && (
              <div className="space-y-4">
                <Input placeholder="Card Number" />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="MM/YY" />
                  <Input placeholder="CVC" />
                </div>
                <Input placeholder="Cardholder Name" />
              </div>
            )}

            {paymentMethod === "cash" && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Due:</span>
                  <span className="font-bold">
                    ${(cartTotal * 1.08).toFixed(2)}
                  </span>
                </div>
                <Input placeholder="Amount Received" type="number" />
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span>$0.00</span>
                </div>
              </div>
            )}

            {paymentMethod === "mobile" && (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="bg-gray-200 p-4 rounded-lg mb-4">
                  {/* This would be a QR code in a real app */}
                  <div className="w-48 h-48 bg-white border-2 border-gray-300 flex items-center justify-center">
                    <p className="text-center text-sm text-gray-500">
                      QR Code for Payment
                    </p>
                  </div>
                </div>
                <p className="text-sm text-center">
                  Scan with your mobile payment app
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={processPayment}>
              <CreditCard className="mr-2 h-4 w-4" />
              Process Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center mb-4">
              <h3 className="font-bold text-lg">POS System Store</h3>
              <p className="text-sm text-muted-foreground">
                123 Main Street, City
              </p>
              <p className="text-sm text-muted-foreground">
                Tel: (123) 456-7890
              </p>
            </div>

            <Separator className="my-4" />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      ${item.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(item.price * item.quantity).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (8%)</span>
                <span>${(cartTotal * 0.08).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${(cartTotal * 1.08).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment Method</span>
                <span>
                  {paymentMethod === "card"
                    ? "Credit/Debit Card"
                    : paymentMethod === "cash"
                      ? "Cash"
                      : "Mobile Payment"}
                </span>
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="text-sm">Thank you for your purchase!</p>
              <p className="text-xs text-muted-foreground">
                Transaction #: {Math.floor(Math.random() * 1000000)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setReceiptDialogOpen(false)}
            >
              Close
            </Button>
            <Button onClick={completeTransaction}>
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesTerminal;
