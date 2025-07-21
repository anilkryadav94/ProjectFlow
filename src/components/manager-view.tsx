"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { Textarea } from "./ui/textarea";

export function ManagerView() {
    const { toast } = useToast();

    const handleFileUpload = (fileType: string) => {
        toast({
            title: `${fileType} Upload`,
            description: `This is a placeholder for ${fileType.toLowerCase()} file upload functionality.`,
        });
    };
    
    const handleGenerateReport = () => {
        toast({
            title: `Report Generation`,
            description: `This is a placeholder for report generation functionality.`,
        });
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Generate Reports</CardTitle>
                    <CardDescription>
                        Generate reports based on a text query.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label>Text Query</Label>
                        <Textarea placeholder="Enter keywords, names, or numbers..." />
                    </div>
                    <Button onClick={handleGenerateReport}>Generate Report</Button>
                </CardContent>
            </Card>
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Data Upload</CardTitle>
                    <CardDescription>
                        Upload email data or Excel files to update the system.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="email-upload">Email Upload</Label>
                        <div className="flex gap-2">
                           <Input id="email-upload" type="file" className="cursor-pointer" />
                           <Button variant="outline" onClick={() => handleFileUpload('Email')}>
                                <Upload className="h-4 w-4 mr-2"/> Upload
                           </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Upload emails to allocate tasks.</p>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="excel-upload">Excel Data Upload</Label>
                         <div className="flex gap-2">
                           <Input id="excel-upload" type="file" accept=".xlsx, .xls, .csv" className="cursor-pointer" />
                           <Button variant="outline" onClick={() => handleFileUpload('Excel')}>
                                <Upload className="h-4 w-4 mr-2"/> Upload
                           </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Upload bulk project data from a spreadsheet.</p>
                     </div>
                </CardContent>
            </Card>
        </div>
    );
}
