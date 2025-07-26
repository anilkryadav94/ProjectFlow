
"use client";

import * as React from 'react';
import Papa from "papaparse";
import { type Project, type Role, type User, roleHierarchy, ProcessType, processorActionableStatuses, qaStatuses, clientStatuses } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { getColumns, allColumns } from '@/components/columns';
import { Header } from '@/components/header';
import { UserManagementTable } from './user-management-table';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2, Upload, X, FileDown, Rows, Save, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { AdvancedSearchForm, type SearchCriteria } from './advanced-search-form';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { EditProjectDialog } from './edit-project-dialog';
import { AddRowsDialog } from './add-rows-dialog';
import { getPaginatedProjects, addRows, getProjectsForExport } from '@/app/actions';
import { ColumnSelectDialog } from './column-select-dialog';
import { differenceInBusinessDays } from 'date-fns';
import { ProjectInsights } from './project-insights';
import { getUsers } from '@/lib/auth';

interface DashboardProps {
  user: User;
  error: string | null;
}

export function DashboardWrapper(props: DashboardProps) {
    return <Dashboard {...props} />;
}


export type SearchableColumn = 'any' | 'row_number' | 'ref_number' | 'application_number' | 'patent_number' | 'subject_line' | 'processing_status' | 'qa_status' | 'workflowStatus' | 'allocation_date' | 'received_date';


