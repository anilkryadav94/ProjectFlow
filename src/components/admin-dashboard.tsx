"use client";

import * as React from "react";
import { UserManagementTable } from "./user-management-table";
import { MetadataManagement } from "./metadata-management";
import { type User } from "@/lib/data";
import { Separator } from "./ui/separator";

export function AdminDashboard({ sessionUser }: { sessionUser: User }) {
  return (
    <div className="flex-grow flex flex-col p-4 gap-6">
      <UserManagementTable sessionUser={sessionUser} />
      <Separator />
      <MetadataManagement />
    </div>
  );
}
