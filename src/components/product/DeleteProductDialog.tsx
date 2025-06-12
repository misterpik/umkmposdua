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

interface DeleteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  onSuccess: () => void;
}

const DeleteProductDialog: React.FC<DeleteProductDialogProps> = ({
  open,
  onOpenChange,
  productId,
  productName,
  onSuccess,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      // Delete inventory records first (due to foreign key constraints)
      const { error: inventoryError } = await supabase
        .from("inventory")
        .delete()
        .eq("product_id", productId);

      if (inventoryError) throw inventoryError;

      // Delete transaction items (if any)
      const { error: transactionItemsError } = await supabase
        .from("transaction_items")
        .delete()
        .eq("product_id", productId);

      if (transactionItemsError) throw transactionItemsError;

      // Delete stock transfer items (if any)
      const { error: transferItemsError } = await supabase
        .from("stock_transfer_items")
        .delete()
        .eq("product_id", productId);

      if (transferItemsError) throw transferItemsError;

      // Finally delete the product
      const { error: productError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (productError) throw productError;

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error deleting product:", err);
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
            This will permanently delete the product "{productName}" and all
            associated inventory records. This action cannot be undone.
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

export default DeleteProductDialog;
