import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WarehousePage = () => {
  return (
    <ProtectedRoute allowedRoles={["admin", "inventory"]}>
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Warehouse management features will be implemented here.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default WarehousePage;
