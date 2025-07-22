
"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import type { Project } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

const mmRecordSchema = z.object({
  matterId: z.string().min(1, "Matter ID is required."),
  customField: z.string().optional(),
});

const formSchema = z.object({
  clientName: z.string(),
  process: z.string(),
  emailDate: z.string(),
  subject: z.string(),
  records: z.array(mmRecordSchema),
});

type MultiMattersFormValues = z.infer<typeof formSchema>;

interface MultiMattersFormProps {
  project: Project;
  setOpen: (open: boolean) => void;
}

export function MultiMattersForm({ project, setOpen }: MultiMattersFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<MultiMattersFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: project.clientName,
      process: project.process,
      emailDate: format(new Date(project.emailDate), "PPP"),
      subject: project.subject,
      records: [{ matterId: "", customField: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "records",
  });

  async function onSubmit(data: MultiMattersFormValues) {
    setIsSubmitting(true);
    console.log("Submitting MM Records:", data);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({
        title: "Success",
        description: "Multimatters records have been updated.",
    });
    setIsSubmitting(false);
    setOpen(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="process"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Process</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="emailDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Date</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
              </FormItem>
            )}
          />

        <Card>
            <CardContent className="pt-6">
                <div className="space-y-2">
                     <h3 className="font-medium">Records</h3>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-2/5">Matter ID</TableHead>
                                <TableHead className="w-2/5">Custom Field</TableHead>
                                <TableHead className="w-1/5"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <FormField
                                            control={form.control}
                                            name={`records.${index}.matterId`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Enter Matter ID" {...field} />
                                                    </FormControl>
                                                     <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                         <FormField
                                            control={form.control}
                                            name={`records.${index}.customField`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Custom Value" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                     <TableCell className="text-right">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            disabled={fields.length <= 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                     </Table>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ matterId: "", customField: "" })}
                     >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Row
                     </Button>
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Records
          </Button>
        </div>
      </form>
    </Form>
  );
}

    