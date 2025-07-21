
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    DropdownMenu, 
    DropdownMenuTrigger, 
    DropdownMenuContent, 
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type User, roles, type Role } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { updateUser } from "@/lib/auth";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";

interface UserManagementTableProps {
    users: User[];
}

export function UserManagementTable({ users: initialUsers }: UserManagementTableProps) {
    const [users, setUsers] = React.useState(initialUsers);
    const [isSubmitting, setIsSubmitting] = React.useState<Record<string, boolean>>({});
    const { toast } = useToast();

    const handleInputChange = (userId: string, field: keyof User, value: any) => {
        setUsers(prevUsers => 
            prevUsers.map(u => u.id === userId ? { ...u, [field]: value } : u)
        );
    };

    const handleRoleChange = (userId: string, role: Role, checked: boolean) => {
         setUsers(prevUsers =>
            prevUsers.map(user => {
                if (user.id === userId) {
                    const newRoles = checked
                        ? [...user.roles, role]
                        : user.roles.filter(r => r !== role);
                    return { ...user, roles: newRoles };
                }
                return user;
            })
        );
    }

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
                                <TableHead>Roles</TableHead>
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
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between" disabled={isSubmitting[user.id]}>
                                                    <span className="truncate">{user.roles.join(', ') || 'Select roles'}</span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-56">
                                                <DropdownMenuLabel>Assign Roles</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {roles.map((role) => (
                                                    <DropdownMenuCheckboxItem
                                                        key={role}
                                                        checked={user.roles.includes(role)}
                                                        onCheckedChange={(checked) => handleRoleChange(user.id, role, !!checked)}
                                                        onSelect={(e) => e.preventDefault()}
                                                    >
                                                        {role}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
