
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type User, roles, type Role } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { updateUser } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface UserManagementTableProps {
    users: User[];
}

export function UserManagementTable({ users: initialUsers }: UserManagementTableProps) {
    const [users, setUsers] = React.useState(initialUsers);
    const [isSubmitting, setIsSubmitting] = React.useState<Record<string, boolean>>({});
    const { toast } = useToast();

    const handleInputChange = (userId: string, field: keyof User, value: string) => {
        setUsers(prevUsers => 
            prevUsers.map(u => u.id === userId ? { ...u, [field]: value } : u)
        );
    };

    const handleUpdateUser = async (user: User) => {
        setIsSubmitting(prev => ({ ...prev, [user.id]: true }));
        try {
            await updateUser(user);
            toast({
                title: "Success",
                description: `User ${user.name} has been updated.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to update user. ${error instanceof Error ? error.message : ''}`,
                variant: "destructive",
            });
            // Optionally revert state on error
        } finally {
            setIsSubmitting(prev => ({ ...prev, [user.id]: false }));
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user details and roles for the application.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Password</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="w-[120px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <Input
                                            value={user.name}
                                            onChange={(e) => handleInputChange(user.id, 'name', e.target.value)}
                                            disabled={isSubmitting[user.id]}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="email"
                                            value={user.email}
                                            onChange={(e) => handleInputChange(user.id, 'email', e.target.value)}
                                            disabled={isSubmitting[user.id]}
                                        />
                                    </TableCell>
                                    <TableCell>
                                         <Input
                                            value={user.password || ''}
                                            onChange={(e) => handleInputChange(user.id, 'password', e.target.value)}
                                            disabled={isSubmitting[user.id]}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={user.role}
                                            onValueChange={(value) => handleInputChange(user.id, 'role', value as Role)}
                                            disabled={isSubmitting[user.id]}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roles.map((role) => (
                                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Button 
                                            onClick={() => handleUpdateUser(user)} 
                                            disabled={isSubmitting[user.id]}
                                            size="sm"
                                        >
                                            {isSubmitting[user.id] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Update
                                        </Button>
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
