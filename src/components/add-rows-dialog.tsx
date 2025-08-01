
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { type Project } from "@/lib/data";
import { addRows } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Separator } from "./ui/separator";

const fieldsToCopy = [
  { id: 'subject_line', label: 'Subject' },
  { id: 'client_name', label: 'Client Name' },
  { id: 'process', label: 'Process' },
  { id: 'processor', label: 'Processor' },
  { id: 'qa', label: 'QA' },
  { id: 'case_manager', label: 'Case Manager' },
  { id: 'manager_name', label: 'Manager Name' },
  { id: 'received_date', label: 'Email Date' },
  { id: 'allocation_date', label: 'Allocation Date' },
] as const;

const allFieldIds = fieldsToCopy.map(f => f.id);

type FieldToCopyId = typeof fieldsToCopy[number]['id'];

const formSchema = z.object({
  fields: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one field to copy.",
  }),
  count: z.coerce.number().min(1, "You must add at least one row.").max(100, "You can add a maximum of 100 rows at a time."),
});

type AddRowsFormValues = z.infer<typeof formSchema>;

interface AddRowsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sourceProject: Project;
  onAddRowsSuccess: () => void;
}

export function AddRowsDialog({
  isOpen,
  onOpenChange,
  sourceProject,
  onAddRowsSuccess,
}: AddRowsDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<AddRowsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fields: [],
      count: 1,
    },
  });

  const selectedFields = form.watch('fields');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      form.setValue('fields', allFieldIds);
    } else {
      form.setValue('fields', []);
    }
  };

  const onSubmit = async (data: AddRowsFormValues) => {
    setIsSubmitting(true);
    try {
      const projectsToAdd: Partial<Project>[] = [];
      for (let i = 0; i < data.count; i++) {
        const projectDataToCopy: Partial<Project> = {};
        (data.fields as FieldToCopyId[]).forEach(field => {
            if(sourceProject.hasOwnProperty(field)) {
                // Ensure id and row_number are never copied
                if (field !== 'id' && field !== 'row_number') {
                    projectDataToCopy[field as keyof Project] = sourceProject[field as keyof Project] as any;
                }
            }
        });
        projectsToAdd.push(projectDataToCopy);
      }

      const result = await addRows(projectsToAdd);
      if (result.success) {
        toast({
          title: "Success",
          description: `${result.addedCount} new rows have been added.`,
        });
        onAddRowsSuccess();
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to add rows. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      onOpenChange(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Add New Rows</DialogTitle>
              <DialogDescription>
                Create multiple new rows by copying data from Row: {sourceProject.row_number}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <FormField
                control={form.control}
                name="fields"
                render={() => (
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel className="text-base">Fields to Copy</FormLabel>
                    </div>
                     <div className="flex items-center space-x-3 rounded-md border p-4">
                        <Checkbox
                            id="select-all"
                            checked={selectedFields.length === allFieldIds.length}
                            onCheckedChange={handleSelectAll}
                        />
                        <label
                            htmlFor="select-all"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Select / Deselect All
                        </label>
                    </div>
                    <Separator className="my-4"/>
                    <div className="grid grid-cols-2 gap-4">
                      {fieldsToCopy.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="fields"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Rows to Add</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Rows
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