function Dashboard({ user, error }: DashboardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Overall loading state for the entire component
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Role and UI states
  const [activeRole, setActiveRole] = React.useState<Role | null>(null);
  const [isSwitching, setIsSwitching] = React.useState(false);
  const [switchingToRole, setSwitchingToRole] = React.useState<Role | null>(null);
  
  // Server-fetched data states
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [clientNames, setClientNames] = React.useState<string[]>([]);
  const [processors, setProcessors] = React.useState<string[]>([]);
  const [qas, setQas] = React.useState<string[]>([]);
  const [caseManagers, setCaseManagers] = React.useState<string[]>([]);
  const [processes, setProcesses] = React.useState<ProcessType[]>([]);

  // UI control states
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' }>({ key: 'row_number', direction: 'desc' });
  const [search, setSearch] = React.useState('');
  const [searchColumn, setSearchColumn] = React.useState<SearchableColumn>('any');
  const [clientNameFilter, setClientNameFilter] = React.useState('all');
  const [processFilter, setProcessFilter] = React.useState<string | 'all'>('all');
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  
  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [isAddRowsDialogOpen, setIsAddRowsDialogOpen] = React.useState(false);
  const [sourceProject, setSourceProject] = React.useState<Project | null>(null);
  const [isColumnSelectOpen, setIsColumnSelectOpen] = React.useState(false);

  // Column visibility states
  const defaultProcessorQAColumns = [ 'actions', 'row_number', 'ref_number', 'client_name', 'process', 'processor', 'sender', 'subject_line', 'received_date', 'case_manager', 'allocation_date', 'processing_date', 'processing_status', 'qa_status', 'workflowStatus' ];
  const defaultCaseManagerColumns = [ 'actions', 'row_number', 'ref_number', 'application_number', 'country', 'patent_number', 'sender', 'subject_line', 'client_query_description', 'client_comments', 'clientquery_status', 'case_manager', 'qa_date', 'client_response_date' ];
  const defaultManagerAdminColumns = [ 'select', 'actions', 'row_number', 'ref_number', 'client_name', 'process', 'processor', 'qa', 'case_manager', 'workflowStatus', 'processing_status', 'qa_status', 'received_date', 'allocation_date', 'processing_date', 'qa_date' ];
  const [visibleColumnKeys, setVisibleColumnKeys] = React.useState<string[]>(defaultProcessorQAColumns);
  
  const { toast } = useToast();
  
  const isManagerOrAdmin = React.useMemo(() => activeRole === 'Manager' || activeRole === 'Admin', [activeRole]);

  const fetchInitialData = React.useCallback(async () => {
    try {
        const [allUsers, projForDropDowns] = await Promise.all([
            getUsers(),
            getPaginatedProjects({ page: 1, limit: 1000, filters: {}, sort: { key: 'client_name', direction: 'asc' }})
        ]);

        setClientNames([...new Set(projForDropDowns.projects.map(p => p.client_name).filter(Boolean))].sort());
        setProcesses([...new Set(projForDropDowns.projects.map(p => p.process).filter(Boolean))].sort() as ProcessType[]);
        setProcessors(allUsers.filter(u => u.roles.includes('Processor')).map(u => u.name).sort());
        setQas(allUsers.filter(u => u.roles.includes('QA')).map(u => u.name).sort());
        setCaseManagers(allUsers.filter(u => u.roles.includes('Case Manager')).map(u => u.name).sort());
    } catch(e) {
        console.error("Failed to fetch dropdown data", e);
        toast({ title: "Error", description: "Could not load filter options.", variant: "destructive" });
    }
  }, [toast]);
  
  const fetchProjects = React.useCallback(async (role: Role, currentPage: number, currentSort: typeof sort, currentFilters: any) => {
    if (!user || role === 'Admin') {
        setProjects([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
    };
    setIsLoading(true);

    try {
        const result = await getPaginatedProjects({
            page: currentPage,
            limit: 50,
            sort: currentSort,
            filters: { ...currentFilters, roleFilter: { role, userName: user.name } },
            user,
        });

        // For non-paginated role views, we sort client-side
        if (result.totalPages === 1 && !isManagerOrAdmin) {
            const sortedProjects = [...result.projects].sort((a, b) => {
                const key = currentSort.key as keyof Project;
                const aValue = a[key];
                const bValue = b[key];
        
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;
                
                let comparison = 0;
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    comparison = aValue.localeCompare(bValue);
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue - bValue;
                }
        
                return currentSort.direction === 'asc' ? comparison : -comparison;
            });
            setProjects(sortedProjects);
        } else {
             setProjects(result.projects);
        }
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
    } catch (error) {
        console.error("Failed to fetch projects:", error);
        toast({ title: "Error", description: `Could not fetch project data. ${error}`, variant: "destructive" });
        setProjects([]);
        setTotalCount(0);
    } finally {
        setIsLoading(false);
    }
  }, [user, toast, isManagerOrAdmin]);

  // Effect to set initial role and load initial dropdown data
  React.useEffect(() => {
    const highestRole = roleHierarchy.find(role => user.roles.includes(role)) || user.roles[0];
    const urlRole = searchParams.get('role') as Role | null;
    const newActiveRole = urlRole && user.roles.includes(urlRole) ? urlRole : highestRole;

    if (newActiveRole !== activeRole) {
        setActiveRole(newActiveRole);
        loadColumnLayout(newActiveRole);
    }
    
    // Fetch dropdowns only once
    if (clientNames.length === 0) {
      fetchInitialData();
    }
  }, [user.roles, searchParams, activeRole, fetchInitialData, clientNames.length]);

  // Fetch projects data when dependencies change
  React.useEffect(() => {
    if (activeRole) {
      if (isManagerOrAdmin) {
        // Manager/Admin view doesn't load data initially. It waits for search.
        setProjects([]);
        setTotalCount(0);
        setTotalPages(1);
        setIsLoading(false);
      } else {
        const filters = {
            quickSearch: search,
            searchColumn: searchColumn,
            clientName: clientNameFilter,
            process: processFilter
        };
        fetchProjects(activeRole, page, sort, filters);
      }
    }
  }, [activeRole, page, sort, search, searchColumn, clientNameFilter, processFilter, fetchProjects, isManagerOrAdmin]);

  const loadColumnLayout = (role: Role) => {
    const savedLayout = localStorage.getItem(`columnLayout-${role}`);
    if (savedLayout) {
        setVisibleColumnKeys(JSON.parse(savedLayout));
    } else {
        if (role === 'Processor' || role === 'QA') setVisibleColumnKeys(defaultProcessorQAColumns);
        else if (role === 'Case Manager') setVisibleColumnKeys(defaultCaseManagerColumns);
        else if (role === 'Admin' || role === 'Manager') setVisibleColumnKeys(defaultManagerAdminColumns);
    }
  };

  const saveColumnLayout = (role: Role) => {
    localStorage.setItem(`columnLayout-${role}`, JSON.stringify(visibleColumnKeys));
    toast({ title: "Layout Saved", description: `Your column layout for the ${role} role has been saved.` });
  };
  
  const handleRoleSwitch = (role: Role) => {
    setIsSwitching(true);
    setSwitchingToRole(role);
    router.push(`/?role=${role}`);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
    event.target.value = '';
  }

  const handleProcessUpload = async () => {
    if (!selectedFile) {
        toast({ title: "No file selected", description: "Please select a CSV file to upload.", variant: "destructive" });
        return;
    }
    setIsUploading(true);

    Papa.parse(selectedFile, {
        header: true, skipEmptyLines: true,
        complete: async (results) => {
            const rows = results.data as any[];
            if (rows.length === 0) {
                toast({ title: "Upload Error", description: "CSV file is empty or malformed.", variant: "destructive" });
                setIsUploading(false);
                return;
            }
            const projectsToAdd: Partial<Project>[] = rows.filter(row => row.client_name || row.subject_line).map(row => {
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
                    toast({ title: "Bulk Add Complete", description: `${result.addedCount} projects have been added.` });
                    if (activeRole) fetchProjects(activeRole, 1, sort, {});
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
    if (isManagerOrAdmin) {
        if (!search.trim()) return;
        const params = new URLSearchParams();
        params.set('quickSearch', search);
        params.set('searchColumn', searchColumn);
        router.push(`/search?${params.toString()}`);
    } else if (activeRole) {
        setPage(1); 
        fetchProjects(activeRole, 1, sort, { quickSearch: search, searchColumn });
    }
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
    if (isManagerOrAdmin || totalPages > 1) return projects; // Use server data directly for managers or paginated results
    
    let filtered = projects;

    if (activeRole === 'Processor') {
        filtered = filtered.filter(p => processorActionableStatuses.includes(p.processing_status));
    } else if (activeRole === 'QA') {
        filtered = filtered.filter(p => (
          (p.processing_status === 'Processed' || p.processing_status === 'Already Processed' || p.processing_status === 'NTP' || p.processing_status === 'Client Query') &&
          (p.qa_status === 'Pending' || p.qa_status === 'On Hold')
        ));
    } else if (activeRole === 'Case Manager') {
        filtered = filtered.filter(p => p.qa_status === 'Client Query' && p.clientquery_status === null);
    }
    
    return filtered;
  }, [projects, activeRole, isManagerOrAdmin, totalPages]);


  const caseManagerTatInfo = React.useMemo(() => {
    if (activeRole !== 'Case Manager') return null;
    const outsideTatCount = dashboardProjects.filter(p => {
        if (!p.qa_date) return false;
        return differenceInBusinessDays(new Date(), new Date(p.qa_date)) > 3;
    }).length;
    const greeting = new Date().getHours() < 17 ? "Good Morning" : "Good Evening";
    return { count: outsideTatCount, greeting: `Hi ${user.name}, ${greeting}!`, plural: outsideTatCount === 1 ? 'Email' : 'Emails' };
  }, [activeRole, dashboardProjects, user.name]);

  const handleNonManagerDownload = async () => {
        setIsLoading(true);
        const filters = {
            quickSearch: search,
            searchColumn: searchColumn,
            clientName: clientNameFilter,
            process: processFilter,
            roleFilter: activeRole ? { role: activeRole, userName: user.name } : undefined
        };
        
        const projectsToExport = await getProjectsForExport({ filters, sort, user });
        setIsLoading(false);

        if (projectsToExport.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }

        const csv = Papa.unparse(projectsToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("download", `${activeRole}_dashboard_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
  };
  
  if (isLoading || !activeRole) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                {isSwitching ? (
                  <p className="text-lg text-muted-foreground">Opening {switchingToRole} Dashboard...</p>
                ) : (
                  <p className="text-lg text-muted-foreground">Loading Dashboard...</p>
                )}
            </div>
        </div>
    );
  }
  
  const columns = getColumns(isManagerOrAdmin, activeRole, rowSelection, setRowSelection, projects, handleOpenEditDialog, handleAddRowsDialog, visibleColumnKeys);
  const showSubHeader = !isManagerOrAdmin && totalCount > 0;

  return (
    <div className="flex flex-col h-screen bg-background w-full">
         <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".csv" />
        {editingProject && (
             <EditProjectDialog
                isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} project={editingProject}
                onUpdateSuccess={() => {if(activeRole) fetchProjects(activeRole, page, sort, {})}}
                userRole={activeRole} projectQueue={dashboardProjects} onNavigate={setEditingProject}
                clientNames={clientNames} processors={processors} qas={qas} caseManagers={caseManagers} processes={processes}
            />
        )}
        {sourceProject && ( <AddRowsDialog isOpen={isAddRowsDialogOpen} onOpenChange={setIsAddRowsDialogOpen} sourceProject={sourceProject} onAddRowsSuccess={() => {if(activeRole) fetchProjects(activeRole, page, sort, {})}} /> )}
        <ColumnSelectDialog isOpen={isColumnSelectOpen} onOpenChange={setIsColumnSelectOpen} allColumns={allColumns} visibleColumns={visibleColumnKeys} setVisibleColumns={setVisibleColumnKeys} />

        <Header 
            user={user} activeRole={activeRole} setActiveRole={handleRoleSwitch}
            search={search} setSearch={setSearch} searchColumn={searchColumn} setSearchColumn={setSearchColumn}
            onQuickSearch={handleQuickSearch} clientNameFilter={clientNameFilter} setClientNameFilter={setClientNameFilter}
            processFilter={processFilter} setProcessFilter={setProcessFilter} isManagerOrAdmin={isManagerOrAdmin}
            showManagerSearch={isManagerOrAdmin} clientNames={clientNames} processes={processes}
        />
        
        {showSubHeader && (
            <div className="flex-shrink-0 border-b bg-muted">
                <div className="flex items-center justify-end gap-2 px-4 py-1">
                     {activeRole === 'Case Manager' ? (
                        <div className="flex-grow text-left text-sm font-semibold text-muted-foreground">
                            {totalCount > 0 && caseManagerTatInfo && (
                                <>
                                    <span>{caseManagerTatInfo.greeting} </span>
                                    {caseManagerTatInfo.count > 0 && (
                                        <span>{`${caseManagerTatInfo.count} ${caseManagerTatInfo.plural} Identified Outside TAT Threshold – Your Attention Required.`}</span>
                                    )}
                                </>
                            )}
                        </div>
                    ) : <div className="flex-grow" />}
                    
                    <Button variant="outline" className="h-7 px-2 text-xs" onClick={() => setIsColumnSelectOpen(true)}>
                        <Rows className="mr-1.5 h-3.5 w-3.5" /> Select Columns
                    </Button>
                    <Button variant="outline" className="h-7 px-2 text-xs" onClick={() => saveColumnLayout(activeRole)}>
                        <Save className="mr-1.5 h-3.5 w-3.5" /> Save Layout
                    </Button>
                    <Button variant="outline" className="h-7 px-2 text-xs" onClick={handleNonManagerDownload} disabled={projects.length === 0 || isLoading}>
                        {isLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />}
                         Download
                    </Button>
                </div>
            </div>
        )}

        <main className="flex flex-col flex-grow overflow-y-auto transition-opacity duration-300">
             {activeRole === 'Admin' ? (
                <div className="flex-grow flex flex-col p-4">
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
                                        <Upload className="mr-2" /> Choose CSV File
                                    </Button>
                                    {selectedFile && <span className="text-sm text-muted-foreground">{selectedFile.name}</span>}
                                    {selectedFile && <Button size="sm" variant="ghost" onClick={() => setSelectedFile(null)}><X /></Button>}
                                </div>
                            </CardContent>
                            <CardFooter className="gap-2">
                                <Button onClick={handleProcessUpload} disabled={!selectedFile || isUploading}>
                                    {isUploading ? <Loader2 className="mr-2 animate-spin" /> : <FileUp className="mr-2" />} Process Upload
                                </Button>
                                <Button variant="secondary" onClick={handleDownloadSample}>
                                    <FileDown className="mr-2" /> Download Sample CSV
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
                            {/* This would need its own data fetching logic now */}
                            <p className="p-4 text-muted-foreground">Work status overview will be implemented here.</p>
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
                        totalCount={totalCount}
                        activeRole={activeRole}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        isFetching={isLoading}
                    />
                 </div>
            )}
        </main>
    </div>
  );
}

export default Dashboard;
