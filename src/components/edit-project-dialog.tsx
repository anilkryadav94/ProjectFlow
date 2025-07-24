

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
import { ScrollArea } from "./ui/scroll-area";

const projectEntrySchema = z.object({
    id: z.string(),
    application_number: z.string().nullable(),
    patent_number: z.string().nullable(),
    country: z.string().nullable(),
    status: z.string().nullable(),
    notes: z.string().nullable(),
});

// Default schema for Admin/Manager
const fullFormSchema = z.object({
  id: z.string(),
  ref_number: z.string().nullable(),
  client_name: z.string(),
  process: z.enum(["Patent", "TM", "IDS", "Project"]),
  subject_line: z.string(),
  application_number: z.string().nullable(),
  patent_number: z.string().nullable(),
  received_date: z.string(),
  allocation_date: z.string(),
  processor: z.string(),
  qa: z.string(),
  case_manager: z.string(),
  processing_status: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]),
  qa_status: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]),
  rework_reason: z.string().nullable(),
  client_comments: z.string().nullable(),
  clientquery_status: z.enum(["Approved", "Clarification Required"]).nullable(),
  entries: z.array(projectEntrySchema).optional(),
   // Adding all new fields to be safe
  sender: z.string().nullable(),
  country: z.string().nullable(),
  document_type: z.string().nullable(),
  action_taken: z.string().nullable(),
  renewal_agent: z.string().nullable(),
  client_query_description: z.string().nullable(),
  client_error_description: z.string().nullable(),
  qa_remark: z.string().nullable(),
  error: z.string().nullable(),
  email_renaming: z.string().nullable(),
  email_forwarded: z.string().nullable(),
  reportout_date: z.string().nullable(),
  manager_name: z.string().nullable(),
  client_response_date: z.string().nullable(),
});


// Stricter schema for Processors
const processorFormSchema = fullFormSchema.extend({
  ref_number: z.string().min(1, "Ref Number is required."),
  application_number: z.string().min(1, "Application Number is required."),
  patent_number: z.string().min(1, "Patent Number is required."),
  email_renaming: z.string().min(1, "Email Renaming is required."),
  processing_status: z.enum(["Processed", "NTP", "Client Query", "Already Processed"], { errorMap: () => ({ message: "Processing status is required."}) }),
  subject_line: z.string().min(1, "Subject is required."),
  sender: z.string().min(1, "Sender is required."),
  received_date: z.string().min(1, "Email Date is required."),
  case_manager: z.string().min(1, "Case Manager is required."),
  country: z.string().min(1, "Country is required."),
  document_type: z.string().min(1, "Document Type is required."),
  action_taken: z.string().min(1, "Action Taken is required."),
  renewal_agent: z.string().min(1, "Renewal Agent is required."),
  client_query_description: z.string().min(1, "Client Query Description is required."),
  rework_reason: z.string().nullable(), // Not always required
});

const qaFormSchema = fullFormSchema.extend({
    qa_status: z.enum(qaSubmissionStatuses, { errorMap: () => ({ message: "QA Status is required."}) }),
    qa_remark: z.string().min(1, "QA Remark is required."),
    error: z.enum(["Yes", "No"], { errorMap: () => ({ message: "Error field is required."})}),
    client_comments: z.string().nullable(),
    rework_reason: z.string().nullable(),
});

const caseManagerFormSchema = fullFormSchema.extend({
    clientquery_status: z.enum(["Approved", "Clarification Required"], { errorMap: () => ({ message: "Client Status is required."}) }),
    client_comments: z.string().min(1, "Client Comments are required."),
});


type EditProjectFormValues = z.infer<typeof fullFormSchema>;

interface EditProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  project?: Project | null;
  onUpdateSuccess?: (updatedProjectId: string) => void;
  userRole?: Role;
  projectQueue?: Project[]; // To handle next/prev
  onNavigate?: (newProject: Project) => void;
  children?: React.ReactNode;
  title?: string;
  description?: string;
}

