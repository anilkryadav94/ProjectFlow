
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, PlusSquare } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import { saveProject } from "@/app/actions"
import { type Project, processors, qas, clientNames, processes, type Role, processorSubmissionStatuses, qaSubmissionStatuses, processorActionableStatuses } from "@/lib/data"
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { MultiMattersForm } from "./multi-matters-form"
import { ScrollArea } from "./ui/scroll-area"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  id: z.string().optional(),
  refNumber: z.string().min(1, "Reference number is required."),
  clientName: z.string().min(1, "Client name is required."),
  process: z.enum(["Patent", "TM", "IDS", "Project"]),
  applicationNumber: z.string().optional(),
  patentNumber: z.string().optional(),
  emailDate: z.date({ required_error: "Email date is required." }),
  allocationDate: z.date({ required_error: "Allocation date is required." }),
  processor: z.string().min(1, "Processor is required."),
  qa: z.string().min(1, "QA is required."),
  
  processorStatus: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]),
  qaStatus: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]),
  reworkReason: z.string().optional(),
  subject: z.string().optional(),
  actionTaken: z.string().optional(),
  documentName: z.string().optional(),

  submitAction: z.enum(['save', 'submit_for_qa', 'submit_qa', 'send_for_rework'])
}).refine(data => {
    if (data.submitAction === 'send_for_rework') {
        return !!data.reworkReason && data.reworkReason.trim().length > 0;
    }
    return true;
}, {
    message: "Rework reason is required when sending for rework.",
    path: ["reworkReason"],
}).refine(data => {
    // QA status is only required when submitting QA, not when sending for rework
    if (data.submitAction === 'submit_qa') {
        return !!data.qaStatus;
    }
    return true;
}, {
    message: "QA Status is required when submitting.",
    path: ["qaStatus"]
});


type ProjectFormValues = z.infer<typeof formSchema>;

interface ProjectFormProps {
  project?: Project | null;
  role: Role;
  setOpen?: (open: boolean) => void;
  nextProjectId?: string;
}

