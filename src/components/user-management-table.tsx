
"use client";

import * as React from "react";
import Papa from "papaparse";
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
import { updateUser, addUser, addBulkUsers } from "@/lib/auth";
import { ChevronsUpDown, Loader2, PlusCircle, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { AddUserDialog } from "./add-user-dialog";

interface UserManagementTableProps {
    users: User[];
}

export function UserManagementTable({ users: initialUsers }: UserManagementTableProps) {
    const [users, setUsers] = React.useState(initialUsers);
    const [isSubmitting, setIsSubmitting] = React.useState<Record<string, boolean>>({});
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
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

    const handleUpdateUser = async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        setIsSubmitting(prev => ({ ...prev, [user.id]: true }));
        try {
            const result = await updateUser(user);
            if (result.success) {
                toast({
                    title: "Success",
                    description: `User ${user.name} has been updated.`,
                });
            }
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
    
    const handleAddUser = async (newUser: Omit<User, 'id'>) => {
        try {
            const result = await addUser(newUser);
            if(result.success && result.user) {
                setUsers(prev => [result.user, ...prev]);
                toast({
                    title: "User Added",
                    description: `User ${result.user.name} has been successfully added.`,
                });
                setIsAddUserDialogOpen(false);
            }
        } catch(error) {
            toast({
                title: "Error",
                description: `Failed to add user. ${error instanceof Error ? error.message : ''}`,
                variant: "destructive",
            });
        }
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const newUsers = results.data.map((row: any) => ({
                    name: row.name || '',
                    email: row.email || '',
                    password: row.password || 'password', // Default password
                    roles: (row.roles || '').split(',').map((r: string) => r.trim()).filter((r: Role) => roles.includes(r)) as Role[]
                })).filter(u => u.name && u.email);

                if (newUsers.length === 0) {
                    toast({ title: "Upload Error", description: "CSV file is empty or malformed.", variant: "destructive" });
                    return;
                }
                
                try {
                    const { addedUsers, errors } = await addBulkUsers(newUsers);
                    setUsers(prev => [...addedUsers, ...prev]);
                    toast({
                        title: "Bulk Upload Complete",
                        description: `${addedUsers.length} users added. ${errors.length} duplicates found.`,
                    });
                } catch(e) {
                     toast({ title: "Upload Error", description: "An error occurred during bulk upload.", variant: "destructive" });
                }
            },
            error: (error: any) => {
                 toast({ title: "Parsing Error", description: error.message, variant: "destructive" });
            }
        });

        // Reset file input
        event.target.value = '';
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user details, roles, and permissions for the application.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-y-auto max-h-[calc(100vh-350px)]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card z-10">
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
                                                placeholder="Set new password"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-between" disabled={isSubmitting[user.id]}>
                                                        <span className="truncate">{user.roles?.join(', ') || 'Select roles'}</span>
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-56">
                                                    <DropdownMenuLabel>Assign Roles</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    {roles.map((role) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={role}
                                                            checked={user.roles?.includes(role)}
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
                                                onClick={() => handleUpdateUser(user.id)} 
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
                <CardFooter className="justify-end gap-2">
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Bulk Upload
                    </Button>
                    <Button onClick={() => setIsAddUserDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                </CardFooter>
            </Card>
            <AddUserDialog 
                isOpen={isAddUserDialogOpen}
                onOpenChange={setIsAddUserDialogOpen}
                onAddUser={handleAddUser}
            />
        </>
    )
}
