
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
import { useToast } from "@/hooks/use-toast";
import { addRows } from "@/app/actions";
import { Loader2 } from "lucide-react";

const fieldsToCopy = [
  { id: 'subject_line', label: 'Subject' },
  { id: 'client_name', label: 'Client Name' },
  { id: 'process', label: 'Process' },
  { id: 'processor', label: 'Processor' },
  { id: 'qa', label: 'QA' },
  { id: 'case_manager', label: 'Case Manager' },
  { id: 'received_date', label: 'Email Date' },
  { id: 'allocation_date', label: 'Allocation Date' },
] as const;

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

  const onSubmit = async (data: AddRowsFormValues) => {
    setIsSubmitting(true);
    try {
      const projectDataToCopy: Partial<Project> = {};
      (data.fields as FieldToCopyId[]).forEach(field => {
          if(sourceProject.hasOwnProperty(field)) {
              projectDataToCopy[field] = sourceProject[field as keyof Project];
          }
      });

      const result = await addRows(projectDataToCopy, data.count);
      if (result.success) {
        toast({
          title: "Success",
          description: `${result.addedCount} new rows have been added.`,
        });
        onAddRowsSuccess();
        onOpenChange(false);
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
                Create multiple new rows by copying data from Ref: {sourceProject.ref_number}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <FormField
                control={form.control}
                name="fields"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Fields to Copy</FormLabel>
                    </div>
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
