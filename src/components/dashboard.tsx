
"use client";

import * as React from 'react';
import Papa from "papaparse";
import { type Project, type Role, type User, roleHierarchy, processors, qas, projectStatuses, clientNames, processes, processorActionableStatuses, processorSubmissionStatuses, qaSubmissionStatuses, workflowStatuses, allProcessorStatuses, allQaStatuses } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { getColumns, allColumns } from '@/components/columns';
import { Header } from '@/components/header';
import { UserManagementTable } from './user-management-table';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileUp, Loader2, Upload, X, Download, FileDown, Rows, Save, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { AdvancedSearchForm, type SearchCriteria } from './advanced-search-form';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { EditProjectDialog } from './edit-project-dialog';
import { AddRowsDialog } from './add-rows-dialog';
import { bulkUpdateProjects } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { addRows } from '@/lib/data';
import { ColumnSelectDialog } from './column-select-dialog';
import { differenceInBusinessDays } from 'date-fns';

interface DashboardProps {
  user: User;
  initialProjects: Project[];
}

export function DashboardWrapper(props: DashboardProps) {
    return <Dashboard {...props} />;
}


export type SearchableColumn = 'any' | 'ref_number' | 'application_number' | 'patent_number' | 'subject_line' | 'processing_status' | 'qa_status' | 'workflowStatus' | 'allocation_date' | 'received_date';

const bulkUpdateFields = [
    { value: 'processor', label: 'Processor', options: processors },
    { value: 'qa', label: 'QA', options: qas },
] as const;


