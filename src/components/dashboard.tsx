
"use client";

import * as React from 'react';
import Papa from "papaparse";
import { type Project, type Role, type User, roleHierarchy, projectStatuses, processorActionableStatuses, processorSubmissionStatuses, qaSubmissionStatuses, workflowStatuses, allProcessorStatuses, allQaStatuses, ProcessType } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { getColumns, allColumns } from '@/components/columns';
import { Header } from '@/components/header';
import { UserManagementTable } from './user-management-table';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileUp, Loader2, Upload, X, Download, FileDown, Rows, Save, FileSpreadsheet, RotateCcw, Search } from 'lucide-react';
import { AdvancedSearchForm, type SearchCriteria } from './advanced-search-form';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { EditProjectDialog } from './edit-project-dialog';
import { AddRowsDialog } from './add-rows-dialog';
import { getProjectsForUser, bulkUpdateProjects, addRows, getPaginatedProjects } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ColumnSelectDialog } from './column-select-dialog';
import { differenceInBusinessDays } from 'date-fns';
import { Label } from './ui/label';
import { ProjectInsights } from './project-insights';

interface DashboardProps {
  user: User;
  initialProjects: Project[];
  clientNames: string[];
  processors: string[];
  qas: string[];
  caseManagers: string[];
  processes: ProcessType[];
  onSwitchRole: (role: Role) => void;
  error: string | null;
}

export function DashboardWrapper(props: DashboardProps) {
    return <Dashboard {...props} />;
}


export type SearchableColumn = 'any' | 'row_number' | 'ref_number' | 'application_number' | 'patent_number' | 'subject_line' | 'processing_status' | 'qa_status' | 'workflowStatus' | 'allocation_date' | 'received_date';


function Dashboard({ 
  user, 
  initialProjects,
  clientNames,
  processors,
  qas,
  caseManagers,
  processes,
  onSwitchRole
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
      'actions', 'row_number', 'ref_number', 'application_number', 'country', 'patent_number', 'sender', 'subject_line', 'client_query_description', 'client_comments', 'clientquery_status', 'case_manager', 'qa_date', 'client_response_date'
  ];

  const defaultManagerAdminColumns = [
      'select', 'actions', 'row_number', 'ref_number', 'client_name', 'process', 'processor', 'qa', 'case_manager', 'workflowStatus', 'processing_status', 'qa_status', 'received_date', 'allocation_date', 'processing_date', 'qa_date'
  ];

  const [visibleColumnKeys, setVisibleColumnKeys] = React.useState<string[]>(defaultProcessorQAColumns);
  
  const { toast } = useToast();
  
  const refreshProjects = async () => {
    if (!activeRole || isManagerOrAdmin) return;
    try {
        const updatedProjects = await getProjectsForUser(user.name, user.roles);
        setProjects(updatedProjects);
    } catch (error) {
        console.error("Failed to refresh projects:", error);
        toast({
            title: "Error",
            description: "Could not refresh project data.",
            variant: "destructive"
        });
    }
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
    if (!isManagerOrAdmin) {
        setProjects(initialProjects);
    }
  }, [isManagerOrAdmin, initialProjects]);
  
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
                            if (key === 'id' || key === 'row_number') continue;
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
                    await refreshProjects();
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
    const params = new URLSearchParams();
    params.set('advanced', 'true');
    params.set('criteria', JSON.stringify(criteria.filter(c => c.field && c.operator)));
    router.push(`/search?${params.toString()}`);
  };
  
  const handleQuickSearch = () => {
    if (!search.trim()) return;
    const params = new URLSearchParams();
    params.set('quickSearch', search);
    params.set('searchColumn', searchColumn);
    router.push(`/search?${params.toString()}`);
  };
  
  const handleOpenEditDialog = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  };
  
  const handleAddRowsDialog = (project: Project) => {
    setSourceProject(project);
    setIsAddRowsDialogOpen(true);
  }

  const handleDownloadSample = () => {
    const headers = "ref_number,case_manager,manager_name,processor,sender,received_date,allocation_date,process,client_name,rework_reason,client_error_description,subject_line";
    const sampleData = `MANUAL-001,CM Alice,Manager User,Alice,sender@example.com,2024-01-01,2024-01-02,Patent,Client A,,,"Sample Subject 1"`;
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
    let baseProjects: Project[] = projects;
    
    if (!isManagerOrAdmin) {
        let filtered = baseProjects;
        
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

        if (search) {
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

        if (clientNameFilter !== 'all') {
            filtered = filtered.filter(p => p.client_name === clientNameFilter);
        }
        
        if (processFilter !== 'all') {
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
    }
    return []; // Manager no longer shows table on main dashboard
  }, [activeRole, user.name, projects, search, searchColumn, sort, clientNameFilter, processFilter, isManagerOrAdmin]);

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
    
    for (const project of initialProjects) {
        if (!statusByClient[project.client_name]) {
             statusByClient[project.client_name] = {
                pendingProcessing: 0,
                processedToday: 0,
                pendingQA: 0,
                clientQuery: 0,
                completedToday: 0,
            };
        }

        if (['Pending', 'On Hold', 'Re-Work'].includes(project.processing_status)) {
            statusByClient[project.client_name].pendingProcessing++;
        }
        if (project.processing_date === today) {
            statusByClient[project.client_name].processedToday++;
        }

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
  }, [initialProjects, clientNames]);
  
  const caseManagerTatInfo = React.useMemo(() => {
    if (activeRole !== 'Case Manager') return null;

    const outsideTatCount = dashboardProjects.filter(p => {
        if (!p.qa_date) return false;
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

  const showSubHeader = activeRole === 'Case Manager' && dashboardProjects.length > 0;

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
                clientNames={clientNames}
                processors={processors}
                qas={qas}
                caseManagers={caseManagers}
                processes={processes}
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
            setActiveRole={(role) => onSwitchRole(role)}
            search={search}
            setSearch={setSearch}
            searchColumn={searchColumn}
            setSearchColumn={setSearchColumn}
            isManagerOrAdmin={isManagerOrAdmin}
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
                <div className="flex items-center justify-end gap-2 px-4 py-2.5">
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
                    ) : null}
                </div>
            </div>
        )}
        <main className="flex flex-col flex-grow overflow-y-auto transition-opacity duration-300">
             {activeRole === 'Admin' ? (
                <div className="flex-grow flex flex-col">
                    <UserManagementTable sessionUser={user} />
                </div>
            ) : activeRole === 'Manager' ? (
              <div className="flex flex-col h-full p-4 md:p-6 overflow-y-auto">
                <Accordion type="single" collapsible className="w-full" defaultValue='advanced-search'>
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
                      <AccordionItem value="ai-insights" className="border-0 bg-muted/30 shadow-md mb-4 rounded-lg">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">AI Project Insights</AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <ProjectInsights />
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="advanced-search" className="border-0 bg-muted/30 shadow-md mb-4 rounded-lg">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">Advanced Search</AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                        <AdvancedSearchForm onSearch={handleAdvancedSearch} initialCriteria={null} processors={processors} qas={qas} clientNames={clientNames} processes={processes} />
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
            ) : (
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
                        activeRole={activeRole}
                    />
                 </div>
            )}
        </main>
    </div>
  );
}

export default Dashboard;
