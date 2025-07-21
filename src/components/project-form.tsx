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
import { type Project, processors, qas, type ProjectStatus } from "@/lib/data"
import { Textarea } from "./ui/textarea"

const formSchema = z.object({
  id: z.string().optional(),
  refNumber: z.string().min(1, "Reference number is required."),
  applicationNumber: z.string().min(1, "Application number is required."),
  patentNumber: z.string().optional(),
  emailDate: z.date({ required_error: "Email date is required." }),
  allocationDate: z.date({ required_error: "Allocation date is required." }),
  processor: z.string().min(1, "Processor is required."),
  qa: z.string().min(1, "QA is required."),
  status: z.enum(["Pending", "Processing", "QA", "Complete", "On Hold"]),
  submitAction: z.enum(['save', 'process', 'qa_complete'])
})

type ProjectFormValues = z.infer<typeof formSchema>

interface ProjectFormProps {
  project?: Project;
  onFormSubmit: (project: Project) => void;
  setOpen: (open: boolean) => void;
}

export function ProjectForm({ project, onFormSubmit, setOpen }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultValues: Partial<ProjectFormValues> = {
    id: project?.id,
    refNumber: project?.refNumber || "",
    applicationNumber: project?.applicationNumber || "",
    patentNumber: project?.patentNumber || "",
    emailDate: project ? new Date(project.emailDate) : undefined,
    allocationDate: project ? new Date(project.allocationDate) : undefined,
    processor: project?.processor || "",
    qa: project?.qa || "",
    status: project?.status || "Pending",
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  async function onSubmit(data: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      const result = await saveProject(data);
      onFormSubmit(result);
      setOpen(false);
    } catch (error) {
      console.error("Failed to save project", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="refNumber"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Reference Number</FormLabel>
                <FormControl>
                    <Input placeholder="REF001" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="applicationNumber"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Application Number</FormLabel>
                <FormControl>
                    <Input placeholder="US16/123,456" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={form.control}
          name="patentNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Patent Number (optional)</FormLabel>
              <FormControl>
                <Input placeholder="10,123,456" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="emailDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Email Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="allocationDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Allocation Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="processor"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Processor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a processor" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {processors.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a QA person" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {qas.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="QA">QA</SelectItem>
                        <SelectItem value="Complete">Complete</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        
        <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" onClick={form.handleSubmit(d => onSubmit({...d, submitAction: 'save'}))} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
            {project?.status === "Processing" && (
                <Button type="submit" onClick={form.handleSubmit(d => onSubmit({...d, submitAction: 'process'}))} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit for QA
                </Button>
            )}
            {project?.status === "QA" && (
                <Button type="submit" onClick={form.handleSubmit(d => onSubmit({...d, submitAction: 'qa_complete'}))} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    QA Complete
                </Button>
            )}
        </div>
      </form>
    </Form>
  )
}
