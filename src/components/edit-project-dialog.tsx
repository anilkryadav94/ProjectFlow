
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { type Project, type Role, processors, qas, processorSubmissionStatuses, qaSubmissionStatuses, processorStatuses, qaStatuses } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { updateProject } from "@/app/actions";

const formSchema = z.object({
  id: z.string(),
  processor: z.string(),
  qa: z.string(),
  processorStatus: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]),
  qaStatus: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]),
  reworkReason: z.string().nullable(),
});

type EditProjectFormValues = z.infer<typeof formSchema>;

interface EditProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  project: Project;
  onUpdateSuccess: () => void;
  userRole: Role;
}

export function EditProjectDialog({
  isOpen,
  onOpenChange,
  project,
  onUpdateSuccess,
  userRole,
}: EditProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitAction, setSubmitAction] = React.useState<'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework' | null>(null);
  const { toast } = useToast();

  const form = useForm<EditProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: project.id,
      processor: project.processor,
      qa: project.qa,
      processorStatus: project.processorStatus,
      qaStatus: project.qaStatus,
      reworkReason: project.reworkReason,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        id: project.id,
        processor: project.processor,
        qa: project.qa,
        processorStatus: project.processorStatus,
        qaStatus: project.qaStatus,
        reworkReason: project.reworkReason,
      });
    }
  }, [isOpen, project, form]);
  
  const handleFormSubmit = async (action: 'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework') => {
    setSubmitAction(action);
    
    // Custom validation for rework reason
    if (action === 'send_rework' && !form.getValues('reworkReason')) {
        form.setError("reworkReason", { type: "manual", message: "Rework reason is required." });
        return;
    } else {
        form.clearErrors("reworkReason");
    }

    await form.handleSubmit(async (data) => {
        setIsSubmitting(true);
        try {
            const result = await updateProject(data, action);
            if (result.success) {
                toast({
                    title: "Success",
                    description: "Project updated successfully.",
                });
                onUpdateSuccess();
                onOpenChange(false);
            } else {
                throw new Error("Failed to update project on the server.");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to update project. ${error instanceof Error ? error.message : ''}`,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
            setSubmitAction(null);
        }
    })();
  }

  const isProcessorView = userRole === 'Processor' && project.workflowStatus === 'With Processor';
  const isQaView = userRole === 'QA' && project.workflowStatus === 'With QA';
  const isManagerOrAdmin = userRole === 'Manager' || userRole === 'Admin';
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Edit Project: {project.refNumber}</DialogTitle>
              <DialogDescription>
                Update project details below. Your role determines which fields are editable.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <FormField
                control={form.control}
                name="processor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Processor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isManagerOrAdmin}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>{processors.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="qa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QA</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isManagerOrAdmin}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>{qas.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {(isProcessorView || isManagerOrAdmin || project.workflowStatus !== 'With Processor') &&
                <FormField
                  control={form.control}
                  name="processorStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Processor Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!isProcessorView}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{(isProcessorView ? processorSubmissionStatuses : processorStatuses).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              }

              {(isQaView || isManagerOrAdmin || project.workflowStatus !== 'With QA') &&
                <FormField
                  control={form.control}
                  name="qaStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>QA Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!isQaView}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{(isQaView ? qaSubmissionStatuses : qaStatuses).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              }

               {project.reworkReason && !isQaView && (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Rework Reason</FormLabel>
                        <Textarea value={project.reworkReason} readOnly className="h-24 bg-destructive/10 border-destructive" />
                    </FormItem>
                )}

              {isQaView && (
                <FormField
                  control={form.control}
                  name="reworkReason"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Rework Reason (if sending back)</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} disabled={!isQaView} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter className="pt-4 border-t">
              <div className="flex justify-end gap-2 w-full">
                {isManagerOrAdmin && (
                   <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleFormSubmit('save')}
                      disabled={isSubmitting}
                  >
                      {isSubmitting && submitAction === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                  </Button>
                )}

                {isProcessorView && (
                    <Button
                        type="button"
                        onClick={() => handleFormSubmit('submit_for_qa')}
                        disabled={isSubmitting}
                    >
                        {isSubmitting && submitAction === 'submit_for_qa' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit for QA
                    </Button>
                )}
                {isQaView && (
                    <>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleFormSubmit('send_rework')}
                            disabled={isSubmitting}
                        >
                            {isSubmitting && submitAction === 'send_rework' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send for Rework
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleFormSubmit('submit_qa')}
                            disabled={isSubmitting}
                        >
                            {isSubmitting && submitAction === 'submit_qa' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit
                        </Button>
                    </>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