export function EditProjectDialog({
  isOpen,
  onOpenChange,
  project,
  onUpdateSuccess,
  userRole,
  projectQueue = [],
  onNavigate,
  children,
  title,
  description,
}: EditProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitAction, setSubmitAction] = React.useState<'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'client_submit' | null>(null);
  
  const { toast } = useToast();
  
  const isProcessorView = userRole === 'Processor' && project?.workflowStatus === 'With Processor';
  const isQaView = userRole === 'QA' && project?.workflowStatus === 'With QA';
  const isCaseManagerView = userRole === 'Case Manager';
  
  const getValidationSchema = () => {
    if (!project) return z.object({}); // No validation if no project
    if (isProcessorView) return processorFormSchema;
    if (isQaView) return qaFormSchema;
    if (isCaseManagerView) return caseManagerFormSchema;
    return fullFormSchema;
  }

  const form = useForm<EditProjectFormValues>({
    resolver: zodResolver(getValidationSchema()),
    defaultValues: project || {},
  });

  React.useEffect(() => {
    if (project) {
       form.reset({
        ...project,
        ref_number: project.ref_number ?? "",
        received_date: project.received_date,
        allocation_date: project.allocation_date,
        entries: project.entries ?? [],
      });
    }
  }, [project, form, isOpen]);
  
  const handleFormSubmit = async (action: 'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'client_submit') => {
    if (!project || !onUpdateSuccess || !onNavigate) return;

    setSubmitAction(action);
    
    if (action === 'send_rework' && !form.getValues('rework_reason')) {
        form.setError("rework_reason", { type: "manual", message: "Rework reason is required." });
        setSubmitAction(null);
        return;
    }
    
    form.clearErrors("rework_reason");

    await form.handleSubmit(async (data) => {
        setIsSubmitting(true);
        try {
            const result = await updateProject(data, action);
            if (result.success && result.project) {
                const currentId = result.project.id;
                onUpdateSuccess(currentId);
                toast({
                    title: "Success",
                    description: `Project ${result.project.ref_number} updated.`,
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
  
  const isManagerOrAdmin = userRole === 'Manager' || userRole === 'Admin';
  const canEditMainFields = isManagerOrAdmin;

  const renderProcessorForm = () => (
    <>
      <div className="space-y-4">
        <FormField control={form.control} name="ref_number" render={({ field }) => (<FormItem><FormLabel>Ref Number (Manual)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="application_number" render={({ field }) => (<FormItem><FormLabel>Application No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="patent_number" render={({ field }) => (<FormItem><FormLabel>Patent No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="email_renaming" render={({ field }) => (<FormItem><FormLabel>Email Renaming</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="processing_status" render={({ field }) => (<FormItem><FormLabel>Processor Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{processorSubmissionStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="subject_line" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
        {project?.rework_reason && (<FormItem><FormLabel>Reason for Rework</FormLabel><Textarea value={project.rework_reason} readOnly className="h-24 bg-destructive/10 border-destructive" /></FormItem>)}
      </div>
      <div className="space-y-4">
        <FormField control={form.control} name="sender" render={({ field }) => (<FormItem><FormLabel>Sender</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="received_date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Email Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("font-normal w-full justify-start", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(new Date(field.value.replaceAll('-', '/')), "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value.replaceAll('-', '/')) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="case_manager" render={({ field }) => (<FormItem><FormLabel>Case Manager</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{caseManagers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="document_type" render={({ field }) => (<FormItem><FormLabel>Document Type</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="action_taken" render={({ field }) => (<FormItem><FormLabel>Action Taken</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="renewal_agent" render={({ field }) => (<FormItem><FormLabel>Renewal Agent</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="client_query_description" render={({ field }) => (<FormItem><FormLabel>Client Query Description</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
      </div>
    </>
  );

  const renderQaForm = () => (
    <>
        {/* Column 1: Read-only processor info */}
        <ScrollArea className="h-full">
            <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                <h3 className="font-semibold text-lg mb-2">Processor Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormItem><FormLabel>Ref Number</FormLabel><Input value={project?.ref_number ?? ''} readOnly /></FormItem>
                    <FormItem><FormLabel>Processor</FormLabel><Input value={project?.processor} readOnly /></FormItem>
                    <FormItem><FormLabel>Processing Status</FormLabel><Input value={project?.processing_status} readOnly /></FormItem>
                    <FormItem><FormLabel>Application No.</FormLabel><Input value={project?.application_number ?? ''} readOnly /></FormItem>
                    <FormItem><FormLabel>Patent No.</FormLabel><Input value={project?.patent_number ?? ''} readOnly /></FormItem>
                    <FormItem><FormLabel>Country</FormLabel><Input value={project?.country ?? ''} readOnly /></FormItem>
                    <FormItem><FormLabel>Document Type</FormLabel><Input value={project?.document_type ?? ''} readOnly /></FormItem>
                    <FormItem><FormLabel>Email Renaming</FormLabel><Input value={project?.email_renaming ?? ''} readOnly /></FormItem>
                    <FormItem><FormLabel>Sender</FormLabel><Input value={project?.sender ?? ''} readOnly /></FormItem>
                    <FormItem><FormLabel>Email Date</FormLabel><Input value={project?.received_date} readOnly /></FormItem>
                    <FormItem><FormLabel>Renewal Agent</FormLabel><Input value={project?.renewal_agent ?? ''} readOnly /></FormItem>
                    <FormItem className="col-span-2"><FormLabel>Action Taken</FormLabel><Textarea value={project?.action_taken ?? ''} readOnly /></FormItem>
                    <FormItem className="col-span-2"><FormLabel>Client Query Description</FormLabel><Textarea value={project?.client_query_description ?? ''} readOnly /></FormItem>
                </div>
            </div>
        </ScrollArea>
        {/* Column 2: QA editable fields */}
        <div className="space-y-4 p-4 border rounded-md">
            <h3 className="font-semibold text-lg mb-2">QA Assessment</h3>
            <FormField control={form.control} name="qa_status" render={({ field }) => (<FormItem><FormLabel>QA Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select QA status..."/></SelectTrigger></FormControl><SelectContent>{qaSubmissionStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="error" render={({ field }) => (<FormItem><FormLabel>Error Found?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="qa_remark" render={({ field }) => (<FormItem><FormLabel>QA Remark</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="client_comments" render={({ field }) => (<FormItem><FormLabel>Client Comments (Optional)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="rework_reason" render={({ field }) => (<FormItem><FormLabel>Reason for Rework (if sending back)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        </div>
    </>
  );


  const renderFullForm = () => (
     <>
        {/* Column 1 */}
        <div className="space-y-4">
            <FormField control={form.control} name="ref_number" render={({ field }) => (<FormItem><FormLabel>Ref Number (Manual)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!canEditMainFields} /></FormControl><FormMessage /></FormItem>)} />
             {!isCaseManagerView && <FormField control={form.control} name="client_name" render={({ field }) => (<FormItem><FormLabel>Client Name</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{clientNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /> }
            <FormField control={form.control} name="subject_line" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Textarea {...field} disabled={!canEditMainFields && !isCaseManagerView} /></FormControl><FormMessage /></FormItem>)} />
             {!isCaseManagerView && <FormField control={form.control} name="process" render={({ field }) => (<FormItem><FormLabel>Process</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{processes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /> }
            <FormField control={form.control} name="application_number" render={({ field }) => (<FormItem><FormLabel>Application No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!canEditMainFields && !isCaseManagerView} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="patent_number" render={({ field }) => (<FormItem><FormLabel>Patent No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!canEditMainFields && !isCaseManagerView} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!canEditMainFields && !isCaseManagerView} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="sender" render={({ field }) => (<FormItem><FormLabel>Sender</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!canEditMainFields && !isCaseManagerView} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="received_date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Email Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("font-normal w-full justify-start", !field.value && "text-muted-foreground")} disabled={!canEditMainFields && !isCaseManagerView}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(new Date(field.value.replaceAll('-', '/')), "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value.replaceAll('-', '/')) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
            
             {isCaseManagerView && project && (
                <>
                <FormField control={form.control} name="client_query_description" render={({ field }) => (<FormItem><FormLabel>Client Query Description</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="clientquery_status" render={({ field }) => (<FormItem><FormLabel>Client Status</FormLabel><Select onValueChange={v => field.onChange(v as ClientStatus)} value={field.value ?? ""} disabled={!isCaseManagerView}><FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl><SelectContent>{clientStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                </>
            )}
        </div>
        {/* Column 2 */}
        <div className="space-y-4">
            {isCaseManagerView && project && (
                 <>
                    <FormField control={form.control} name="client_comments" render={({ field }) => (<FormItem><FormLabel>Client Comments</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={!isCaseManagerView} className="h-24" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="client_error_description" render={({ field }) => (<FormItem><FormLabel>Client Feedback / Error</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={!isCaseManagerView} className="h-24" /></FormControl><FormMessage /></FormItem>)} />
                 </>
            )}

            {!isCaseManagerView && project && (
              <>
                <FormField control={form.control} name="allocation_date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Allocation Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("font-normal w-full justify-start", !field.value && "text-muted-foreground")} disabled={!canEditMainFields}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(new Date(field.value.replaceAll('-', '/')), "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value.replaceAll('-', '/')) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="processor" render={({ field }) => (<FormItem><FormLabel>Processor</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{processors.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="qa" render={({ field }) => (<FormItem><FormLabel>QA</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{qas.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="case_manager" render={({ field }) => (<FormItem><FormLabel>Case Manager</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{caseManagers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                {(isProcessorView || isManagerOrAdmin ) && <FormField control={form.control} name="processing_status" render={({ field }) => (<FormItem><FormLabel>Processor Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isProcessorView && !isManagerOrAdmin}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{(isProcessorView || isManagerOrAdmin ? processorSubmissionStatuses : processorStatuses).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                {(isQaView || isManagerOrAdmin) && <FormField control={form.control} name="qa_status" render={({ field }) => (<FormItem><FormLabel>QA Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isQaView && !isManagerOrAdmin}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{(isQaView || isManagerOrAdmin ? qaSubmissionStatuses : qaStatuses).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                {project.rework_reason && !isQaView && (<FormItem><FormLabel>Rework Reason</FormLabel><Textarea value={project.rework_reason} readOnly className="h-24 bg-destructive/10 border-destructive" /></FormItem>)}
                {isQaView && (<FormField control={form.control} name="rework_reason" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Rework Reason (if sending back)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={!isQaView} /></FormControl><FormMessage /></FormItem>)} />)}
              </>
            )}
            
            
          </div>
     </>
  );

  const renderContent = () => {
    if (project) {
        if (isProcessorView) return renderProcessorForm();
        if (isQaView) return renderQaForm();
        return renderFullForm();
    }
    return children;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
           <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col h-full">
              <DialogHeader>
                  <div className="flex justify-between items-center">
                    <div>
                        <DialogTitle>{title || `Edit Project: ${form.watch('id')}`}</DialogTitle>
                        <DialogDescription>{description || `Update details for ${form.watch('ref_number')}`}</DialogDescription>
                    </div>
                  </div>
              </DialogHeader>
              
              {project ? (
                <div className="flex-grow overflow-y-auto py-4 pr-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderContent()}
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto py-4 pr-2">
                   {children}
                </div>
              )}
              
              {project && (
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
               )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

    