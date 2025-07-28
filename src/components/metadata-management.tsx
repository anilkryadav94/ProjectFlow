"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Save, Trash2, Workflow } from "lucide-react";
import { getMetadata, addMetadata, updateMetadata, deleteMetadata, type MetadataItem } from "@/services/metadata-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const collections = [
  { value: "clients", label: "Clients" },
  { value: "processes", label: "Processes" },
  { value: "countries", label: "Countries" },
  { value: "documentTypes", label: "Document Types" },
  { value: "renewalAgents", label: "Renewal Agents" },
];

export function MetadataManagement() {
  const [selectedCollection, setSelectedCollection] = React.useState("clients");
  const [items, setItems] = React.useState<MetadataItem[]>([]);
  const [editableItems, setEditableItems] = React.useState<Record<string, string>>({});
  const [newItemName, setNewItemName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMetadata(selectedCollection);
      setItems(data);
      const editable = data.reduce((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {} as Record<string, string>);
      setEditableItems(editable);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch items for ${selectedCollection}.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedCollection, toast]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleInputChange = (id: string, value: string) => {
    setEditableItems(prev => ({ ...prev, [id]: value }));
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      toast({ title: "Error", description: "Item name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsSubmitting(prev => ({ ...prev, new: true }));
    try {
      await addMetadata(selectedCollection, newItemName);
      toast({ title: "Success", description: `${newItemName} added successfully.` });
      setNewItemName("");
      fetchItems();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to add item. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(prev => ({ ...prev, new: false }));
    }
  };

  const handleUpdateItem = async (id: string) => {
    const newName = editableItems[id];
    if (!newName.trim()) {
      toast({ title: "Error", description: "Item name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsSubmitting(prev => ({ ...prev, [id]: true }));
    try {
      await updateMetadata(selectedCollection, id, newName);
      toast({ title: "Success", description: "Item updated successfully." });
      fetchItems();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update item. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteItem = async (id: string) => {
    setIsSubmitting(prev => ({ ...prev, [id]: true }));
    try {
      await deleteMetadata(selectedCollection, id);
      toast({ title: "Success", description: "Item deleted successfully." });
      fetchItems();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete item. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [id]: false }));
    }
  };
  
  const selectedCollectionLabel = collections.find(c => c.value === selectedCollection)?.label || 'Items';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Metadata Management</CardTitle>
        <CardDescription>
          Manage the dropdown options used throughout the application. Changes here will be reflected globally.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
            <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select a collection" />
                </SelectTrigger>
                <SelectContent>
                    {collections.map((col) => (
                    <SelectItem key={col.value} value={col.value}>
                        {col.label}
                    </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="space-y-4">
             <h3 className="text-lg font-medium">Add New {selectedCollectionLabel.slice(0, -1)}</h3>
             <div className="flex items-center gap-2">
                <Input
                    placeholder={`New ${selectedCollectionLabel.slice(0, -1)} Name...`}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    disabled={isSubmitting['new']}
                />
                <Button onClick={handleAddItem} disabled={isSubmitting['new']}>
                    {isSubmitting['new'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Add
                </Button>
            </div>
        </div>

        <div className="rounded-md border h-full max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                <TableHead>{selectedCollectionLabel}</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input
                        value={editableItems[item.id] || ''}
                        onChange={(e) => handleInputChange(item.id, e.target.value)}
                        disabled={isSubmitting[item.id]}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button
                            size="sm"
                            onClick={() => handleUpdateItem(item.id)}
                            disabled={isSubmitting[item.id] || item.name === editableItems[item.id]}
                        >
                            {isSubmitting[item.id] && isSubmitting[item.id] !== 'delete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save
                       </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button size="sm" variant="destructive" disabled={isSubmitting[item.id]}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the item
                                <span className="font-bold"> "{editableItems[item.id]}"</span>.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>
                                Continue
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                        No items found in {selectedCollectionLabel}.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
