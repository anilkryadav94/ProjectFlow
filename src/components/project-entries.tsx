
"use client";

import * as React from "react";
import type { ProjectEntry } from "@/lib/data";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { PlusCircle, Trash2 } from "lucide-react";

interface ProjectEntriesProps {
  entries: ProjectEntry[];
  onChange: (entries: ProjectEntry[]) => void;
  projectData: {
    subject: string;
    emailDate: string;
    allocationDate: string;
  };
}

export function ProjectEntries({ entries, onChange, projectData }: ProjectEntriesProps) {

  const addEntry = () => {
    const newEntry: ProjectEntry = {
      id: `new_${Date.now()}`,
      column1: projectData.subject, // Auto-fill
      column2: projectData.emailDate, // Auto-fill
      notes: `Allocated on: ${projectData.allocationDate}`, // Auto-fill
    };
    onChange([...entries, newEntry]);
  };

  const updateEntry = (index: number, field: keyof ProjectEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    onChange(newEntries);
  };

  const deleteEntry = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(newEntries);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Entries</h3>
        <Button onClick={addEntry} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Entry
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Column 1 (Subject)</TableHead>
              <TableHead>Column 2 (Email Date)</TableHead>
              <TableHead>Notes (Allocation Date)</TableHead>
              <TableHead className="w-[50px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length > 0 ? (
              entries.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Input
                      value={entry.column1}
                      onChange={(e) => updateEntry(index, 'column1', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.column2}
                      onChange={(e) => updateEntry(index, 'column2', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={entry.notes}
                      onChange={(e) => updateEntry(index, 'notes', e.target.value)}
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
                <TableCell colSpan={4} className="h-24 text-center">
                  No entries added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    