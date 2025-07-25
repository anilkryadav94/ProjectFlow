
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
import { type Project, type Role, processors, qas, processorSubmissionStatuses, qaSubmissionStatuses, processorStatuses, qaStatuses, clientNames, processes, caseManagers, clientStatuses, type ClientStatus, managerNames, renewalAgents, documentTypes, errorOptions, emailForwardedOptions, countries } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { updateProject } from "@/app/actions";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

// Base schema covering all fields, mostly optional for admin/manager view
const baseFormSchema = z.object({
  id: z.string(),
  ref_number: z.string().nullable(),
  application_number: z.string().nullable(),
  patent_number: z.string().nullable(),
  client_name: z.string(),
  process: z.enum(processes),
  processor: z.string(),
  qa: z.string(),
  case_manager: z.string(),
  manager_name: z.string().nullable(),
  sender: z.string().nullable(),
  subject_line: z.string().nullable(),
  received_date: z.string().nullable(),
  allocation_date: z.string().nullable(),
  country: z.string().nullable(),
  document_type: z.string().nullable(),
  action_taken: z.string().nullable(),
  renewal_agent: z.string().nullable(),
  workflowStatus: z.string(), // Not directly edited, but part of the object
  processing_status: z.enum(processorStatuses),
  qa_status: z.enum(qaStatuses),
  clientquery_status: z.enum(clientStatuses).nullable(),
  error: z.enum(errorOptions).nullable(),
  rework_reason: z.string().nullable(),
  qa_remark: z.string().nullable(),
  client_query_description: z.string().nullable(),
  client_comments: z.string().nullable(),
  client_error_description: z.string().nullable(),
  email_renaming: z.string().nullable(),
  email_forwarded: z.enum(emailForwardedOptions).nullable(),
});

// Stricter schema for Processors
const processorFormSchema = baseFormSchema.extend({
  ref_number: z.string().min(1, "Ref Number is required.").nullable(),
  application_number: z.string().min(1, "Application Number is required.").nullable(),
  patent_number: z.string().min(1, "Patent Number is required.").nullable(),
  email_renaming: z.string().min(1, "Email Renaming is required.").nullable(),
  processing_status: z.enum(processorSubmissionStatuses, { errorMap: () => ({ message: "Processing status is required."}) }),
  subject_line: z.string().min(1, "Subject is required.").nullable(),
  sender: z.string().min(1, "Sender is required.").nullable(),
  received_date: z.string().min(1, "Email Date is required.").nullable(),
  case_manager: z.string().min(1, "Case Manager is required."),
  country: z.string().min(1, "Country is required.").nullable(),
  document_type: z.string().min(1, "Document Type is required.").nullable(),
  action_taken: z.string().min(1, "Action Taken is required.").nullable(),
  renewal_agent: z.string().min(1, "Renewal Agent is required.").nullable(),
  client_query_description: z.string().min(1, "Client Query Description is required when status is 'Client Query'.").nullable(),
});

const qaFormSchema = baseFormSchema.extend({
    qa_status: z.enum(qaSubmissionStatuses, { errorMap: () => ({ message: "QA Status is required."}) }),
    qa_remark: z.string().min(1, "QA Remark is required.").nullable(),
    error: z.enum(errorOptions, { errorMap: () => ({ message: "Error field is required."})}).nullable(),
    client_comments: z.string().nullable(),
    rework_reason: z.string().nullable(),
});

const caseManagerFormSchema = z.object({
    id: z.string(),
    clientquery_status: z.enum(clientStatuses, { errorMap: () => ({ message: "Client Status is required."}) }).nullable(),
    client_comments: z.string().min(1, "Client Comments are required.").nullable(),
    workflowStatus: z.string(), // This is not shown but needed for the action
});


type EditProjectFormValues = z.infer<typeof baseFormSchema>;
type SubmitAction = 'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'client_submit';

