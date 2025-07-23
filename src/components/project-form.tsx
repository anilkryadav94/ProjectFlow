
"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, Save, Rows } from "lucide-react"
import { format } from "date-fns"
import { saveProject } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { Project, Role } from "@/lib/data"
import { processors, qas, clientNames, processes, processorStatuses, qaStatuses, processorSubmissionStatuses, qaSubmissionStatuses } from "@/lib/data"
import { useRouter } from "next/navigation"
import { ProjectEntriesDialog } from "./project-entries-dialog"

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
    refNumber: z.string().min(1, "Ref Number is required."),
    clientName: z.string().min(1, "Client Name is required."),
    process: z.enum(["Patent", "TM", "IDS", "Project"]),
    applicationNumber: z.string().nullable(),
    patentNumber: z.string().nullable(),
    emailDate: z.string(),
    allocationDate: z.string(),
    processor: z.string(),
    qa: z.string(),
    processorStatus: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]),
    qaStatus: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]),
    reworkReason: z.string().nullable(),
    subject: z.string().min(1, "Subject is required."),
    processingDate: z.string().nullable(),
    qaDate: z.string().nullable(),
    workflowStatus: z.enum(['Pending Allocation', 'With Processor', 'With QA', 'Completed']),
    entries: z.array(projectEntrySchema).optional(),
});


type ProjectFormValues = z.infer<typeof formSchema>

interface ProjectFormProps {
  project: Project
  userRole: Role
  nextProjectId: string | null;
  filteredIds?: string;
}

