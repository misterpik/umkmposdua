import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SalesTerminal from "@/components/sales/SalesTerminal";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const SalesPage = () => {
  return (
    <ProtectedRoute allowedRoles={["admin", "cashier"]}>
      <DashboardLayout>
        <SalesTerminal />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default SalesPage;
