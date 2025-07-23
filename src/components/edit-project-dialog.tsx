
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
import { Input } from "@/components/ui/input";
import { Loader2, CalendarIcon } from "lucide-react";
import { type Project, type Role, processors, qas, processorSubmissionStatuses, qaSubmissionStatuses, processorStatuses, qaStatuses, clientNames, processes, caseManagers, clientStatuses, type ClientStatus } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { updateProject } from "@/app/actions";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const projectEntrySchema = z.object({
    id: z.string(),
    applicationNumber: z.string().nullable(),
    patentNumber: z.string().nullable(),
    country: z.string().nullable(),
    status: z.string().nullable(),
    notes: z.string().nullable(),
});

const formSchema = z.object({
  id: z.string(),
  refNumber: z.string(),
  clientName: z.string(),
  process: z.enum(["Patent", "TM", "IDS", "Project"]),
  subject: z.string(),
  applicationNumber: z.string().nullable(),
  patentNumber: z.string().nullable(),
  emailDate: z.string(),
  allocationDate: z.string(),
  processor: z.string(),
  qa: z.string(),
  caseManager: z.string(),
  processorStatus: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]),
  qaStatus: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]),
  reworkReason: z.string().nullable(),
  clientComments: z.string().nullable(),
  clientStatus: z.enum(["Approved", "Clarification Required"]).nullable(),
  entries: z.array(projectEntrySchema).optional(),
});

type EditProjectFormValues = z.infer<typeof formSchema>;

interface EditProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  project: Project;
  onUpdateSuccess: (updatedProjectId: string) => void;
  userRole: Role;
  projectQueue: Project[]; // To handle next/prev
  onNavigate: (newProject: Project) => void;
}

