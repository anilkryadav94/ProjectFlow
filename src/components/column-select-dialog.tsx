
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
import { ArrowLeft, ArrowRight, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [selectedAvailable, setSelectedAvailable] = React.useState<string | null>(null);
  const [selectedVisible, setSelectedVisible] = React.useState<string | null>(null);
  
  const availableColumns = allColumns.filter(
    (col) => !visibleColumnKeys.includes(col.key) && !['select', 'actions'].includes(col.key)
  );
  
  const visibleColumnsData = visibleColumnKeys
    .map((key) => allColumns.find((col) => col.key === key))
    .filter((col): col is ColumnSelectItem => !!col);

  const handleMoveToVisible = () => {
    if (selectedAvailable) {
      setVisibleColumnKeys([...visibleColumnKeys, selectedAvailable]);
      setSelectedAvailable(null);
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
        // Cannot move 'actions' or 'select' from the first positions if they exist
        const immovablePrefix = newOrder.filter(k => k === 'select' || k === 'actions').length;
        if(index <= immovablePrefix) return;

        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        setVisibleColumnKeys(newOrder);
    } else if (direction === 'down' && index < visibleColumnKeys.length - 1) {
        const newOrder = [...visibleColumnKeys];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setVisibleColumnKeys(newOrder);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Customize Columns</DialogTitle>
          <DialogDescription>
            Select which columns to display and set their order.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center min-h-[400px]">
          {/* Available Columns */}
          <div className="flex flex-col h-full border rounded-md">
            <h3 className="p-2 font-semibold border-b bg-muted">Available Columns</h3>
            <ScrollArea className="flex-grow">
              <div className="p-2">
                {availableColumns.map((col) => (
                  <div
                    key={col.key}
                    onClick={() => setSelectedAvailable(col.key)}
                    className={cn(
                      "p-2 rounded-md cursor-pointer hover:bg-muted",
                      selectedAvailable === col.key && "bg-primary text-primary-foreground"
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
            <Button size="icon" variant="outline" onClick={handleMoveToVisible} disabled={!selectedAvailable}>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={handleMoveToAvailable} disabled={!selectedVisible || ['actions', 'select'].includes(selectedVisible)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Visible Columns */}
          <div className="flex flex-col h-full border rounded-md">
             <h3 className="p-2 font-semibold border-b bg-muted">Visible Columns</h3>
            <div className="flex-grow flex">
                <ScrollArea className="flex-grow">
                <div className="p-2">
                    {visibleColumnsData.map((col) => (
                    <div
                        key={col.key}
                        onClick={() => setSelectedVisible(col.key)}
                        className={cn(
                        "p-2 rounded-md cursor-pointer hover:bg-muted",
                        selectedVisible === col.key && "bg-primary text-primary-foreground"
                        )}
                    >
                        {col.header}
                    </div>
                    ))}
                </div>
                </ScrollArea>
                 <div className="flex flex-col gap-2 p-2 border-l">
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