export function ProjectForm({ project: initialProject, role, setOpen, nextProjectId }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isMMFormOpen, setIsMMFormOpen] = React.useState(false);
  const { toast } = useToast();
  
  const [project, setProject] = React.useState(initialProject);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    key: project?.id || 'new',
  });

  React.useEffect(() => {
    if (project) {
        form.reset({
            id: project.id,
            refNumber: project.refNumber || "",
            clientName: project.clientName || "",
            process: project.process || "Patent",
            applicationNumber: project.applicationNumber || "",
            patentNumber: project.patentNumber || "",
            emailDate: new Date(project.emailDate),
            allocationDate: new Date(project.allocationDate),
            processor: project.processor || "",
            qa: project.qa || "",
            subject: project.subject || "",
            actionTaken: project.actionTaken || "",
            documentName: project.documentName || "",
            processorStatus: project.processorStatus || "Pending",
            qaStatus: project.qaStatus || "Pending",
            reworkReason: project.reworkReason || "",
        });
    } else {
        form.reset(); 
    }
  }, [project, form]);
  
  const handleFormSubmit = async (data: ProjectFormValues, action: ProjectFormValues['submitAction']) => {
    const isSave = action === 'save';
    if(isSave) {
        setIsSaving(true);
    } else {
        setIsSubmitting(true);
    }

    try {
      const result = await saveProject({ ...data, submitAction: action }, nextProjectId);
      
      if (isSave && result) {
          setProject(result as Project);
          toast({ title: "Success", description: "Changes have been saved." });
      }
    } catch (error) {
      console.error("Failed to save project", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Error", description: `Failed to save changes: ${errorMessage}`, variant: "destructive" });
    } finally {
        if(isSave) {
            setIsSaving(false);
        } else {
            setIsSubmitting(false);
        }
    }
  };
  
  const handleSaveChanges = () => form.handleSubmit((data) => handleFormSubmit(data, 'save'))();
  const handleSubmitForQA = () => form.handleSubmit((data) => handleFormSubmit(data, 'submit_for_qa'))();
  const handleQAComplete = () => form.handleSubmit((data) => handleFormSubmit(data, 'submit_qa'))();
  const handleSendForRework = () => form.handleSubmit((data) => handleFormSubmit(data, 'send_for_rework'))();


  const isProcessor = role === 'Processor';
  const isQA = role === 'QA';
  const isManager = role === 'Manager' || role === 'Admin';
  
  const isFieldEditable = (fieldName: string) => {
    if (isManager) return true;
    if (isProcessor) {
        return ['applicationNumber', 'patentNumber', 'documentName', 'actionTaken', 'processorStatus'].includes(fieldName);
    }
     if (isQA) {
        return ['qaStatus', 'reworkReason'].includes(fieldName);
    }
    return false;
  }

  const canProcessorSubmit = isProcessor && project?.workflowStatus === 'With Processor';
  const canQASubmit = isQA && project?.workflowStatus === 'With QA';
  const isAnyActionLoading = isSubmitting || isSaving;

  return (
    <div className="animated-border shadow-xl h-full">
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="h-full flex flex-col">
            <Card className="border-0 shadow-none flex flex-col flex-grow h-full">
              <CardHeader className="bg-muted/50 p-3 flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg">{project ? `Task: ${project.refNumber}`: 'New Project'}</CardTitle>
                    {project && <CardDescription className="text-xs">Subject: {project.subject}</CardDescription>}
                </div>
                <div className="flex items-center space-x-2">
                    {project && isProcessor && (
                        <Dialog open={isMMFormOpen} onOpenChange={setIsMMFormOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" disabled={isAnyActionLoading}>
                                    <PlusSquare className="mr-2 h-4 w-4" />
                                    Add MM Records
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[725px]">
                                <DialogHeader>
                                    <DialogTitle>Add Multimatters Records</DialogTitle>
                                </DialogHeader>
                                <MultiMattersForm project={project} setOpen={setIsMMFormOpen} />
                            </DialogContent>
                        </Dialog>
                    )}
                    
                    {canProcessorSubmit && (
                        <Button size="sm" type="button" onClick={handleSubmitForQA} disabled={isAnyActionLoading}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit for QA
                        </Button>
                    )}
                    {canQASubmit && (
                        <>
                           <Button size="sm" type="button" variant="destructive" onClick={handleSendForRework} disabled={isAnyActionLoading}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send for Rework
                            </Button>
                             <Button size="sm" type="button" onClick={handleQAComplete} disabled={isAnyActionLoading}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                QA Complete
                            </Button>
                        </>
                    )}
                     <Button size="sm" type="button" onClick={handleSaveChanges} disabled={isAnyActionLoading || (!isManager && !canProcessorSubmit && !canQASubmit)}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isManager && !project ? 'Create Project' : 'Save Changes'}
                    </Button>
                </div>
              </CardHeader>
              <ScrollArea className="flex-grow">
                <CardContent className="p-4">
                    <div className="space-y-4">
                      {project?.workflowStatus === 'With Processor' && project.processorStatus === 'Re-Work' && (
                        <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10">
                          <h4 className="font-semibold text-destructive">Rework Required</h4>
                          <p className="text-sm text-destructive/80 mt-1">
                            QA has sent this task back with the following reason: <span className="font-medium">{project.reworkReason || "No reason provided."}</span>
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <FormField
                              control={form.control}
                              name="refNumber"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Reference Number</FormLabel>
                                  <FormControl>
                                      <Input placeholder="REF..." {...field} disabled={!isFieldEditable('refNumber')}/>
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name="clientName"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Client Name</FormLabel>
                                    {isManager ? (
                                      <Select onValueChange={field.onChange} value={field.value} disabled={!isFieldEditable('clientName')}>
                                          <FormControl>
                                          <SelectTrigger>
                                              <SelectValue placeholder="Select a client" />
                                          </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                              {clientNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                    ) : (
                                      <Input {...field} disabled />
                                    )}
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name="process"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Process</FormLabel>
                                  {isManager ? (
                                      <Select onValueChange={field.onChange} value={field.value} disabled={!isFieldEditable('process')}>
                                          <FormControl>
                                          <SelectTrigger>
                                              <SelectValue placeholder="Select a process" />
                                          </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                              {processes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                  ) : (
                                      <Input {...field} disabled />
                                  )}
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                           <FormItem>
                                <FormLabel>Workflow Status</FormLabel>
                                <Input value={project?.workflowStatus || 'N/A'} disabled />
                            </FormItem>
                      </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {(isProcessor || isManager) ? (
                            <FormField
                                control={form.control}
                                name="processorStatus"
                                render={({ field }) => (
                                <FormItem>
                                <FormLabel>Processor Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!isFieldEditable('processorStatus')}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectLabel>In-Progress Statuses</SelectLabel>
                                        {processorActionableStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                      </SelectGroup>
                                      <SelectGroup>
                                        <SelectLabel>Submission Statuses</SelectLabel>
                                        {processorSubmissionStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                      </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                         />
                         ) : null}
                         
                         {(isQA || isManager) && project?.workflowStatus === 'With QA' ? (
                             <FormField
                                control={form.control}
                                name="qaStatus"
                                render={({ field }) => (
                                <FormItem>
                                <FormLabel>QA Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!isFieldEditable('qaStatus')}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                       {qaSubmissionStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                         ) : null}
                       </div>
                       
                        {canQASubmit && (
                            <FormField
                                control={form.control}
                                name="reworkReason"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Rework Reason</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Provide a reason for sending this task back for rework..." {...field} value={field.value || ''} disabled={!isFieldEditable('reworkReason')} />
                                    </FormControl>
                                    <FormDescription>This is only required if you are sending for rework.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                              control={form.control}
                              name="applicationNumber"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Application Number</FormLabel>
                                  <FormControl>
                                      <Input placeholder="US16/123,456" {...field} value={field.value || ''} disabled={!isFieldEditable('applicationNumber')} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name="patentNumber"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Patent Number</FormLabel>
                                  <FormControl>
                                      <Input placeholder="10,123,456" {...field} value={field.value || ''} disabled={!isFieldEditable('patentNumber')} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name="documentName"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Document Name</FormLabel>
                                  <FormControl>
                                      <Input placeholder="Response_To_OA.pdf" {...field} value={field.value || ''} disabled={!isFieldEditable('documentName')} />
                                  </FormControl>
                                  <FormMessage />
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
                                  <Input placeholder="Invention disclosure..." {...field} value={field.value || ''} disabled={!isFieldEditable('subject')}/>
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="actionTaken"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Action Taken</FormLabel>
                              <FormControl>
                                  <Textarea placeholder="Describe the action taken..." {...field} value={field.value || ''} disabled={!isFieldEditable('actionTaken')} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <FormField
                              control={form.control}
                              name="emailDate"
                              render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                  <FormLabel>Email Date</FormLabel>
                                  {isManager ? (
                                      <Popover>
                                          <PopoverTrigger asChild>
                                          <FormControl>
                                              <Button
                                              variant={"outline"}
                                              className={cn(
                                                  "pl-3 text-left font-normal",
                                                  !field.value && "text-muted-foreground",
                                                  !isFieldEditable('emailDate') && "disabled:opacity-100 disabled:cursor-default"
                                              )}
                                              disabled={!isFieldEditable('emailDate')}
                                              >
                                              {field.value ? (
                                                  format(field.value, "PPP")
                                              ) : (
                                                  <span>Pick a date</span>
                                              )}
                                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                              </Button>
                                          </FormControl>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                          <Calendar
                                              mode="single"
                                              selected={field.value}
                                              onSelect={field.onChange}
                                              disabled={(date) =>
                                              date > new Date() || date < new Date("1900-01-01")
                                              }
                                              initialFocus
                                          />
                                          </PopoverContent>
                                      </Popover>
                                  ) : (
                                    <Input value={field.value ? format(new Date(field.value), "PPP") : ''} disabled />
                                  )}
                                  </FormItem>
                          )}
                          />
                          <FormField
                              control={form.control}
                              name="allocationDate"
                              render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                  <FormLabel>Allocation Date</FormLabel>
                                    {isManager ? (
                                      <Popover>
                                          <PopoverTrigger asChild>
                                          <FormControl>
                                              <Button
                                              variant={"outline"}
                                              className={cn(
                                                  "pl-3 text-left font-normal",
                                                  !field.value && "text-muted-foreground",
                                                  !isFieldEditable('allocationDate') && "disabled:opacity-100 disabled:cursor-default"
                                              )}
                                              disabled={!isFieldEditable('allocationDate')}
                                              >
                                              {field.value ? (
                                                  format(field.value, "PPP")
                                              ) : (
                                                  <span>Pick a date</span>
                                              )}
                                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                              </Button>
                                          </FormControl>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                          <Calendar
                                              mode="single"
                                              selected={field.value}
                                              onSelect={field.onChange}
                                              disabled={(date) =>
                                              date > new Date() || date < new Date("1900-01-01")
                                              }
                                              initialFocus
                                          />
                                          </PopoverContent>
                                      </Popover>
                                  ) : (
                                    <Input value={field.value ? format(new Date(field.value), "PPP") : ''} disabled />
                                  )}
                                  </FormItem>
                          )}
                          />
                          <FormField
                          control={form.control}
                          name="processor"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Processor</FormLabel>
                                  {isManager ? (
                                      <Select onValueChange={field.onChange} value={field.value} disabled={!isFieldEditable('processor')}>
                                          <FormControl>
                                          <SelectTrigger>
                                              <SelectValue placeholder="Select a processor" />
                                          </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                              {processors.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                  ) : (
                                      <Input {...field} disabled />
                                  )}
                              </FormItem>
                          )}
                          />
                          <FormField
                          control={form.control}
                          name="qa"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>QA</FormLabel>
                                  {isManager ? (
                                      <Select onValueChange={field.onChange} value={field.value} disabled={!isFieldEditable('qa')}>
                                          <FormControl>
                                          <SelectTrigger>
                                              <SelectValue placeholder="Select a QA" />
                                          </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                              {qas.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                  ) : (
                                      <Input {...field} disabled />
                                  )}
                              </FormItem>
                          )}
                          />
                      </div>
                    </div>
                </CardContent>
              </ScrollArea>
            </Card>
        </form>
      </Form>
    </div>
  )
}

    