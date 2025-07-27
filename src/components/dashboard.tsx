
"use client";

import * as React from 'react';
import Papa from "papaparse";
import { type Project, type Role, type User, roleHierarchy, ProcessType } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { getColumns, allColumns } from '@/components/columns';
import { Header } from '@/components/header';
import { UserManagementTable } from './user-management-table';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2, Upload, X, FileDown, Rows, Save, FileSpreadsheet, BarChart } from 'lucide-react';
import { AdvancedSearchForm, type SearchCriteria } from './advanced-search-form';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { EditProjectDialog } from './edit-project-dialog';
import { AddRowsDialog } from './add-rows-dialog';
import { getPaginatedProjects, addRows, getProjectsForExport, bulkUpdateProjects } from '@/app/actions';
import { ColumnSelectDialog } from './column-select-dialog';
import { differenceInBusinessDays } from 'date-fns';
import { getUsers } from '@/lib/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


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
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSwitching, setIsSwitching] = React.useState(false);
  const [switchingToRole, setSwitchingToRole] = React.useState<Role | null>(null);
  const [activeRole, setActiveRole] = React.useState<Role | null>(null);
  
  const [dashboardProjects, setDashboardProjects] = React.useState<Project[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [dropdownOptions, setDropdownOptions] = React.useState({
      clientNames: [] as string[],
      processors: [] as string[],
      qas: [] as string[],
      caseManagers: [] as string[],
      processes: [] as ProcessType[],
  });

  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' }>({ key: 'row_number', direction: 'desc' });
  const [search, setSearch] = React.useState('');
  const [searchColumn, setSearchColumn] = React.useState<SearchableColumn>('any');
  const [clientNameFilter, setClientNameFilter] = React.useState('all');
  const [processFilter, setProcessFilter] = React.useState<string | 'all'>('all');
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [isAddRowsDialogOpen, setIsAddRowsDialogOpen] = React.useState(false);
  const [sourceProject, setSourceProject] = React.useState<Project | null>(null);
  const [isColumnSelectOpen, setIsColumnSelectOpen] = React.useState(false);

  const [bulkUpdateField, setBulkUpdateField] = React.useState<keyof Project>('processor');
  const [bulkUpdateValue, setBulkUpdateValue] = React.useState('');
  const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);
  
  const [chartType, setChartType] = React.useState('projectsByStatus');


  const defaultProcessorQAColumns = [ 'actions', 'row_number', 'ref_number', 'client_name', 'process', 'processor', 'sender', 'subject_line', 'received_date', 'case_manager', 'allocation_date', 'processing_date', 'processing_status', 'qa_status', 'workflowStatus' ];
  const defaultCaseManagerColumns = [ 'actions', 'row_number', 'ref_number', 'application_number', 'country', 'patent_number', 'sender', 'subject_line', 'client_query_description', 'client_comments', 'clientquery_status', 'case_manager', 'qa_date', 'client_response_date' ];
  const defaultManagerAdminColumns = [ 'select', 'actions', 'row_number', 'ref_number', 'client_name', 'process', 'processor', 'qa', 'case_manager', 'workflowStatus', 'processing_status', 'qa_status', 'received_date', 'allocation_date', 'processing_date', 'qa_date' ];
  const [visibleColumnKeys, setVisibleColumnKeys] = React.useState<string[]>([]);
  
  const { toast } = useToast();
  
  const isManagerOrAdmin = React.useMemo(() => {
    if (!activeRole) return false;
    return activeRole === 'Manager' || activeRole === 'Admin';
  }, [activeRole]);

  const loadColumnLayout = React.useCallback((role: Role) => {
    const savedLayout = localStorage.getItem(`columnLayout-${role}`);
    if (savedLayout) {
        setVisibleColumnKeys(JSON.parse(savedLayout));
    } else {
        if (role === 'Processor' || role === 'QA') setVisibleColumnKeys(defaultProcessorQAColumns);
        else if (role === 'Case Manager') setVisibleColumnKeys(defaultCaseManagerColumns);
        else if (role === 'Admin' || role === 'Manager') setVisibleColumnKeys(defaultManagerAdminColumns);
    }
  }, [defaultCaseManagerColumns, defaultManagerAdminColumns, defaultProcessorQAColumns]);

  const fetchPageData = React.useCallback(async (role: Role, currentPage: number, currentSort: typeof sort, currentFilters: any) => {
    if (!user || role === 'Admin' || role === 'Manager') {
        setDashboardProjects([]);
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
        });

        setDashboardProjects(result.projects);
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
        
    } catch (error) {
        console.error("Failed to fetch projects:", error);
        if (error instanceof Error && (error.message.includes("RESOURCE_EXHAUSTED") || error.message.includes("Quota exceeded"))) {
             toast({ title: "Quota Exceeded", description: "The free data limit for today has been reached.", variant: "destructive" });
        } else {
            toast({ title: "Error", description: `Could not fetch project data.`, variant: "destructive" });
        }
        setDashboardProjects([]);
        setTotalCount(0);
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

    React.useEffect(() => {
        const initializeDashboard = async () => {
            const highestRole = roleHierarchy.find(role => user.roles.includes(role)) || user.roles[0];
            const urlRole = searchParams.get('role') as Role | null;
            const newActiveRole = urlRole && user.roles.includes(urlRole) ? urlRole : highestRole;

            setActiveRole(newActiveRole);
            loadColumnLayout(newActiveRole);

            try {
                const allUsers = await getUsers();
                setDropdownOptions({
                    clientNames: [...new Set(allUsers.map(u => u.name).filter(Boolean))].sort(),
                    processes: ['Patent', 'TM', 'IDS', 'Project'] as ProcessType[],
                    processors: allUsers.filter(u => u.roles.includes('Processor')).map(u => u.name).sort(),
                    qas: allUsers.filter(u => u.roles.includes('QA')).map(u => u.name).sort(),
                    caseManagers: allUsers.filter(u => u.roles.includes('Case Manager')).map(u => u.name).sort(),
                });
            } catch(e) {
                console.error("Failed to fetch dropdown data", e);
                toast({ title: "Error", description: "Could not load filter options.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        
        if (user) {
            initializeDashboard();
        }
    }, [user, searchParams, loadColumnLayout, toast]);

    React.useEffect(() => {
        if (!activeRole) return;

        const currentFilters = {
            quickSearch: search,
            searchColumn: searchColumn,
            clientName: clientNameFilter,
            process: processFilter,
        };
        
        fetchPageData(activeRole, page, sort, currentFilters);
    }, [activeRole, page, sort, fetchPageData, search, searchColumn, clientNameFilter, processFilter]);


  const handleFilterChange = () => {
    if (!activeRole) return;
    setPage(1); // Reset to first page on new search
    const currentFilters = {
      quickSearch: search,
      searchColumn: searchColumn,
      clientName: clientNameFilter,
      process: processFilter,
    };
    fetchPageData(activeRole, 1, sort, currentFilters);
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
                    if (activeRole) fetchPageData(activeRole, 1, sort, {});
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
        setPage(1); // Reset to first page on new search
        const currentFilters = {
            quickSearch: search,
            searchColumn: searchColumn,
            clientName: clientNameFilter,
            process: processFilter,
        };
        fetchPageData(activeRole, 1, sort, currentFilters);
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
        const filters = {
            quickSearch: search,
            searchColumn: searchColumn,
            clientName: clientNameFilter,
            process: processFilter,
            roleFilter: activeRole ? { role: activeRole, userName: user.name } : undefined
        };
        
        const projectsToExport = await getProjectsForExport({ filters: { ...filters, roleFilter: filters.roleFilter as any }, sort, user });

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
  
    const handleBulkUpdate = async () => {
        const projectIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
        if (projectIds.length === 0 || !bulkUpdateField || !bulkUpdateValue) {
            toast({ title: "Bulk Update Error", description: "Please select rows, a field, and a value.", variant: "destructive" });
            return;
        }
        
        setIsBulkUpdating(true);
        try {
            const result = await bulkUpdateProjects({ projectIds, field: bulkUpdateField, value: bulkUpdateValue });
            if (result.success) {
                toast({ title: "Success", description: `${projectIds.length} projects have been updated.` });
                if (activeRole) fetchPageData(activeRole, page, sort, {});
                setRowSelection({});
                setBulkUpdateValue('');
            } else {
                throw new Error("An unknown error occurred.");
            }
        } catch(e) {
            toast({ title: "Error", description: `Failed to update projects. ${e instanceof Error ? e.message : ''}`, variant: "destructive"});
        } finally {
            setIsBulkUpdating(false);
        }
    };
    
    const handleGenerateChart = () => {
        const params = new URLSearchParams();
        params.set('view', 'chart');
        params.set('chartType', chartType);
        params.set('advanced', 'true');
        params.set('criteria', '[]');
        router.push(`/search?${params.toString()}`);
    }
  
  if (isLoading || !activeRole || visibleColumnKeys.length === 0) {
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
  
  const columns = getColumns(isManagerOrAdmin, activeRole, rowSelection, setRowSelection, dashboardProjects, handleOpenEditDialog, handleAddRowsDialog, visibleColumnKeys);
  const showSubHeader = dashboardProjects.length > 0;
  
   const bulkUpdateFields: {
        value: keyof Project;
        label: string;
        options: readonly string[] | string[];
        type: 'select';
      }[] = [
        { value: 'processor', label: 'Processor', options: dropdownOptions.processors, type: 'select' },
        { value: 'qa', label: 'QA', options: dropdownOptions.qas, type: 'select' },
        { value: 'case_manager', label: 'Case Manager', options: dropdownOptions.caseManagers, type: 'select' },
        { value: 'client_name', label: 'Client Name', options: dropdownOptions.clientNames, type: 'select' },
        { value: 'process', label: 'Process', options: dropdownOptions.processes, type: 'select' },
      ];
    const selectedBulkUpdateField = bulkUpdateFields.find(f => f.value === bulkUpdateField);


  return (
    <div className="flex flex-col h-screen bg-background w-full">
         <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".csv" />
        {editingProject && (
             <EditProjectDialog
                isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} project={editingProject}
                onUpdateSuccess={() => {if(activeRole) fetchPageData(activeRole, page, sort, {})}}
                userRole={activeRole} projectQueue={dashboardProjects} onNavigate={setEditingProject}
                clientNames={dropdownOptions.clientNames} processors={dropdownOptions.processors} qas={dropdownOptions.qas} caseManagers={dropdownOptions.caseManagers} processes={dropdownOptions.processes}
            />
        )}
        {sourceProject && ( <AddRowsDialog isOpen={isAddRowsDialogOpen} onOpenChange={setIsAddRowsDialogOpen} sourceProject={sourceProject} onAddRowsSuccess={() => {if(activeRole) fetchPageData(activeRole, page, sort, {})}} /> )}
        <ColumnSelectDialog isOpen={isColumnSelectOpen} onOpenChange={setIsColumnSelectOpen} allColumns={allColumns} visibleColumns={visibleColumnKeys} setVisibleColumns={setVisibleColumnKeys} />

        <Header 
            user={user} activeRole={activeRole} setActiveRole={handleRoleSwitch}
            search={search} setSearch={setSearch} searchColumn={searchColumn} setSearchColumn={setSearchColumn}
            onQuickSearch={handleQuickSearch} clientNameFilter={clientNameFilter} setClientNameFilter={setClientNameFilter}
            processFilter={processFilter} setProcessFilter={setProcessFilter} isManagerOrAdmin={isManagerOrAdmin}
            showManagerSearch={activeRole === 'Manager'}
            clientNames={dropdownOptions.clientNames} processes={dropdownOptions.processes}
        />
        
        {showSubHeader && activeRole !== 'Manager' && (
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
                    
                    {activeRole !== 'Case Manager' && (
                        <>
                            <Button variant="outline" className="h-7 px-2 text-xs" onClick={() => setIsColumnSelectOpen(true)}>
                                <Rows className="mr-1.5 h-3.5 w-3.5" /> Select Columns
                            </Button>
                            <Button variant="outline" className="h-7 px-2 text-xs" onClick={() => saveColumnLayout(activeRole)}>
                                <Save className="mr-1.5 h-3.5 w-3.5" /> Save Layout
                            </Button>
                        </>
                    )}
                    <Button variant="outline" className="h-7 px-2 text-xs" onClick={handleNonManagerDownload} disabled={dashboardProjects.length === 0 || isLoading}>
                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
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
                        <AccordionContent>
                           <div className="p-1">
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
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="charts" className="border-0 bg-muted/30 shadow-md mb-4 rounded-lg">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">Work Status Charts</AccordionTrigger>
                        <AccordionContent>
                           <div className="p-1">
                             <Card>
                                <CardHeader>
                                  <CardTitle>Generate Data Charts</CardTitle>
                                  <CardDescription>Select a chart type to visualize project data. The chart will be displayed on the search results page.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex items-center gap-4">
                                    <Select value={chartType} onValueChange={setChartType}>
                                        <SelectTrigger className="w-[280px]">
                                            <SelectValue placeholder="Select chart type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="projectsByStatus">Projects by Status</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleGenerateChart}>
                                        <BarChart className="mr-2"/>
                                        Generate Chart
                                    </Button>
                                </CardContent>
                              </Card>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="advanced-search" className="border-0 bg-muted/30 shadow-md mb-4 rounded-lg">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">Advanced Search</AccordionTrigger>
                        <AccordionContent>
                           <div className="p-1">
                             <AdvancedSearchForm onSearch={handleAdvancedSearch} initialCriteria={null} processors={dropdownOptions.processors} qas={dropdownOptions.qas} clientNames={dropdownOptions.clientNames} processes={dropdownOptions.processes} />
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
              </div>
            ) : (
                 <div className="flex-grow flex flex-col">
                    {Object.keys(rowSelection).length > 0 && (
                        <div className="flex-shrink-0 flex items-center gap-4 p-4 border-b bg-muted/50">
                            <span className="text-sm font-semibold">{Object.keys(rowSelection).length} selected</span>
                            <div className="flex items-center gap-2">
                                <Select value={bulkUpdateField} onValueChange={(v) => {
                                    setBulkUpdateField(v as keyof Project);
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
