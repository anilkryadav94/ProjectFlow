
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
} from "@/components/ui/select"
import { saveProject } from "@/app/actions"
import { type Project, processors, qas, clientNames, processes, type Role } from "@/lib/data"
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { MultiMattersForm } from "./multi-matters-form"
import { ScrollArea } from "./ui/scroll-area"

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
  status: z.enum(["Pending", "Processing", "QA", "Complete", "On Hold"]),
  subject: z.string().optional(),
  actionTaken: z.string().optional(),
  documentName: z.string().optional(),
  submitAction: z.enum(['save', 'process', 'qa_complete'])
})

type ProjectFormValues = z.infer<typeof formSchema>

interface ProjectFormProps {
  project?: Project | null;
  onFormSubmit: (project: Project) => void;
  onCancel?: () => void;
  role: Role;
  setOpen?: (open: boolean) => void;
}

export function ProjectForm({ project, onFormSubmit, onCancel, role, setOpen }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isMMFormOpen, setIsMMFormOpen] = React.useState(false);
  
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    // This key ensures the form re-initializes when the project changes
    key: project?.id || 'new',
    defaultValues: {
      id: project?.id,
      refNumber: project?.refNumber || "",
      applicationNumber: project?.applicationNumber || "",
      patentNumber: project?.patentNumber || "",
      subject: project?.subject || "",
      actionTaken: project?.actionTaken || "",
      documentName: project?.documentName || "",
      processor: project?.processor || "",
      qa: project?.qa || "",
      status: project?.status || "Pending",
      emailDate: project ? new Date(project.emailDate) : new Date(),
      allocationDate: project ? new Date(project.allocationDate) : new Date(),
      clientName: project?.clientName || clientNames[0],
      process: project?.process || "Patent",
    }
  })

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
            status: project.status || "Pending",
            subject: project.subject || "",
            actionTaken: project.actionTaken || "",
            documentName: project.documentName || "",
        });
    } else {
        form.reset({
            refNumber: "",
            applicationNumber: "",
            patentNumber: "",
            subject: "",
            actionTaken: "",
            documentName: "",
            processor: "",
            qa: "",
            status: "Pending",
            emailDate: new Date(),
            allocationDate: new Date(),
            clientName: clientNames[0],
            process: "Patent",
        });
    }
  }, [project, form]);
  
  if (!project && (role === 'Processor' || role === 'QA')) {
    return (
        <div className="animated-border shadow-xl h-full">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-xl">No Task in Queue</CardTitle>
                    <CardDescription>You have no pending tasks. New tasks will appear here when assigned.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }

  async function onSubmit(data: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      const result = await saveProject(data);
      onFormSubmit(result);
      if(setOpen) setOpen(false);
    } catch (error) {
      console.error("Failed to save project", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isProcessor = role === 'Processor';
  const isQA = role === 'QA';
  const isManager = role === 'Manager' || role === 'Admin';
  
  const isFieldEditable = (fieldName: string) => {
    if (isManager) return true;
    if (isProcessor) {
        return ['applicationNumber', 'patentNumber', 'documentName', 'actionTaken', 'status'].includes(fieldName);
    }
     if (isQA) {
        return ['status'].includes(fieldName);
    }
    return false;
  }

  return (
    <div className="animated-border shadow-xl h-full">
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="h-full flex flex-col">
            <Card className="border-0 shadow-none flex flex-col flex-grow h-full">
              <CardHeader className="bg-muted p-3 flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg">{project ? `Task: ${project.refNumber}`: 'New Project'}</CardTitle>
                    {project && <CardDescription className="text-xs">Subject: {project.subject}</CardDescription>}
                </div>
                <div className="flex items-center space-x-2">
                    {onCancel && <Button size="sm" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}

                    {project && (
                        <Dialog open={isMMFormOpen} onOpenChange={setIsMMFormOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" disabled={isSubmitting}>
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
                    
                    {isProcessor && project?.status === "Processing" && (
                        <Button size="sm" type="submit" onClick={form.handleSubmit(d => onSubmit({...d, submitAction: 'process'}))} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit for QA
                        </Button>
                    )}
                    {isQA && project?.status === "QA" && (
                        <Button size="sm" type="submit" onClick={form.handleSubmit(d => onSubmit({...d, submitAction: 'qa_complete'}))} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            QA Complete
                        </Button>
                    )}
                    <Button size="sm" type="submit" onClick={form.handleSubmit(d => onSubmit({...d, submitAction: 'save'}))} disabled={isSubmitting || (isProcessor && project?.status !== 'Processing') || (isQA && project?.status !== 'QA')}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isManager && !project ? 'Create Project' : 'Save Changes'}
                    </Button>
                </div>
              </CardHeader>
              <ScrollArea className="flex-grow">
                <CardContent className="p-4">
                    <div className="space-y-4">
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
                          {project && <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!isFieldEditable('status')}>
                                  <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      <SelectItem value="Pending" disabled={!isManager}>Pending</SelectItem>
                                      <SelectItem value="Processing" disabled={!isManager}>Processing</SelectItem>
                                      <SelectItem value="QA" disabled={!isManager}>QA</SelectItem>
                                      <SelectItem value="Complete" disabled={!isManager}>Complete</SelectItem>
                                      
                                      <SelectItem value="On Hold" disabled={!isProcessor && !isQA && !isManager}>On Hold</SelectItem>
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                              </FormItem>
                          )}
                          />}
                      </div>
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
                                  <Input placeholder="Invention disclosure..." {...field} disabled={!isFieldEditable('subject')}/>
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
                                    <Input value={field.value ? format(field.value, "PPP") : ''} disabled />
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
                                    <Input value={field.value ? format(field.value, "PPP") : ''} disabled />
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
