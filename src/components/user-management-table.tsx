
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
import { updateUser, addUser, addBulkUsers, getUsers } from "@/lib/auth";
import { ChevronsUpDown, Loader2, PlusCircle, Upload, Search, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { AddUserDialog } from "./add-user-dialog";
import { useRouter } from "next/navigation";

export function UserManagementTable({ sessionUser }: { sessionUser: User }) {
    const [users, setUsers] = React.useState<User[]>([]);
    const [editableUsers, setEditableUsers] = React.useState<Record<string, User>>({});
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState<Record<string, boolean>>({});
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const router = useRouter();


    const fetchUsers = React.useCallback(async () => {
        setIsLoading(true);
        const userList = await getUsers();
        setUsers(userList);
        const editable = userList.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
        }, {} as Record<string, User>);
        setEditableUsers(editable);
        setIsLoading(false);
    }, []);

    React.useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleInputChange = (userId: string, field: keyof User, value: any) => {
        setEditableUsers(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [field]: value
            }
        }));
    };

    const handleRoleChange = (userId: string, role: Role, checked: boolean) => {
         setEditableUsers(prev => {
             const user = prev[userId];
             const newRoles = checked
                ? [...user.roles, role]
                : user.roles.filter(r => r !== role);
             return {
                 ...prev,
                 [userId]: { ...user, roles: newRoles }
             }
         });
    }

    const handleUpdateUser = async (userId: string) => {
        const user = editableUsers[userId];
        if (!user) return;

        setIsSubmitting(prev => ({ ...prev, [user.id]: true }));
        try {
            await updateUser(user.id, {
                name: user.name,
                roles: user.roles,
                password: user.password 
            });

            toast({
                title: "Success",
                description: `User ${user.name} has been updated.`,
            });
            
            if (user.id === sessionUser.id) {
                router.refresh();
            }

            handleInputChange(userId, 'password', '');
            await fetchUsers();
            
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to update user. ${error instanceof Error ? error.message : ''}`,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(prev => ({ ...prev, [user.id]: false }));
        }
    };
    
    const handleAddUser = async (newUser: Omit<User, 'id' | 'password'> & { password?: string }) => {
        try {
            if (!newUser.password) {
                 toast({ title: "Error", description: "Password is required.", variant: "destructive" });
                 return;
            }
            await addUser(newUser.email, newUser.password, newUser.name, newUser.roles);
            toast({
                title: "User Added",
                description: `User record for ${newUser.name} created. You must now create the user in the Firebase Authentication console.`,
            });
            setIsAddUserDialogOpen(false);
            await fetchUsers();
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
                })).filter(u => u.name && u.email && u.password);

                if (newUsers.length === 0) {
                    toast({ title: "Upload Error", description: "CSV file is empty or malformed.", variant: "destructive" });
                    return;
                }
                
                try {
                    const { addedCount, errors } = await addBulkUsers(newUsers);
                    await fetchUsers();
                    toast({
                        title: "Bulk Upload Complete",
                        description: `${addedCount} users added. ${errors.length} duplicates/errors.`,
                    });
                } catch(e) {
                     toast({ title: "Upload Error", description: "An error occurred during bulk upload.", variant: "destructive" });
                }
            },
            error: (error: any) => {
                 toast({ title: "Parsing Error", description: error.message, variant: "destructive" });
            }
        });

        event.target.value = '';
    };

    const handleDownloadUsers = () => {
        if (filteredUsers.length === 0) {
            toast({ title: "No users to export", variant: "destructive" });
            return;
        }

        const usersToExport = filteredUsers.map(user => {
            const { password, ...rest } = user;
            return {
                ...rest,
                roles: user.roles.join(', ')
            };
        });

        const csv = Papa.unparse(usersToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `projectflow_users_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="shadow-md">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <CardTitle>User Management</CardTitle>
                                <CardDescription>Manage user details, roles, and permissions for the application.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                 <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                                    <Input
                                        placeholder="Search by username or email..."
                                        className="pl-9 h-9 w-64"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    accept=".csv"
                                />
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Bulk Upload
                                </Button>
                                <Button variant="outline" onClick={handleDownloadUsers} disabled={filteredUsers.length === 0}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Download
                                </Button>
                                <Button onClick={() => setIsAddUserDialogOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add User
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-y-auto max-h-[calc(100vh-350px)]">
                            <Table>
                                <TableHeader className="sticky top-0 bg-primary z-10">
                                    <TableRow>
                                        <TableHead className="text-primary-foreground/90">Username</TableHead>
                                        <TableHead className="text-primary-foreground/90">Email</TableHead>
                                        <TableHead className="text-primary-foreground/90">Password</TableHead>
                                        <TableHead className="text-primary-foreground/90">Roles</TableHead>
                                        <TableHead className="w-[120px] text-primary-foreground/90">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <Input
                                                        value={editableUsers[user.id]?.name || ''}
                                                        onChange={(e) => handleInputChange(user.id, 'name', e.target.value)}
                                                        disabled={isSubmitting[user.id]}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="email"
                                                        value={editableUsers[user.id]?.email || ''}
                                                        disabled={true} // Email should not be editable
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        onChange={(e) => handleInputChange(user.id, 'password', e.target.value)}
                                                        disabled={isSubmitting[user.id]}
                                                        placeholder="Set new password"
                                                        type="password"
                                                        value={editableUsers[user.id]?.password || ''}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" className="w-full justify-between" disabled={isSubmitting[user.id]}>
                                                                <span className="truncate">{editableUsers[user.id]?.roles?.join(', ') || 'Select roles'}</span>
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className="w-56">
                                                            <DropdownMenuLabel>Assign Roles</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {roles.map((role) => (
                                                                <DropdownMenuCheckboxItem
                                                                    key={role}
                                                                    checked={editableUsers[user.id]?.roles?.includes(role)}
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
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <AddUserDialog 
                isOpen={isAddUserDialogOpen}
                onOpenChange={setIsAddUserDialogOpen}
                onAddUser={handleAddUser}
            />
        </>
    )
}