export function EditProjectDialog({
  isOpen,
  onOpenChange,
  project,
  onUpdateSuccess,
  userRole,
  projectQueue,
  onNavigate,
}: EditProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitAction, setSubmitAction] = React.useState<'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'client_submit' | null>(null);
  
  const { toast } = useToast();

  const form = useForm<EditProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: project,
  });

  React.useEffect(() => {
    if (project) {
       form.reset({
        ...project,
        emailDate: project.emailDate,
        allocationDate: project.allocationDate,
        entries: project.entries ?? [],
      });
    }
  }, [project, form]);
  
  const handleFormSubmit = async (action: 'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'client_submit') => {
    setSubmitAction(action);
    
    if (action === 'send_rework' && !form.getValues('reworkReason')) {
        form.setError("reworkReason", { type: "manual", message: "Rework reason is required." });
        setSubmitAction(null);
        return;
    }
    
    form.clearErrors("reworkReason");

    await form.handleSubmit(async (data) => {
        setIsSubmitting(true);
        try {
            const result = await updateProject(data, action);
            if (result.success && result.project) {
                const currentId = result.project.id;
                onUpdateSuccess(currentId);
                toast({
                    title: "Success",
                    description: `Project ${result.project.refNumber} updated.`,
                });

                // Navigate to next project in the queue
                const currentIndex = projectQueue.findIndex(p => p.id === currentId);
                
                // If the project status changed and it's no longer in the queue, find the next available one
                const newQueueAfterUpdate = projectQueue.filter(p => {
                     const isSameProject = p.id === currentId;
                     if(isSameProject) return false; // remove the one we just processed
                     return true;
                });
                
                let nextProject;

                if (newQueueAfterUpdate.length > 0) {
                  // try to find the project that was originally next
                  const originalNextProject = projectQueue[currentIndex + 1];
                  if(originalNextProject && newQueueAfterUpdate.find(p => p.id === originalNextProject.id)) {
                      nextProject = originalNextProject;
                  } else {
                     // if the original next is gone, or there was no original next, just take the first of what's left
                     nextProject = newQueueAfterUpdate[0];
                  }
                }


                if (nextProject) {
                    onNavigate(nextProject);
                } else {
                    toast({ title: "End of Queue", description: "You've reached the end of your project queue."});
                    onOpenChange(false); // Close if no next project
                }
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
  const isCaseManagerView = userRole === 'Case Manager';
  const isManagerOrAdmin = userRole === 'Manager' || userRole === 'Admin';
  const canEditMainFields = isManagerOrAdmin;
  const canEditStatusFields = isProcessorView || isQaView || isManagerOrAdmin;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col h-full">
              <DialogHeader>
                  <div className="flex justify-between items-center">
                    <div>
                        <DialogTitle>Edit Project: {form.watch('refNumber')}</DialogTitle>
                        <DialogDescription>Update details for {form.watch('subject')}</DialogDescription>
                    </div>
                  </div>
              </DialogHeader>

              <div className="flex-grow overflow-y-auto py-4 pr-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1 */}
                <div className="space-y-4">
                    <FormField control={form.control} name="refNumber" render={({ field }) => (<FormItem><FormLabel>Ref Number</FormLabel><FormControl><Input {...field} disabled={!canEditMainFields} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Client Name</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{clientNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="process" render={({ field }) => (<FormItem><FormLabel>Process</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{processes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Textarea {...field} disabled={!canEditMainFields} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="applicationNumber" render={({ field }) => (<FormItem><FormLabel>Application No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!canEditMainFields} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="patentNumber" render={({ field }) => (<FormItem><FormLabel>Patent No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!canEditMainFields} /></FormControl><FormMessage /></FormItem>)} />
                    
                    {isCaseManagerView && (
                       <>
                        <FormField control={form.control} name="clientStatus" render={({ field }) => (<FormItem><FormLabel>Client Status</FormLabel><Select onValueChange={v => field.onChange(v as ClientStatus)} value={field.value ?? ""} disabled={!isCaseManagerView}><FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl><SelectContent>{clientStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="clientComments" render={({ field }) => (<FormItem><FormLabel>Client Comments</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={!isCaseManagerView} className="h-24" /></FormControl><FormMessage /></FormItem>)} />
                       </>
                    )}
                </div>
                {/* Column 2 */}
                <div className="space-y-4">
                     <FormField control={form.control} name="emailDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Email Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("font-normal w-full justify-start", !field.value && "text-muted-foreground")} disabled={!canEditMainFields}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(new Date(field.value.replaceAll('-', '/')), "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value.replaceAll('-', '/')) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="allocationDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Allocation Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("font-normal w-full justify-start", !field.value && "text-muted-foreground")} disabled={!canEditMainFields}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(new Date(field.value.replaceAll('-', '/')), "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value.replaceAll('-', '/')) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="processor" render={({ field }) => (<FormItem><FormLabel>Processor</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{processors.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="qa" render={({ field }) => (<FormItem><FormLabel>QA</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{qas.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="caseManager" render={({ field }) => (<FormItem><FormLabel>Case Manager</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{caseManagers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />

                    {(isProcessorView || isManagerOrAdmin || (project.workflowStatus !== 'With Processor' && !isCaseManagerView) ) && <FormField control={form.control} name="processorStatus" render={({ field }) => (<FormItem><FormLabel>Processor Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isProcessorView && !isManagerOrAdmin}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{(isProcessorView || isManagerOrAdmin ? processorSubmissionStatuses : processorStatuses).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                    {(isQaView || isManagerOrAdmin || (project.workflowStatus !== 'With QA' && !isCaseManagerView)) && <FormField control={form.control} name="qaStatus" render={({ field }) => (<FormItem><FormLabel>QA Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isQaView && !isManagerOrAdmin}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{(isQaView || isManagerOrAdmin ? qaSubmissionStatuses : qaStatuses).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                    {project.reworkReason && !isQaView && !isCaseManagerView && (<FormItem><FormLabel>Rework Reason</FormLabel><Textarea value={project.reworkReason} readOnly className="h-24 bg-destructive/10 border-destructive" /></FormItem>)}
                    {isQaView && (<FormField control={form.control} name="reworkReason" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Rework Reason (if sending back)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={!isQaView} /></FormControl><FormMessage /></FormItem>)} />)}
                 </div>
              </div>

              <DialogFooter className="pt-4 border-t mt-auto">
                <div className="flex justify-end gap-2 w-full">
                  {isManagerOrAdmin && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleFormSubmit('save')}
                        disabled={isSubmitting || !form.formState.isDirty}
                    >
                        {isSubmitting && submitAction === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save & Next
                    </Button>
                  )}

                  {isProcessorView && (
                      <Button
                          type="button"
                          onClick={() => handleFormSubmit('submit_for_qa')}
                          disabled={isSubmitting}
                      >
                          {isSubmitting && submitAction === 'submit_for_qa' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Submit for QA & Next
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
                              Send for Rework & Next
                          </Button>
                          <Button
                              type="button"
                              onClick={() => handleFormSubmit('submit_qa')}
                              disabled={isSubmitting}
                          >
                              {isSubmitting && submitAction === 'submit_qa' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Submit & Next
                          </Button>
                      </>
                  )}
                  {isCaseManagerView && (
                       <Button
                          type="button"
                          onClick={() => handleFormSubmit('client_submit')}
                          disabled={isSubmitting}
                      >
                          {isSubmitting && submitAction === 'client_submit' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Submit & Next
                      </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

