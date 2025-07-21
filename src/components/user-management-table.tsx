
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type User, roles, type Role } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { updateUserRole } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface UserManagementTableProps {
    users: User[];
}

export function UserManagementTable({ users: initialUsers }: UserManagementTableProps) {
    const [users, setUsers] = React.useState(initialUsers);
    const [isSubmitting, setIsSubmitting] = React.useState<Record<string, boolean>>({});
    const { toast } = useToast();

    const handleRoleChange = async (userId: string, newRole: Role) => {
        setIsSubmitting(prev => ({ ...prev, [userId]: true }));
        try {
            await updateUserRole(userId, newRole);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
            toast({
                title: "Success",
                description: `User role has been updated.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update user role.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(prev => ({ ...prev, [userId]: false }));
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and access for the application.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Password</TableHead>
                                <TableHead>Current Role</TableHead>
                                <TableHead className="w-[250px]">Change Role</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.password}</TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                defaultValue={user.role}
                                                onValueChange={(value) => handleRoleChange(user.id, value as Role)}
                                                disabled={isSubmitting[user.id]}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Select a role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map((role) => (
                                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {isSubmitting[user.id] && <Loader2 className="h-4 w-4 animate-spin" />}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
