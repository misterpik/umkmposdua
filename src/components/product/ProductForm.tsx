import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Product, Category, Warehouse } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  price: z.coerce
    .number()
    .min(0.01, { message: "Price must be greater than 0" }),
  sku: z.string().min(1, { message: "SKU is required" }),
  barcode: z.string().optional(),
  category_id: z.string().min(1, { message: "Category is required" }),
  image_url: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  productId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({
  productId,
  onSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventoryData, setInventoryData] = useState<
    { warehouse_id: string; stock_level: number; reorder_point: number }[]
  >([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      sku: "",
      barcode: "",
      category_id: "",
      image_url: "",
    },
  });

  // Fetch categories and warehouses
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData);

        // Fetch warehouses
        const { data: warehousesData, error: warehousesError } = await supabase
          .from("warehouses")
          .select("*")
          .order("name");

        if (warehousesError) throw warehousesError;
        setWarehouses(warehousesData);

        // Initialize inventory data for each warehouse
        if (warehousesData) {
          setInventoryData(
            warehousesData.map((warehouse) => ({
              warehouse_id: warehouse.id,
              stock_level: 0,
              reorder_point: 10,
            })),
          );
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message);
      }
    };

    fetchData();
  }, []);

  // Fetch product data if editing
  useEffect(() => {
    if (productId) {
      const fetchProduct = async () => {
        setIsFetching(true);
        try {
          // Fetch product
          const { data: product, error: productError } = await supabase
            .from("products")
            .select("*")
            .eq("id", productId)
            .single();

          if (productError) throw productError;

          // Set form values
          reset({
            name: product.name,
            description: product.description || "",
            price: product.price,
            sku: product.sku,
            barcode: product.barcode || "",
            category_id: product.category_id || "",
            image_url: product.image_url || "",
          });

          // Fetch inventory data
          const { data: inventoryItems, error: inventoryError } = await supabase
            .from("inventory")
            .select("*")
            .eq("product_id", productId);

          if (inventoryError) throw inventoryError;

          if (inventoryItems && inventoryItems.length > 0) {
            // Map inventory items to warehouses
            const updatedInventoryData = warehouses.map((warehouse) => {
              const inventoryItem = inventoryItems.find(
                (item) => item.warehouse_id === warehouse.id,
              );
              return {
                warehouse_id: warehouse.id,
                stock_level: inventoryItem ? inventoryItem.stock_level : 0,
                reorder_point: inventoryItem ? inventoryItem.reorder_point : 10,
              };
            });
            setInventoryData(updatedInventoryData);
          }
        } catch (err: any) {
          console.error("Error fetching product:", err);
          setError(err.message);
        } finally {
          setIsFetching(false);
        }
      };

      fetchProduct();
    }
  }, [productId, reset, warehouses]);

  const updateInventoryData = (
    warehouseId: string,
    field: "stock_level" | "reorder_point",
    value: number,
  ) => {
    setInventoryData((prev) =>
      prev.map((item) =>
        item.warehouse_id === warehouseId ? { ...item, [field]: value } : item,
      ),
    );
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      let currentProductId = productId;

      if (currentProductId) {
        // Update existing product
        const { data: updatedProduct, error: updateError } = await supabase
          .from("products")
          .update(data)
          .eq("id", currentProductId)
          .select()
          .single();

        if (updateError) throw updateError;
        currentProductId = updatedProduct.id;
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from("products")
          .insert(data)
          .select()
          .single();

        if (insertError) throw insertError;
        currentProductId = newProduct.id;
      }

      // Update inventory for each warehouse
      for (const item of inventoryData) {
        // Check if inventory record exists
        const { data: existingInventory } = await supabase
          .from("inventory")
          .select("id")
          .eq("product_id", currentProductId)
          .eq("warehouse_id", item.warehouse_id)
          .maybeSingle();

        if (existingInventory) {
          // Update existing inventory
          await supabase
            .from("inventory")
            .update({
              stock_level: item.stock_level,
              reorder_point: item.reorder_point,
            })
            .eq("id", existingInventory.id);
        } else {
          // Create new inventory record
          await supabase.from("inventory").insert({
            product_id: currentProductId,
            warehouse_id: item.warehouse_id,
            stock_level: item.stock_level,
            reorder_point: item.reorder_point,
          });
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error saving product:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading product data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="text-2xl font-bold mb-6">
        {productId ? "Edit Product" : "Add New Product"}
      </h2>

      {error && (
        <div className="p-4 mb-6 border border-red-300 bg-red-50 text-red-800 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name*</Label>
            <Input
              id="name"
              {...register("name")}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Category*</Label>
            <Select
              value={register("category_id").value}
              onValueChange={(value) => setValue("category_id", value)}
            >
              <SelectTrigger
                className={errors.category_id ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="text-sm text-red-500">
                {errors.category_id.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price*</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register("price")}
              className={errors.price ? "border-red-500" : ""}
            />
            {errors.price && (
              <p className="text-sm text-red-500">{errors.price.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU*</Label>
            <Input
              id="sku"
              {...register("sku")}
              className={errors.sku ? "border-red-500" : ""}
            />
            {errors.sku && (
              <p className="text-sm text-red-500">{errors.sku.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input id="barcode" {...register("barcode")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" {...register("image_url")} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} rows={3} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Inventory</h3>

          <div className="border rounded-md p-4">
            <div className="grid grid-cols-3 gap-4 mb-2 font-medium">
              <div>Warehouse</div>
              <div>Stock Level</div>
              <div>Reorder Point</div>
            </div>

            {warehouses.map((warehouse, index) => {
              const inventoryItem = inventoryData.find(
                (item) => item.warehouse_id === warehouse.id,
              ) || { stock_level: 0, reorder_point: 10 };

              return (
                <div
                  key={warehouse.id}
                  className="grid grid-cols-3 gap-4 py-2 border-t first:border-t-0"
                >
                  <div className="flex items-center">{warehouse.name}</div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      value={inventoryItem.stock_level}
                      onChange={(e) =>
                        updateInventoryData(
                          warehouse.id,
                          "stock_level",
                          parseInt(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      value={inventoryItem.reorder_point}
                      onChange={(e) =>
                        updateInventoryData(
                          warehouse.id,
                          "reorder_point",
                          parseInt(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Product"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
