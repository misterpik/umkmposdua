import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Warehouse } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const warehouseSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  location: z
    .string()
    .min(2, { message: "Location must be at least 2 characters" }),
  description: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

interface WarehouseFormProps {
  warehouseId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const WarehouseForm: React.FC<WarehouseFormProps> = ({
  warehouseId,
  onSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: "",
      location: "",
      description: "",
      contact_email: "",
      contact_phone: "",
    },
  });

  // Fetch warehouse data if editing
  useEffect(() => {
    if (warehouseId) {
      const fetchWarehouse = async () => {
        setIsFetching(true);
        try {
          const { data: warehouse, error: warehouseError } = await supabase
            .from("warehouses")
            .select("*")
            .eq("id", warehouseId)
            .single();

          if (warehouseError) throw warehouseError;

          // Set form values
          reset({
            name: warehouse.name,
            location: warehouse.location,
            description: warehouse.description || "",
            contact_email: warehouse.contact_email || "",
            contact_phone: warehouse.contact_phone || "",
          });
        } catch (err: any) {
          console.error("Error fetching warehouse:", err);
          setError(err.message);
        } finally {
          setIsFetching(false);
        }
      };

      fetchWarehouse();
    }
  }, [warehouseId, reset]);

  const onSubmit = async (data: WarehouseFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // Clean up empty strings for optional fields
      const cleanData = {
        ...data,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        description: data.description || null,
      };

      if (warehouseId) {
        // Update existing warehouse
        const { error: updateError } = await supabase
          .from("warehouses")
          .update(cleanData)
          .eq("id", warehouseId);

        if (updateError) throw updateError;
      } else {
        // Create new warehouse
        const { error: insertError } = await supabase
          .from("warehouses")
          .insert(cleanData);

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error saving warehouse:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading warehouse data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="text-2xl font-bold mb-6">
        {warehouseId ? "Edit Warehouse" : "Add New Warehouse"}
      </h2>

      {error && (
        <div className="p-4 mb-6 border border-red-300 bg-red-50 text-red-800 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Warehouse Name*</Label>
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
            <Label htmlFor="location">Location*</Label>
            <Input
              id="location"
              {...register("location")}
              className={errors.location ? "border-red-500" : ""}
            />
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              {...register("contact_email")}
              className={errors.contact_email ? "border-red-500" : ""}
            />
            {errors.contact_email && (
              <p className="text-sm text-red-500">
                {errors.contact_email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <Input id="contact_phone" {...register("contact_phone")} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} rows={3} />
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
              "Save Warehouse"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default WarehouseForm;
