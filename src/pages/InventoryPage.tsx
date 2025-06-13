import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import InventoryManager from "@/components/inventory/InventoryManager";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const InventoryPage = () => {
  return (
    <ProtectedRoute allowedRoles={["admin", "inventory"]}>
      <DashboardLayout>
        <InventoryManager />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default InventoryPage;
