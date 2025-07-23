"use client";

import * as React from "react";
import type { ProjectEntry } from "@/lib/data";
import { countries, projectStatuses } from "@/lib/data";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { PlusCircle, Trash2 } from "lucide-react";

interface ProjectEntriesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  entries: ProjectEntry[];
  onSaveChanges: (entries: ProjectEntry[]) => void;
  projectSubject: string;
}

export function ProjectEntriesDialog({
  isOpen,
  onOpenChange,
  entries,
  onSaveChanges,
  projectSubject,
}: ProjectEntriesDialogProps) {
  const [localEntries, setLocalEntries] = React.useState<ProjectEntry[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      // Create a deep copy to avoid mutating parent state directly. Fallback to empty array if entries is null/undefined.
      setLocalEntries(JSON.parse(JSON.stringify(entries || [])));
    }
  }, [isOpen, entries]);

  const addEntry = () => {
    const newEntry: ProjectEntry = {
      id: `new_${Date.now()}`,
      applicationNumber: null,
      patentNumber: null,
      country: null,
      status: null,
      notes: null,
    };
    setLocalEntries([...localEntries, newEntry]);
  };

  const updateEntry = (index: number, field: keyof ProjectEntry, value: string | null) => {
    const newEntries = [...localEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setLocalEntries(newEntries);
  };

  const deleteEntry = (index: number) => {
    const newEntries = localEntries.filter((_, i) => i !== index);
    setLocalEntries(newEntries);
  };
  
  const handleSave = () => {
    onSaveChanges(localEntries);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Project Entries for: {projectSubject}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4">
            <div className="rounded-md border">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                    <TableHead>Application No.</TableHead>
                    <TableHead>Patent No.</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[50px]">Action</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {localEntries.length > 0 ? (
                    localEntries.map((entry, index) => (
                    <TableRow key={entry.id}>
                        <TableCell>
                        <Input
                            value={entry.applicationNumber ?? ""}
                            onChange={(e) => updateEntry(index, 'applicationNumber', e.target.value)}
                            placeholder="Application Number"
                        />
                        </TableCell>
                        <TableCell>
                        <Input
                            value={entry.patentNumber ?? ""}
                            onChange={(e) => updateEntry(index, 'patentNumber', e.target.value)}
                            placeholder="Patent Number"
                        />
                        </TableCell>
                         <TableCell>
                            <Select value={entry.country ?? ""} onValueChange={(value) => updateEntry(index, 'country', value)}>
                                <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                                <SelectContent>
                                    {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell>
                            <Select value={entry.status ?? ""} onValueChange={(value) => updateEntry(index, 'status', value)}>
                                <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                                <SelectContent>
                                    {projectStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell>
                        <Textarea
                            value={entry.notes ?? ""}
                            onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                            placeholder="Add notes..."
                            className="min-h-[40px]"
                        />
                        </TableCell>
                        <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteEntry(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No entries added yet.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
             <Button onClick={addEntry} size="sm" variant="outline" className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Entry
            </Button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