interface EditProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  project?: Project | null;
  onUpdateSuccess?: () => void;
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
  const { toast } = useToast();
  
  const isProcessorView = userRole === 'Processor' && project?.workflowStatus === 'With Processor';
  const isQaView = userRole === 'QA' && project?.workflowStatus === 'With QA';
  const isCaseManagerView = userRole === 'Case Manager';
  
  const getValidationSchema = () => {
    if (!project) return z.object({}); // No validation if no project
    if (isProcessorView) return processorFormSchema;
    if (isQaView) return qaFormSchema;
    if (isCaseManagerView) return caseManagerFormSchema;
    return baseFormSchema;
  }

  const form = useForm<EditProjectFormValues>({
    resolver: zodResolver(getValidationSchema()),
    defaultValues: project || {},
    mode: 'onBlur',
  });

  React.useEffect(() => {
    if (project) {
       form.reset(project);
    }
  }, [project, form, isOpen]);
  
  const processSubmit = async (data: EditProjectFormValues, action?: SubmitAction) => {
    if (!project || !onUpdateSuccess || !onNavigate || !action) return;

    if (action === 'send_rework' && !data.rework_reason) {
        form.setError("rework_reason", { type: "manual", message: "Rework reason is required." });
        return;
    }
    
    setIsSubmitting(true);
    try {
        const result = await updateProject(project.id, data, action);
        if (result.success && result.project) {
            onUpdateSuccess();
            toast({
                title: "Success",
                description: `Project ${result.project.ref_number || result.project.id} updated.`,
            });

            const currentIndex = projectQueue.findIndex(p => p.id === result.project!.id);
            const newQueueAfterUpdate = projectQueue.filter(p => p.id !== result.project!.id);
            let nextProject;

            if (newQueueAfterUpdate.length > 0) {
              if (currentIndex !== -1 && currentIndex < newQueueAfterUpdate.length) {
                  nextProject = newQueueAfterUpdate[currentIndex];
              } else {
                  nextProject = newQueueAfterUpdate[0];
              }
            }

            if (nextProject) {
                onNavigate(nextProject);
            } else {
                toast({ title: "End of Queue", description: "You've reached the end of your project queue."});
                onOpenChange(false);
            }
        } else {
            throw new Error(result.error || "Failed to update project on the server.");
        }
    } catch (error) {
        toast({
            title: "Error",
            description: `Failed to update project. ${error instanceof Error ? error.message : ''}`,
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
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
        <FormField control={form.control} name="subject_line" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
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
                    <FormItem><FormLabel>Email Date</FormLabel><Input value={project?.received_date ?? ''} readOnly /></FormItem>
                    <FormItem><FormLabel>Renewal Agent</FormLabel><Input value={project?.renewal_agent ?? ''} readOnly /></FormItem>
                    <FormItem className="col-span-2"><FormLabel>Action Taken</FormLabel><Textarea value={project?.action_taken ?? ''} readOnly /></FormItem>
                    <FormItem className="col-span-2"><FormLabel>Client Query Description</FormLabel><Textarea value={project?.client_query_description ?? ''} readOnly /></FormItem>
                </div>
            </div>
        </ScrollArea>
        <div className="space-y-4 p-4 border rounded-md">
            <h3 className="font-semibold text-lg mb-2">QA Assessment</h3>
            <FormField control={form.control} name="qa_status" render={({ field }) => (<FormItem><FormLabel>QA Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select QA status..."/></SelectTrigger></FormControl><SelectContent>{qaSubmissionStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="error" render={({ field }) => (<FormItem><FormLabel>Error Found?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent>{errorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="qa_remark" render={({ field }) => (<FormItem><FormLabel>QA Remark</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="client_comments" render={({ field }) => (<FormItem><FormLabel>Client Comments (Optional)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="rework_reason" render={({ field }) => (<FormItem><FormLabel>Reason for Rework (if sending back)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
        </div>
    </>
  );

  const renderCaseManagerForm = () => (
    <>
      <div className="space-y-4">
        <FormItem>
          <FormLabel>Client Query Description</FormLabel>
          <Textarea value={project?.client_query_description ?? ''} readOnly className="h-24 bg-muted/50" />
        </FormItem>
        <FormField control={form.control} name="clientquery_status" render={({ field }) => (
          <FormItem>
            <FormLabel>Client Status</FormLabel>
            <Select onValueChange={v => field.onChange(v as ClientStatus)} value={field.value ?? ""}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
              <SelectContent>{clientStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <div className="space-y-4">
         <FormField control={form.control} name="client_comments" render={({ field }) => (
            <FormItem>
                <FormLabel>Client Comments</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} className="h-24" /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormItem>
          <FormLabel>Client Feedback / Error Description</FormLabel>
          <Textarea value={project?.client_error_description ?? ''} readOnly className="h-24 bg-muted/50" />
        </FormItem>
      </div>
    </>
  );


  const renderFullForm = () => (
     <>
        <div className="space-y-4">
            <FormField control={form.control} name="ref_number" render={({ field }) => (<FormItem><FormLabel>Ref Number</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!canEditMainFields} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="client_name" render={({ field }) => (<FormItem><FormLabel>Client Name</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{clientNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /> 
            <FormField control={form.control} name="subject_line" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={!canEditMainFields} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="process" render={({ field }) => (<FormItem><FormLabel>Process</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{processes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /> 
            <FormField control={form.control} name="application_number" render={({ field }) => (<FormItem><FormLabel>Application No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!canEditMainFields} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="patent_number" render={({ field }) => (<FormItem><FormLabel>Patent No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!canEditMainFields} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="sender" render={({ field }) => (<FormItem><FormLabel>Sender</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!canEditMainFields} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="received_date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Email Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("font-normal w-full justify-start", !field.value && "text-muted-foreground")} disabled={!canEditMainFields}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(new Date(field.value.replaceAll('-', '/')), "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value.replaceAll('-', '/')) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
        </div>
        <div className="space-y-4">
            <FormField control={form.control} name="allocation_date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Allocation Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("font-normal w-full justify-start", !field.value && "text-muted-foreground")} disabled={!canEditMainFields}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(new Date(field.value.replaceAll('-', '/')), "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value.replaceAll('-', '/')) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="processor" render={({ field }) => (<FormItem><FormLabel>Processor</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{processors.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="qa" render={({ field }) => (<FormItem><FormLabel>QA</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{qas.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="case_manager" render={({ field }) => (<FormItem><FormLabel>Case Manager</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!canEditMainFields}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{caseManagers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="processing_status" render={({ field }) => (<FormItem><FormLabel>Processor Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isManagerOrAdmin}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{processorStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="qa_status" render={({ field }) => (<FormItem><FormLabel>QA Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isManagerOrAdmin}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{qaStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="rework_reason" render={({ field }) => (<FormItem><FormLabel>Rework Reason</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={!isManagerOrAdmin} /></FormControl><FormMessage /></FormItem>)} />
        </div>
     </>
  );

  const renderContent = () => {
    if (project) {
        if (isProcessorView) return renderProcessorForm();
        if (isQaView) return renderQaForm();
        if (isCaseManagerView) return renderCaseManagerForm();
        return renderFullForm();
    }
    return children;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
           <Form {...form}>
            <form className="flex flex-col h-full">
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
                            onClick={form.handleSubmit((data) => processSubmit(data, 'save'))}
                            disabled={isSubmitting || !form.formState.isDirty}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save & Next
                        </Button>
                    )}

                    {isProcessorView && (
                        <Button
                            type="button"
                            onClick={form.handleSubmit((data) => processSubmit(data, 'submit_for_qa'))}
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit for QA & Next
                        </Button>
                    )}
                    {isQaView && (
                        <>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={form.handleSubmit((data) => processSubmit(data, 'send_rework'))}
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send for Rework & Next
                            </Button>
                            <Button
                                type="button"
                                onClick={form.handleSubmit((data) => processSubmit(data, 'submit_qa'))}
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit & Next
                            </Button>
                        </>
                    )}
                    {isCaseManagerView && (
                        <Button
                            type="button"
                            onClick={form.handleSubmit((data) => processSubmit(data, 'client_submit'))}
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
