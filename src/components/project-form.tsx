"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"

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
import { type Project, processors, qas } from "@/lib/data"
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"

const formSchema = z.object({
  id: z.string().optional(),
  refNumber: z.string().min(1, "Reference number is required."),
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
  role: 'Processor' | 'QA' | 'Admin' | 'Manager';
}

export function ProjectForm({ project, onFormSubmit, onCancel, role }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    // This key ensures the form re-initializes when the project changes
    key: project?.id || 'new',
  })

  React.useEffect(() => {
    if (project) {
        form.reset({
            id: project.id,
            refNumber: project.refNumber || "",
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
        form.reset({});
    }
  }, [project, form]);
  
  if (!project) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>No Task Selected</CardTitle>
                <CardDescription>Select a task from the list below to begin.</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  async function onSubmit(data: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      const result = await saveProject(data);
      onFormSubmit(result);
    } catch (error) {
      console.error("Failed to save project", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isProcessor = role === 'Processor';
  const isQA = role === 'QA';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Task: {project.refNumber}</CardTitle>
        <CardDescription>Subject: {project.subject}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="applicationNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Application Number</FormLabel>
                        <FormControl>
                            <Input placeholder="US16/123,456" {...field} disabled={!isProcessor} />
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
                            <Input placeholder="10,123,456" {...field} disabled={!isProcessor} />
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
                            <Input placeholder="Response_To_OA.pdf" {...field} disabled={!isProcessor} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="actionTaken"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Action Taken</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Describe the action taken..." {...field} disabled={!isProcessor} />
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
                        <Input value={format(field.value, "PPP")} disabled />
                        </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="allocationDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Allocation Date</FormLabel>
                        <Input value={format(field.value, "PPP")} disabled />
                        </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="processor"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Processor</FormLabel>
                    <Input {...field} disabled />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="qa"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>QA</FormLabel>
                    <Input {...field} disabled />
                    </FormItem>
                )}
                />
            </div>

            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isProcessor && !isQA}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {isProcessor && <SelectItem value="Processing">Done</SelectItem>}
                            {isQA && <SelectItem value="QA">QA Complete</SelectItem>}
                            <SelectItem value="On Hold">On Hold</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            
            <div className="flex justify-end space-x-2 pt-4">
                {onCancel && <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
                
                {isProcessor && project.status === "Processing" && (
                    <Button type="submit" onClick={form.handleSubmit(d => onSubmit({...d, status: 'QA', submitAction: 'process'}))} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit for QA
                    </Button>
                )}
                {isQA && project.status === "QA" && (
                     <Button type="submit" onClick={form.handleSubmit(d => onSubmit({...d, status: 'Complete', submitAction: 'qa_complete'}))} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        QA Complete
                    </Button>
                )}
                 <Button type="submit" onClick={form.handleSubmit(d => onSubmit({...d, submitAction: 'save'}))} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
