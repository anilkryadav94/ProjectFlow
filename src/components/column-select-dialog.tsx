
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";

interface ColumnSelectItem {
  key: string;
  header: string;
}

interface ColumnSelectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  allColumns: ColumnSelectItem[];
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;
}

export function ColumnSelectDialog({
  isOpen,
  onOpenChange,
  allColumns,
  visibleColumns: visibleColumnKeys,
  setVisibleColumns: setVisibleColumnKeys,
}: ColumnSelectDialogProps) {
  const [selectedAvailable, setSelectedAvailable] = React.useState<Set<string>>(new Set());
  const [selectedVisible, setSelectedVisible] = React.useState<string | null>(null);

  const availableColumns = allColumns.filter(
    (col) => !visibleColumnKeys.includes(col.key) && !['select', 'actions'].includes(col.key)
  );

  const visibleColumnsData = visibleColumnKeys
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnSelectItem => !!col);

  const handleToggleAvailable = (key: string) => {
    setSelectedAvailable(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        return newSet;
    });
  };

  const handleSelectAllAvailable = (checked: boolean) => {
    if (checked) {
        setSelectedAvailable(new Set(availableColumns.map(c => c.key)));
    } else {
        setSelectedAvailable(new Set());
    }
  };

  const handleMoveToVisible = () => {
    if (selectedAvailable.size > 0) {
      setVisibleColumnKeys([...visibleColumnKeys, ...Array.from(selectedAvailable)]);
      setSelectedAvailable(new Set());
    }
  };

  const handleMoveToAvailable = () => {
    if (selectedVisible) {
      setVisibleColumnKeys(visibleColumnKeys.filter((key) => key !== selectedVisible));
      setSelectedVisible(null);
    }
  };

  const handleMove = (direction: 'up' | 'down') => {
    if (!selectedVisible) return;

    const index = visibleColumnKeys.indexOf(selectedVisible);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
        const newOrder = [...visibleColumnKeys];
        const immovablePrefix = newOrder.filter(k => k === 'select' || k === 'actions').length;
        if (index <= immovablePrefix) return;

        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        setVisibleColumnKeys(newOrder);
    } else if (direction === 'down' && index < visibleColumnKeys.length - 1) {
        const newOrder = [...visibleColumnKeys];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setVisibleColumnKeys(newOrder);
    }
  };

  const handleRemoveAllVisible = () => {
    const essentialColumns = visibleColumnKeys.filter(key => ['select', 'actions'].includes(key));
    setVisibleColumnKeys(essentialColumns);
    setSelectedVisible(null);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Columns</DialogTitle>
          <DialogDescription>
            Select which columns to display and set their order.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center min-h-[400px]">
          {/* Available Columns */}
          <div className="flex flex-col h-full border rounded-md">
            <h3 className="p-2 text-sm font-semibold border-b bg-muted">Available Columns</h3>
             <div className="p-2 border-b">
                <div className="flex items-center space-x-3">
                    <Checkbox
                        id="select-all-available"
                        checked={availableColumns.length > 0 && selectedAvailable.size === availableColumns.length}
                        onCheckedChange={handleSelectAllAvailable}
                    />
                    <label
                        htmlFor="select-all-available"
                        className="text-sm font-medium leading-none"
                    >
                        Select / Deselect All
                    </label>
                </div>
            </div>
            <ScrollArea className="h-[350px]">
              <div className="p-2 space-y-1">
                {availableColumns.map((col) => (
                  <div
                    key={col.key}
                    onClick={() => handleToggleAvailable(col.key)}
                    className={cn(
                      "p-2 rounded-md cursor-pointer hover:bg-muted text-xs",
                      selectedAvailable.has(col.key) && "bg-primary text-primary-foreground"
                    )}
                  >
                    {col.header}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2">
            <Button size="icon" variant="outline" onClick={handleMoveToVisible} disabled={selectedAvailable.size === 0}>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={handleMoveToAvailable} disabled={!selectedVisible || ['actions', 'select'].includes(selectedVisible)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Visible Columns */}
          <div className="flex flex-col h-full border rounded-md">
             <div className="flex items-center justify-between p-2 border-b bg-muted">
                <h3 className="text-sm font-semibold">Visible Columns</h3>
                <Button variant="ghost" size="sm" onClick={handleRemoveAllVisible} className="h-auto p-1 text-xs">
                    <Trash2 className="mr-1 h-3 w-3" /> Remove All
                </Button>
             </div>
            <div className="flex-grow flex">
                <ScrollArea className="h-[350px] flex-grow">
                <div className="p-2 space-y-1">
                    {visibleColumnsData.map((col) => (
                    <div
                        key={col.key}
                        onClick={() => setSelectedVisible(col.key)}
                        className={cn(
                        "p-2 rounded-md cursor-pointer hover:bg-muted text-xs",
                        selectedVisible === col.key && "bg-primary text-primary-foreground"
                        )}
                    >
                        {col.header}
                    </div>
                    ))}
                </div>
                </ScrollArea>
                 <div className="flex flex-col gap-2 p-2 border-l bg-muted/50">
                    <Button size="icon" variant="outline" onClick={() => handleMove('up')} disabled={!selectedVisible}>
                        <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => handleMove('down')} disabled={!selectedVisible}>
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
