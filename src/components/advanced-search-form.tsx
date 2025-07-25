
"use client";

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PlusCircle, Trash2, CalendarIcon, Search } from 'lucide-react';
import { projectStatuses, countries, type ProcessType } from '@/lib/data';
import { format } from 'date-fns';
import type { Project } from '@/lib/data';
import { cn } from '@/lib/utils';

type TextField = keyof Pick<Project, 'ref_number' | 'application_number' | 'patent_number' | 'processor' | 'qa' | 'country' | 'client_name' | 'process' | 'processing_status'>;
type DateField = keyof Pick<Project, 'received_date' | 'allocation_date' | 'processing_date' | 'qa_date'>;
type SearchField = TextField | DateField;

type TextOperator = 'blank' | 'equals' | 'in' | 'startsWith' | 'contains';
type DateOperator = 'dateEquals'; // Simplified for now
type Operator = TextOperator | DateOperator;

export type SearchCriterion = {
  field: SearchField | '';
  operator: Operator | '';
  value: string;
};

export type SearchCriteria = SearchCriterion[];

const textOperators: { value: TextOperator, label: string }[] = [
    { value: 'blank', label: 'is blank' },
    { value: 'equals', label: 'equals' },
    { value: 'in', label: 'in (comma-separated)' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'contains', label: 'contains' },
];

const dateOperators: { value: DateOperator, label: string }[] = [
    { value: 'dateEquals', label: 'on' },
];


interface AdvancedSearchFormProps {
  onSearch: (criteria: SearchCriteria) => void;
  initialCriteria: SearchCriteria | null;
  processors: string[];
  qas: string[];
  clientNames: string[];
  processes: ProcessType[];
}

export function AdvancedSearchForm({ onSearch, initialCriteria, processors, qas, clientNames, processes }: AdvancedSearchFormProps) {
    const searchFields: { value: SearchField, label: string, type: 'text' | 'date' | 'select', options?: string[] }[] = [
        { value: 'ref_number', label: 'Ref Number', type: 'text' },
        { value: 'processor', label: 'Processor', type: 'select', options: processors },
        { value: 'qa', label: 'QA', type: 'select', options: qas },
        { value: 'application_number', label: 'Application No.', type: 'text' },
        { value: 'patent_number', label: 'Patent No.', type: 'text' },
        { value: 'country', label: 'Country', type: 'select', options: countries },
        { value: 'client_name', label: 'Client Name', type: 'select', options: clientNames },
        { value: 'process', label: 'Process', type: 'select', options: processes },
        { value: 'processing_status', label: 'Status', type: 'select', options: projectStatuses },
        { value: 'received_date', label: 'Email Date', type: 'date' },
        { value: 'allocation_date', label: 'Allocation Date', type: 'date' },
        { value: 'processing_date', label: 'Processing Date', type: 'date' },
        { value: 'qa_date', label: 'QA Date', type: 'date' },
    ];


  const { register, control, handleSubmit, watch, setValue, reset } = useForm<{ criteria: SearchCriteria }>({
    defaultValues: {
      criteria: initialCriteria || [{ field: '', operator: '', value: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'criteria',
  });
  
  const onSubmit = (data: { criteria: SearchCriteria }) => {
    // Filter out only completely empty criteria rows, but allow "is blank"
    const validCriteria = data.criteria.filter(c => c.field && c.operator);
    onSearch(validCriteria);
  };

  const handleReset = () => {
    reset({ criteria: [{ field: '', operator: '', value: '' }] });
  }

  return (
    <Card className="border-0 shadow-none">
        <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                {fields.map((item, index) => {
                    const selectedField = watch(`criteria.${index}.field`);
                    const fieldConfig = searchFields.find(f => f.value === selectedField);
                    const isDate = fieldConfig?.type === 'date';
                    const isSelect = fieldConfig?.type === 'select';
                    const operatorValue = watch(`criteria.${index}.operator`);

                    return (
                    <div key={item.id} className="flex items-center gap-2">
                        <Select
                            value={watch(`criteria.${index}.field`) || ""}
                            onValueChange={(value) => {
                                setValue(`criteria.${index}.field`, value as SearchField);
                                setValue(`criteria.${index}.operator`, '');
                                setValue(`criteria.${index}.value`, '');
                            }}
                        >
                            <SelectTrigger className="w-1/4">
                                <SelectValue placeholder="Select a field" />
                            </SelectTrigger>
                            <SelectContent>
                                {searchFields.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select
                            value={operatorValue || ""}
                            onValueChange={(value) => setValue(`criteria.${index}.operator`, value as Operator)}
                            disabled={!selectedField}
                        >
                            <SelectTrigger className="w-1/4">
                                <SelectValue placeholder="Select operator" />
                            </SelectTrigger>
                            <SelectContent>
                                {(isDate ? dateOperators : textOperators).map(op => (
                                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {isDate ? (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-1/2 justify-start text-left font-normal",
                                            !watch(`criteria.${index}.value`) && "text-muted-foreground"
                                        )}
                                        disabled={operatorValue === 'blank'}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {watch(`criteria.${index}.value`) ? format(new Date(watch(`criteria.${index}.value`)), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={watch(`criteria.${index}.value`) ? new Date(watch(`criteria.${index}.value`)) : undefined}
                                        onSelect={(date) => setValue(`criteria.${index}.value`, date ? format(date, 'yyyy-MM-dd') : '')}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        ) : isSelect ? (
                                <Select
                                value={watch(`criteria.${index}.value`) || ""}
                                onValueChange={(value) => setValue(`criteria.${index}.value`, value)}
                                disabled={!fieldConfig || operatorValue === 'blank'}
                            >
                                <SelectTrigger className="w-1/2">
                                    <SelectValue placeholder={`Select ${fieldConfig?.label}`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {fieldConfig?.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                className="w-1/2"
                                placeholder="Enter value"
                                {...register(`criteria.${index}.value`)}
                                disabled={operatorValue === 'blank'}
                            />
                        )}


                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    );
                })}
                </div>

                <div className="flex items-center gap-2 mt-4">
                    <Button type="button" variant="outline" onClick={() => append({ field: '', operator: '', value: '' })}>
                        <PlusCircle className="mr-2" /> Add Criteria
                    </Button>
                    <div className="flex-grow" />
                    <Button type="button" variant="ghost" onClick={handleReset}>
                        Reset Form
                    </Button>
                    <Button type="submit">
                        <Search className="mr-2" /> Search
                    </Button>
                </div>
            </form>
        </CardContent>
    </Card>
  );
}
