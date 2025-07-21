import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserManagementTable } from "./user-management-table";
import { Header } from "@/components/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { users } from "@/lib/data";


export default async function AdminPage() {
    const session = await getSession();
    if (!session || session.user.role !== 'Admin') {
        redirect('/');
    }

    const allUsers = users;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <Button asChild variant="outline">
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
            <p className="text-muted-foreground mb-6">Manage user roles and access.</p>
            <UserManagementTable users={allUsers} />
        </div>
    )
}
