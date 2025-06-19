import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import WarehouseForm from "./WarehouseForm";

interface WarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId?: string;
  onSuccess: () => void;
}

const WarehouseDialog: React.FC<WarehouseDialogProps> = ({
  open,
  onOpenChange,
  warehouseId,
  onSuccess,
}) => {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {warehouseId ? "Edit Warehouse" : "Add New Warehouse"}
          </DialogTitle>
        </DialogHeader>
        <WarehouseForm
          warehouseId={warehouseId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
};

export default WarehouseDialog;