function Dashboard({ 
  user, 
  initialProjects,
}: DashboardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [activeRole, setActiveRole] = React.useState<Role | null>(null);
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [search, setSearch] = React.useState('');
  const [searchColumn, setSearchColumn] = React.useState<SearchableColumn>('any');
  
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'asc' });
  
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [bulkUpdateField, setBulkUpdateField] = React.useState<(typeof bulkUpdateFields)[number]['value']>('processor');
  const [bulkUpdateValue, setBulkUpdateValue] = React.useState('');
  const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);

  const [searchCriteria, setSearchCriteria] = React.useState<SearchCriteria | null>(null);
  const [filteredProjects, setFilteredProjects] = React.useState<Project[] | null>(null);

  const [clientNameFilter, setClientNameFilter] = React.useState('all');
  const [processFilter, setProcessFilter] = React.useState<string | 'all'>('all');

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);

  const [isAddRowsDialogOpen, setIsAddRowsDialogOpen] = React.useState(false);
  const [sourceProject, setSourceProject] = React.useState<Project | null>(null);

  const [isColumnSelectOpen, setIsColumnSelectOpen] = React.useState(false);

  const defaultProcessorQAColumns = [
    'actions', 'row_number', 'ref_number', 'client_name', 'process', 'processor', 'sender', 'subject_line', 'received_date', 'case_manager', 'allocation_date', 'processing_date', 'processing_status', 'qa_status', 'workflowStatus'
  ];
  
  const defaultCaseManagerColumns = [
      'actions', 'row_number', 'ref_number', 'application_number', 'country', 'patent_number', 'sender', 'subject_line', 'client_query_description', 'client_comments', 'clientquery_status', 'client_error_description', 'case_manager', 'qa_date', 'client_response_date'
  ];

  const defaultManagerAdminColumns = [
      'select', 'actions', 'row_number', 'ref_number', 'client_name', 'process', 'processor', 'qa', 'case_manager', 'workflowStatus', 'processing_status', 'qa_status', 'received_date', 'allocation_date', 'processing_date', 'qa_date'
  ];

  const [visibleColumnKeys, setVisibleColumnKeys] = React.useState<string[]>(defaultProcessorQAColumns);
  
  const { toast } = useToast();
  
  const refreshProjects = () => {
    window.location.reload();
  };
  
  const isManagerOrAdmin = React.useMemo(() => activeRole === 'Manager' || activeRole === 'Admin', [activeRole]);

  React.useEffect(() => {
    const highestRole = roleHierarchy.find(role => user.roles.includes(role)) || user.roles[0];
    const urlRole = searchParams.get('role') as Role | null;
    const newActiveRole = urlRole && user.roles.includes(urlRole) ? urlRole : highestRole;

    if (newActiveRole !== activeRole) {
        setActiveRole(newActiveRole);
        loadColumnLayout(newActiveRole);
        const currentUrlRole = searchParams.get('role');
        if (currentUrlRole !== newActiveRole) {
             router.replace(`/?role=${newActiveRole}`, { scroll: false });
        }
    }
  }, [user.roles, router, activeRole, searchParams]);
  
  React.useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);
  
  const loadColumnLayout = (role: Role) => {
    const savedLayout = localStorage.getItem(`columnLayout-${role}`);
    if (savedLayout) {
        setVisibleColumnKeys(JSON.parse(savedLayout));
    } else {
        if (role === 'Processor' || role === 'QA') {
            setVisibleColumnKeys(defaultProcessorQAColumns);
        } else if (role === 'Case Manager') {
            setVisibleColumnKeys(defaultCaseManagerColumns);
        } else if (role === 'Admin' || role === 'Manager') {
            setVisibleColumnKeys(defaultManagerAdminColumns);
        }
    }
  };

  const saveColumnLayout = () => {
    if (activeRole) {
        localStorage.setItem(`columnLayout-${activeRole}`, JSON.stringify(visibleColumnKeys));
        toast({
            title: "Layout Saved",
            description: `Your column layout for the ${activeRole} role has been saved.`,
        });
    }
  };


  const handleDownload = () => {
    const dataToExport = dashboardProjects;
    if (dataToExport.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `projects_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpdate = async () => {
    const projectIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    if (projectIds.length === 0 || !bulkUpdateField || !bulkUpdateValue) {
        toast({ title: "Bulk Update Error", description: "Please select rows, a field, and a value.", variant: "destructive" });
        return;
    }
    
    setIsBulkUpdating(true);
    try {
        await bulkUpdateProjects({ projectIds, field: bulkUpdateField, value: bulkUpdateValue });
        toast({ title: "Success", description: `${projectIds.length} projects have been updated.` });
        window.location.reload();
        setRowSelection({});
        setBulkUpdateValue('');
    } catch(e) {
        toast({ title: "Error", description: "Failed to update projects.", variant: "destructive"});
    } finally {
        setIsBulkUpdating(false);
    }
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setSelectedFile(file);
    }
    event.target.value = '';
  }

  const handleProcessUpload = async () => {
    if (!selectedFile) {
        toast({ title: "No file selected", description: "Please select a CSV file to upload.", variant: "destructive" });
        return;
    }
    setIsUploading(true);

    Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const rows = results.data as any[];
            if (rows.length === 0) {
                toast({ title: "Upload Error", description: "CSV file is empty or malformed.", variant: "destructive" });
                setIsUploading(false);
                return;
            }

            const projectsToAdd: Partial<Project>[] = rows
                .filter(row => row.client_name || row.subject_line)
                .map(row => {
                    const sanitizedRow: { [key: string]: any } = {};
                    for (const key in row) {
                        if (Object.prototype.hasOwnProperty.call(row, key)) {
                            // Ensure row_number is not copied from CSV
                            if (key === 'row_number' || key === 'id') continue;
                            sanitizedRow[key] = row[key] === undefined || row[key] === '' ? null : row[key];
                        }
                    }
                    return sanitizedRow;
                });

            try {
                const result = await addRows(projectsToAdd);
                if (result.success) {
                    toast({
                        title: "Bulk Add Complete",
                        description: `${result.addedCount} projects have been added.`,
                    });
                    window.location.reload();
                } else {
                    throw new Error(result.error || "An unknown error occurred during upload.");
                }

            } catch(e) {
                 toast({ title: "Upload Error", description: `Failed to add projects to database. ${e instanceof Error ? e.message : ''}`, variant: "destructive" });
            } finally {
                setIsUploading(false);
                setSelectedFile(null);
            }
        },
        error: (error: any) => {
            toast({ title: "Parsing Error", description: error.message, variant: "destructive" });
            setIsUploading(false);
        }
    });
  }

  const handleAdvancedSearch = (criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
    setSearch(''); // Clear quick search

    let results = [...projects];
    
    if (criteria.length > 0 && criteria.some(c => c.value || c.operator === 'blank')) {
        results = results.filter(project => {
          return criteria.every(criterion => {
            if (!criterion.field || !criterion.operator) return true;
            
            const fieldValue = project[criterion.field as keyof Project] as string | null | undefined;

            if (criterion.operator === 'blank') {
                return !fieldValue;
            }
            if (!criterion.value) return true;

            switch (criterion.operator) {
                case 'equals':
                    return fieldValue?.toLowerCase() === criterion.value.toLowerCase();
                case 'in':
                    const values = criterion.value.split(',').map(v => v.trim().toLowerCase());
                    return fieldValue ? values.includes(fieldValue.toLowerCase()) : false;
                case 'startsWith':
                    return fieldValue?.toLowerCase().startsWith(criterion.value.toLowerCase()) ?? false;
                case 'contains':
                    return fieldValue?.toLowerCase().includes(criterion.value.toLowerCase()) ?? false;
                case 'dateEquals':
                     if (!fieldValue) return false;
                     const projectDate = new Date(fieldValue.replaceAll('-', '/'));
                     const filterDate = new Date(criterion.value.replaceAll('-', '/'));
                     return projectDate.toDateString() === filterDate.toDateString();
                default:
                    return true;
            }
          });
        });
    }
    setFilteredProjects(results);
  };
  
  const handleQuickSearch = () => {
    setSearchCriteria(null); // Clear advanced search
    if (search.trim() === '') {
      setFilteredProjects(null);
      return;
    }
    
    let results = [...projects];
    const lowercasedSearch = search.toLowerCase();

    if (searchColumn === 'any') {
      results = results.filter(p => 
        Object.values(p).some(val => String(val).toLowerCase().includes(lowercasedSearch))
      );
    } else {
      results = results.filter(p => 
        (p[searchColumn] as string)?.toString().toLowerCase().includes(lowercasedSearch)
      );
    }
    setFilteredProjects(results);
  };

  const handleResetAdvancedSearch = () => {
      setSearchCriteria(null);
      setFilteredProjects(null);
      setSearch('');
  }
  
  const handleOpenEditDialog = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  };
  
  const handleAddRowsDialog = (project: Project) => {
    setSourceProject(project);
    setIsAddRowsDialogOpen(true);
  }

  const handleDownloadSample = () => {
    const headers = "case_manager,manager_name,processor,sender,received_date,allocation_date,process,client_name,rework_reason,client_error_description,subject_line";
    const sampleData = `CM Alice,Manager User,Alice,sender@example.com,2024-01-01,2024-01-02,Patent,Client A,,,"Sample Subject 1"`;
    const csvContent = `${headers}\n${sampleData}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sample_projects.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const dashboardProjects = React.useMemo(() => {
    let baseProjects: Project[];

    if (filteredProjects) {
        baseProjects = filteredProjects;
    } else if (isManagerOrAdmin && search.trim() !== '') {
        const lowercasedSearch = search.toLowerCase();
        if (searchColumn === 'any') {
            baseProjects = projects.filter(p => 
                Object.values(p).some(val => String(val).toLowerCase().includes(lowercasedSearch))
            );
        } else {
            baseProjects = projects.filter(p => 
                (p[searchColumn] as string)?.toString().toLowerCase().includes(lowercasedSearch)
            );
        }
    } else {
        baseProjects = [...projects];
    }
    
    let filtered = baseProjects;
    
    // Apply role-based filters first if not a manager/admin
    if (activeRole === 'Processor') {
        filtered = filtered.filter(p => 
            p.processor === user.name && 
            (['Pending', 'Re-Work', 'On Hold'].includes(p.processing_status) || !p.processing_status)
        );
    } else if (activeRole === 'QA') {
        filtered = filtered.filter(p => 
            p.qa === user.name &&
            ['Processed', 'Already Processed', 'NTP', 'Client Query'].includes(p.processing_status) &&
            (['Pending', 'On Hold'].includes(p.qa_status) || !p.qa_status)
        );
    } else if (activeRole === 'Case Manager') {
        filtered = filtered.filter(p =>
            p.case_manager === user.name &&
            p.qa_status === 'Client Query' &&
            p.clientquery_status === null
        );
    }

    // Then apply UI filters if they are active
    if (search && !isManagerOrAdmin) {
        const effectiveSearchColumn = activeRole === 'Case Manager' ? 'any' : searchColumn;
        const lowercasedSearch = search.toLowerCase();
        
        if (effectiveSearchColumn === 'any') {
            filtered = filtered.filter(p => 
                Object.values(p).some(val => String(val).toLowerCase().includes(lowercasedSearch))
            );
        } else {
            filtered = filtered.filter(p => 
                (p[effectiveSearchColumn] as string)?.toString().toLowerCase().includes(lowercasedSearch)
            );
        }
    }

    if (clientNameFilter !== 'all' && !(activeRole === 'Manager' || activeRole === 'Admin')) {
        filtered = filtered.filter(p => p.client_name === clientNameFilter);
    }
    
    if (processFilter !== 'all' && !(activeRole === 'Manager' || activeRole === 'Admin')) {
        filtered = filtered.filter(p => p.process === processFilter);
    }
    
    if (sort && filtered) {
      filtered.sort((a, b) => {
        const valA = a[sort.key];
        const valB = b[sort.key];
        if (valA === null || valA === undefined) return 1; 
        if (valB === null || valB === undefined) return -1;
        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [activeRole, user.name, projects, search, searchColumn, sort, filteredProjects, clientNameFilter, processFilter, isManagerOrAdmin]);

  const clientWorkStatus = React.useMemo(() => {
    const statusByClient: Record<string, {
        pendingProcessing: number;
        processedToday: number;
        pendingQA: number;
        clientQuery: number;
        completedToday: number;
    }> = {};

    const today = new Date().toISOString().split('T')[0];

    for (const client of clientNames) {
        statusByClient[client] = {
            pendingProcessing: 0,
            processedToday: 0,
            pendingQA: 0,
            clientQuery: 0,
            completedToday: 0,
        };
    }

    for (const project of projects) {
        if (!statusByClient[project.client_name]) {
             statusByClient[project.client_name] = {
                pendingProcessing: 0,
                processedToday: 0,
                pendingQA: 0,
                clientQuery: 0,
                completedToday: 0,
            };
        }

        // Processing status
        if (['Pending', 'On Hold', 'Re-Work'].includes(project.processing_status)) {
            statusByClient[project.client_name].pendingProcessing++;
        }
        if (project.processing_date === today) {
            statusByClient[project.client_name].processedToday++;
        }

        // QA status
        if (project.qa_status === 'Pending' && project.workflowStatus === 'With QA') {
            statusByClient[project.client_name].pendingQA++;
        }
        if (project.qa_status === 'Client Query') {
            statusByClient[project.client_name].clientQuery++;
        }
        if (project.qa_date === today && project.qa_status === 'Complete') {
             statusByClient[project.client_name].completedToday++;
        }
    }

    return Object.entries(statusByClient).map(([client, status]) => ({ client, ...status }));
  }, [projects]);
  
  const caseManagerTatInfo = React.useMemo(() => {
    if (activeRole !== 'Case Manager') return null;

    const outsideTatCount = dashboardProjects.filter(p => {
        if (!p.qa_date) return false;
        // The difference in business days between the current date and the QA date.
        const daysDiff = differenceInBusinessDays(new Date(), new Date(p.qa_date));
        return daysDiff > 3;
    }).length;

    const greeting = new Date().getHours() < 17 ? "Good Morning" : "Good Evening";

    return {
        count: outsideTatCount,
        greeting: `Hi ${user.name}, ${greeting}!`,
        plural: outsideTatCount === 1 ? 'Email' : 'Emails',
    };
  }, [activeRole, dashboardProjects, user.name]);


  if (!activeRole) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const columns = getColumns(
      isManagerOrAdmin,
      activeRole,
      rowSelection, 
      setRowSelection, 
      dashboardProjects,
      handleOpenEditDialog,
      handleAddRowsDialog,
      visibleColumnKeys
  );
  const selectedBulkUpdateField = bulkUpdateFields.find(f => f.value === bulkUpdateField);

  // When to show the data table vs the accordions for manager
  const showDataTable = filteredProjects !== null || (isManagerOrAdmin && search.trim() !== '');
  const showManagerAccordions = isManagerOrAdmin && !showDataTable;

  // When to show the sub-header with column/layout controls
  const showSubHeader = 
    (activeRole === 'Processor' || activeRole === 'QA' || activeRole === 'Case Manager') || 
    (isManagerOrAdmin && showDataTable);


  return (
    <div className="flex flex-col h-screen bg-background w-full">
         <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".csv"
        />
        {editingProject && (
             <EditProjectDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                project={editingProject}
                onUpdateSuccess={refreshProjects}
                userRole={activeRole}
                projectQueue={dashboardProjects}
                onNavigate={setEditingProject}
            />
        )}
        {sourceProject && (
          <AddRowsDialog
            isOpen={isAddRowsDialogOpen}
            onOpenChange={setIsAddRowsDialogOpen}
            sourceProject={sourceProject}
            onAddRowsSuccess={refreshProjects}
          />
        )}
        <ColumnSelectDialog
            isOpen={isColumnSelectOpen}
            onOpenChange={setIsColumnSelectOpen}
            allColumns={allColumns}
            visibleColumns={visibleColumnKeys}
            setVisibleColumns={setVisibleColumnKeys}
        />

        <Header 
            user={user}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            search={search}
            setSearch={setSearch}
            searchColumn={searchColumn}
            setSearchColumn={setSearchColumn}
            isManagerOrAdmin={isManagerOrAdmin}
            hasSearchResults={filteredProjects !== null}
            onResetSearch={handleResetAdvancedSearch}
            onQuickSearch={handleQuickSearch}
            clientNameFilter={clientNameFilter}
            setClientNameFilter={setClientNameFilter}
            processFilter={processFilter}
            setProcessFilter={setProcessFilter}
            clientNames={clientNames}
            processes={processes}
        />
        {showSubHeader && (
            <div className="flex-shrink-0 border-b bg-muted">
                <div className="flex items-center justify-end gap-2 py-1 px-4">
                     {activeRole === 'Case Manager' ? (
                        <div className="flex-grow text-left text-sm font-semibold text-muted-foreground">
                            {dashboardProjects.length > 0 && caseManagerTatInfo && (
                                <>
                                    <span>{caseManagerTatInfo.greeting} </span>
                                    {caseManagerTatInfo.count > 0 && (
                                        <span>{`${caseManagerTatInfo.count} ${caseManagerTatInfo.plural} Identified Outside TAT Threshold – Your Attention Required.`}</span>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            {activeRole === 'Manager' && showDataTable && (
                                <Button variant="outline" className="h-7 px-2 text-xs" onClick={handleResetAdvancedSearch}>
                                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset Search
                                </Button>
                            )}
                            <Button variant="outline" className="h-7 px-2 text-xs" onClick={() => setIsColumnSelectOpen(true)}>
                                <Rows className="mr-1.5 h-3.5 w-3.5" />
                                Select Columns
                            </Button>
                            <Button variant="outline" className="h-7 px-2 text-xs" onClick={saveColumnLayout}>
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                Save Layout
                            </Button>
                            {(activeRole === 'Processor' || activeRole === 'QA' || (activeRole === 'Manager' && showDataTable)) && (
                                <Button 
                                    variant="outline" 
                                    className="h-7 px-2 text-xs" 
                                    onClick={handleDownload} 
                                    disabled={dashboardProjects.length === 0}
                                    title="Download CSV"
                                >
                                    <FileSpreadsheet className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>
        )}
        <main className="flex flex-col flex-grow overflow-y-auto">
             {activeRole === 'Admin' ? (
                <div className="flex-grow flex flex-col">
                    <UserManagementTable sessionUser={user} />
                </div>
            ) : activeRole === 'Manager' ? (
              <div className="flex flex-col h-full">
                 {showManagerAccordions && (
                    <div className="p-4 md:p-6">
                        <Accordion type="single" collapsible className="w-full" defaultValue='work-status'>
                            <AccordionItem value="work-allocation" className="border-0 bg-muted/30 shadow-md mb-4 rounded-lg">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline">Work Allocation / Records Addition</AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Bulk Upload Records</CardTitle>
                                        <CardDescription>Upload a CSV file to add multiple new project records at once. Download the sample file for the correct format.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-4">
                                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                                <Upload className="mr-2" />
                                                Choose CSV File
                                            </Button>
                                            {selectedFile && <span className="text-sm text-muted-foreground">{selectedFile.name}</span>}
                                            {selectedFile && <Button size="sm" variant="ghost" onClick={() => setSelectedFile(null)}><X /></Button>}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="gap-2">
                                        <Button onClick={handleProcessUpload} disabled={!selectedFile || isUploading}>
                                            {isUploading ? <Loader2 className="mr-2 animate-spin" /> : <FileUp className="mr-2" />}
                                            Process Upload
                                        </Button>
                                        <Button variant="secondary" onClick={handleDownloadSample}>
                                            <FileDown className="mr-2" />
                                            Download Sample CSV
                                        </Button>
                                    </CardFooter>
                                </Card>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="advanced-search" className="border-0 bg-muted/30 shadow-md mb-4 rounded-lg">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline">Advanced Search</AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                <AdvancedSearchForm onSearch={handleAdvancedSearch} initialCriteria={searchCriteria} />
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="work-status" className="border-0 bg-muted/30 shadow-md mb-4 rounded-lg">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline">Work Status (Client Wise)</AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Processing Status</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Client</TableHead>
                                                        <TableHead>All Time Pending</TableHead>
                                                        <TableHead>Processed (Today)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {clientWorkStatus.map(item => (
                                                        <TableRow key={item.client}>
                                                            <TableCell>{item.client}</TableCell>
                                                            <TableCell>{item.pendingProcessing}</TableCell>
                                                            <TableCell>{item.processedToday}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>QA Status</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Client</TableHead>
                                                        <TableHead>Pending QA</TableHead>
                                                        <TableHead>Client Query</TableHead>
                                                        <TableHead>Completed (Today)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {clientWorkStatus.map(item => (
                                                        <TableRow key={item.client}>
                                                            <TableCell>{item.client}</TableCell>
                                                            <TableCell>{item.pendingQA}</TableCell>
                                                            <TableCell>{item.clientQuery}</TableCell>
                                                            <TableCell>{item.completedToday}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                )}
                 <div className="flex-grow flex flex-col">
                    {Object.keys(rowSelection).length > 0 && (
                        <div className="flex-shrink-0 flex items-center gap-4 p-4 border-b bg-muted/50">
                            <span className="text-sm font-semibold">{Object.keys(rowSelection).length} selected</span>
                            <div className="flex items-center gap-2">
                                <Select value={bulkUpdateField} onValueChange={(v) => {
                                    setBulkUpdateField(v as typeof bulkUpdateField);
                                    setBulkUpdateValue('');
                                }}>
                                    <SelectTrigger className="w-[180px] h-9">
                                        <SelectValue placeholder="Select field" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bulkUpdateFields.map(f => (
                                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                
                                <Select value={bulkUpdateValue} onValueChange={setBulkUpdateValue}>
                                    <SelectTrigger className="w-[180px] h-9">
                                        <SelectValue placeholder="Select new value" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedBulkUpdateField?.options.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button size="sm" onClick={handleBulkUpdate} disabled={isBulkUpdating}>
                                {isBulkUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Apply Update
                            </Button>
                        </div>
                    )}
                    {showDataTable && (
                        <div className="flex-grow flex flex-col">
                          <DataTable 
                              data={dashboardProjects}
                              columns={columns}
                              sort={sort}
                              setSort={setSort}
                              rowSelection={rowSelection}
                              setRowSelection={setRowSelection}
                              isManagerOrAdmin={isManagerOrAdmin}
                              totalCount={dashboardProjects.length}
                          />
                        </div>
                    )}
                 </div>

              </div>
            ) : (
                 <div className="flex flex-col flex-grow">
                     <DataTable 
                        data={dashboardProjects}
                        columns={columns}
                        sort={sort}
                        setSort={setSort}
                        rowSelection={rowSelection}
                        setRowSelection={setRowSelection}
                        isManagerOrAdmin={isManagerOrAdmin}
                        totalCount={dashboardProjects.length}
                    />
                 </div>
            )}
        </main>
    </div>
  );
}

export default Dashboard;

    

    