export function ProjectForm({ project, userRole, nextProjectId, filteredIds }: ProjectFormProps) {
  const { toast } = useToast()
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitAction, setSubmitAction] = React.useState<'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework' | null>(null);
  const [isEntriesDialogOpen, setIsEntriesDialogOpen] = React.useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...project,
      emailDate: project.emailDate ? format(new Date(new Date(project.emailDate).getTime() + (new Date(project.emailDate).getTimezoneOffset() * 60000)), "yyyy-MM-dd") : "",
      allocationDate: project.allocationDate ? format(new Date(new Date(project.allocationDate).getTime() + (new Date(project.allocationDate).getTimezoneOffset() * 60000)), "yyyy-MM-dd") : "",
      entries: project.entries ?? [],
    },
  })

  // Reset form when project changes
  React.useEffect(() => {
    form.reset({
      ...project,
      emailDate: project.emailDate ? format(new Date(new Date(project.emailDate).getTime() + (new Date(project.emailDate).getTimezoneOffset() * 60000)), "yyyy-MM-dd") : "",
      allocationDate: project.allocationDate ? format(new Date(new Date(project.allocationDate).getTime() + (new Date(project.allocationDate).getTimezoneOffset() * 60000)), "yyyy-MM-dd") : "",
      entries: project.entries ?? [],
    });
  }, [project, form]);


  const handleFormSubmit = async (action: 'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework') => {
    setSubmitAction(action);
    await form.handleSubmit(async (data) => {
      setIsSubmitting(true);
      try {
        const nextUrl = nextProjectId 
          ? `/task/${nextProjectId}?role=${userRole}${filteredIds ? `&filteredIds=${filteredIds}`: ''}` 
          : `/?role=${userRole}`;
          
        await saveProject(data, action);
        
        toast({
          title: "Success",
          description: `Project has been ${action === 'save' ? 'saved' : 'submitted'}.`,
        });
        
        router.push(nextUrl);
        router.refresh();

      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to save the project. ${error instanceof Error ? error.message : ''}`,
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false);
        setSubmitAction(null);
      }
    })();
  }
  
  const isProcessorView = userRole === 'Processor' && project.workflowStatus === 'With Processor';
  const isQaView = userRole === 'QA' && project.workflowStatus === 'With QA';
  const isManagerView = userRole === 'Manager';
  const isAdminView = userRole === 'Admin';
  const isReadOnly = !isProcessorView && !isQaView && !isManagerView && !isAdminView;

  return (
    <>
      <ProjectEntriesDialog
        isOpen={isEntriesDialogOpen}
        onOpenChange={setIsEntriesDialogOpen}
        entries={form.watch('entries') ?? []}
        onSaveChanges={(updatedEntries) => {
          form.setValue('entries', updatedEntries);
        }}
        projectSubject={project.subject}
      />
      <div className="animated-border shadow-xl h-full">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="h-full flex flex-col">
              <Card className="border-0 shadow-none flex flex-col flex-grow h-full">
                  <CardHeader>
                      <div className="flex justify-between items-start">
                          <div>
                              <CardTitle>{project.refNumber}</CardTitle>
                              <CardDescription>
                                  {project.subject}
                              </CardDescription>
                          </div>
                          {isProcessorView && (
                              <Button variant="outline" onClick={() => setIsEntriesDialogOpen(true)}>
                                  <Rows className="mr-2 h-4 w-4" />
                                  Add/View Entries
                              </Button>
                          )}
                      </div>
                  </CardHeader>
                  <CardContent className="flex-grow overflow-y-auto">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Column 1 */}
                      <div className="space-y-4">
                        <FormField control={form.control} name="refNumber" render={({ field }) => (<FormItem><FormLabel>Ref Number</FormLabel><FormControl><Input {...field} disabled={!isAdminView && !isManagerView} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Client Name</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isAdminView && !isManagerView}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{clientNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="process" render={({ field }) => (<FormItem><FormLabel>Process</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isAdminView && !isManagerView}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{processes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Textarea {...field} disabled={!isAdminView && !isManagerView} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="applicationNumber" render={({ field }) => (<FormItem><FormLabel>Application No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!isAdminView && !isManagerView} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="patentNumber" render={({ field }) => (<FormItem><FormLabel>Patent No.</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled={!isAdminView && !isManagerView} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      {/* Column 2 */}
                      <div className="space-y-4">
                        <FormField control={form.control} name="emailDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Email Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("font-normal", !field.value && "text-muted-foreground")} disabled={!isAdminView && !isManagerView}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="allocationDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Allocation Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("font-normal", !field.value && "text-muted-foreground")} disabled={!isAdminView && !isManagerView}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="processor" render={({ field }) => (<FormItem><FormLabel>Processor</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isAdminView && !isManagerView}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{processors.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="qa" render={({ field }) => (<FormItem><FormLabel>QA</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isAdminView && !isManagerView}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{qas.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        {(isProcessorView || isManagerView || isAdminView || project.processorStatus !== 'Pending') && <FormField control={form.control} name="processorStatus" render={({ field }) => (<FormItem><FormLabel>Processor Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isProcessorView}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{(isProcessorView ? processorSubmissionStatuses : processorStatuses).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                        {(isQaView || isManagerView || isAdminView || project.qaStatus !== 'Pending') && <FormField control={form.control} name="qaStatus" render={({ field }) => (<FormItem><FormLabel>QA Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!isQaView}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{(isQaView ? qaSubmissionStatuses : qaStatuses).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                        {project.reworkReason && <FormItem><FormLabel>Rework Reason</FormLabel><Textarea value={project.reworkReason} readOnly className="h-24 bg-destructive/10 border-destructive" /></FormItem>}
                        {isQaView && <FormField control={form.control} name="reworkReason" render={({ field }) => (<FormItem><FormLabel>Rework Reason (if sending back)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} disabled={!isQaView} /></FormControl><FormMessage /></FormItem>)} />}
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardHeader className="border-t mt-auto">
                      <div className="flex justify-end gap-2">
                          <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleFormSubmit('save')}
                              disabled={isSubmitting || isReadOnly}
                          >
                              {isSubmitting && submitAction === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              <Save className="mr-2 h-4 w-4" /> Save &amp; Next
                          </Button>

                          {isProcessorView && (
                              <Button
                                  type="button"
                                  onClick={() => handleFormSubmit('submit_for_qa')}
                                  disabled={isSubmitting}
                              >
                                  {isSubmitting && submitAction === 'submit_for_qa' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Submit for QA &amp; Next
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
                                      Submit &amp; Next
                                  </Button>
                              </>
                          )}
                      </div>
                  </CardHeader>
              </Card>
          </form>
        </Form>
      </div>
    </>
  )
}
