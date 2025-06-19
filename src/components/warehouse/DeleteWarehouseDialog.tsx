import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface DeleteWarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string;
  warehouseName: string;
  onSuccess: () => void;
}

const DeleteWarehouseDialog: React.FC<DeleteWarehouseDialogProps> = ({
  open,
  onOpenChange,
  warehouseId,
  warehouseName,
  onSuccess,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      // Check if warehouse has inventory records
      const { data: inventoryData, error: inventoryCheckError } = await supabase
        .from("inventory")
        .select("id")
        .eq("warehouse_id", warehouseId)
        .limit(1);

      if (inventoryCheckError) throw inventoryCheckError;

      if (inventoryData && inventoryData.length > 0) {
        throw new Error(
          "Cannot delete warehouse with existing inventory. Please transfer or remove all inventory first.",
        );
      }

      // Check if warehouse is referenced in stock transfers
      const { data: transferData, error: transferCheckError } = await supabase
        .from("stock_transfers")
        .select("id")
        .or(
          `from_warehouse_id.eq.${warehouseId},to_warehouse_id.eq.${warehouseId}`,
        )
        .limit(1);

      if (transferCheckError) throw transferCheckError;

      if (transferData && transferData.length > 0) {
        throw new Error(
          "Cannot delete warehouse with existing stock transfer records.",
        );
      }

      // Delete the warehouse
      const { error: warehouseError } = await supabase
        .from("warehouses")
        .delete()
        .eq("id", warehouseId);

      if (warehouseError) throw warehouseError;

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error deleting warehouse:", err);
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the warehouse "{warehouseName}". This
            action cannot be undone. Make sure there are no inventory records or
            stock transfers associated with this warehouse.
          </AlertDialogDescription>
          {error && (
            <div className="p-3 mt-2 border border-red-300 bg-red-50 text-red-800 rounded-md">
              {error}
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteWarehouseDialog;
