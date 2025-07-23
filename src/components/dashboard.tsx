

"use client";

import * as React from 'react';
import Papa from "papaparse";
import { type Project, type Role, type User, roleHierarchy, processors, qas, projectStatuses, clientNames, processes, processorActionableStatuses, projects as mockProjects, workflowStatuses, processorStatuses as allProcessorStatuses, qaStatuses as allQaStatuses, processorSubmissionStatuses, qaSubmissionStatuses } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/columns';
import { Header } from '@/components/header';
import { UserManagementTable } from './user-management-table';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileUp, Loader2, Upload, X } from 'lucide-react';
import { AdvancedSearchForm, type SearchCriteria } from './advanced-search-form';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { EditProjectDialog } from './edit-project-dialog';
import { AddRowsDialog } from './add-rows-dialog';

interface DashboardProps {
  user: User;
  initialProjects: Project[];
}

export function DashboardWrapper(props: DashboardProps) {
    return <Dashboard {...props} />;
}


export type SearchableColumn = 'any' | 'refNumber' | 'applicationNumber' | 'patentNumber' | 'subject' | 'processorStatus' | 'qaStatus' | 'workflowStatus' | 'allocationDate' | 'emailDate';

const bulkUpdateFields = [
    { value: 'processor', label: 'Processor', options: processors },
    { value: 'qa', label: 'QA', options: qas },
] as const;

type ProcessingSummaryData = Record<string, { pending: number, processed: number }>;
type QASummaryData = Record<string, { pending: number, processed: number, clientQuery: number }>;


const ProcessingStatusSummary = ({ projects }: { projects: Project[] }) => {
    const summary = React.useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const data: ProcessingSummaryData = clientNames.reduce((acc, name) => {
            acc[name] = { pending: 0, processed: 0 };
            return acc;
        }, {} as ProcessingSummaryData);

        projects.forEach(p => {
            if (!data[p.clientName]) return;
            
            if (processorSubmissionStatuses.includes(p.processorStatus)) {
                 if (p.processingDate === today) {
                    data[p.clientName].processed++;
                }
            } else if (processorActionableStatuses.includes(p.processorStatus)) {
                data[p.clientName].pending++;
            }
        });

        return data;
    }, [projects]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Processing Work Status</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client Name</TableHead>
                            <TableHead className="text-right">Pending (All Time)</TableHead>
                            <TableHead className="text-right">Processed (Today)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(summary).map(([client, counts]) => (
                            <TableRow key={client}>
                                <TableCell className="font-medium">{client}</TableCell>
                                <TableCell className="text-right">{counts.pending}</TableCell>
                                <TableCell className="text-right">{counts.processed}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

const QAStatusSummary = ({ projects }: { projects: Project[] }) => {
    const summary = React.useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const data: QASummaryData = clientNames.reduce((acc, name) => {
            acc[name] = { pending: 0, processed: 0, clientQuery: 0 };
            return acc;
        }, {} as QASummaryData);

        projects.forEach(p => {
            if (!data[p.clientName]) return;

            if (p.qaStatus === 'Complete') {
                if (p.qaDate === today) {
                    data[p.clientName].processed++;
                }
            } else if (p.qaStatus === 'Pending') {
                data[p.clientName].pending++;
            } else if (p.qaStatus === 'Client Query') {
                data[p.clientName].clientQuery++;
            }
        });

        return data;
    }, [projects]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">QA Work Status</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client Name</TableHead>
                            <TableHead className="text-right">Pending</TableHead>
                            <TableHead className="text-right">Client Query</TableHead>
                            <TableHead className="text-right">Completed (Today)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(summary).map(([client, counts]) => (
                            <TableRow key={client}>
                                <TableCell className="font-medium">{client}</TableCell>
                                <TableCell className="text-right">{counts.pending}</TableCell>
                                <TableCell className="text-right">{counts.clientQuery}</TableCell>
                                <TableCell className="text-right">{counts.processed}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};


function Dashboard({ 
  user, 
  initialProjects,
}: DashboardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const urlRole = searchParams.get('role') as Role | null;

  const [activeRole, setActiveRole] = React.useState<Role | null>(null);
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  // State for non-manager quick search
  const [search, setSearch] = React.useState('');
  const [searchColumn, setSearchColumn] = React.useState<SearchableColumn>('any');
  
  // State for manager quick search
  const [managerSearch, setManagerSearch] = React.useState('');
  const [managerSearchColumn, setManagerSearchColumn] = React.useState<SearchableColumn>('any');

  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'allocationDate', direction: 'desc' });
  
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
  
  const { toast } = useToast();
  
  const refreshProjects = React.useCallback(async () => {
    // In mock mode, we just reset to the original mock data.
    // In a real app, this would re-fetch from the database.
    setProjects(mockProjects);
    
    // A simple router.refresh() should get fresh server state which triggers re-render
    router.refresh();

  }, [router]);

  React.useEffect(() => {
    const highestRole = roleHierarchy.find(role => user.roles.includes(role)) || user.roles[0];
    const newActiveRole = urlRole && user.roles.includes(urlRole) ? urlRole : highestRole;

    if (newActiveRole !== activeRole) {
        setActiveRole(newActiveRole);
        const currentUrlRole = searchParams.get('role');
        if (currentUrlRole !== newActiveRole) {
             router.replace(`/?role=${newActiveRole}`, { scroll: false });
        }
    }
  }, [user.roles, urlRole, router, activeRole, searchParams]);
  
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
    // MOCK IMPLEMENTATION
    console.log(`Mock Bulk Update: Set ${bulkUpdateField} to ${bulkUpdateValue} for projects: ${projectIds.join(', ')}`);
    
    // In a real app, you'd update this in the database. Here we just simulate it.
    const updatedProjects = projects.map(p => {
        if (projectIds.includes(p.id)) {
            return { ...p, [bulkUpdateField]: bulkUpdateValue };
        }
        return p;
    });
    setProjects(updatedProjects);
    
    toast({ title: "Success", description: `${projectIds.length} projects have been updated (mock).` });
    setRowSelection({});
    setBulkUpdateValue('');
    setIsBulkUpdating(false);
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setSelectedFile(file);
    }
     // Reset file input to allow selecting the same file again
    event.target.value = '';
  }

  const handleProcessUpload = () => {
    if (!selectedFile) {
        toast({ title: "No file selected", description: "Please select a CSV file to upload.", variant: "destructive" });
        return;
    }
    setIsUploading(true);

    Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const newProjects = results.data.map((row: any, index: number) => {
                // Basic validation and type coercion
                const clientName = clientNames.includes(row.clientName) ? row.clientName : clientNames[0];
                const process = processes.includes(row.process) ? row.process : processes[0];
                const processor = processors.includes(row.processor) ? row.processor : "";
                const qa = qas.includes(row.qa) ? row.qa : "";
                const workflowStatus = workflowStatuses.includes(row.workflowStatus) ? row.workflowStatus : 'With Processor';
                const processorStatus = allProcessorStatuses.includes(row.processorStatus) ? row.processorStatus : 'Pending';
                const qaStatus = allQaStatuses.includes(row.qaStatus) ? row.qaStatus : 'Pending';
                
                let lastRefNumber = parseInt(projects.map(p => p.refNumber.replace('REF', '')).sort((a,b) => parseInt(b) - parseInt(a))[0] || '0');
                lastRefNumber++;

                return {
                    id: `proj_${Date.now()}_${index}`,
                    refNumber: row.refNumber || `REF${String(lastRefNumber).padStart(3, '0')}`,
                    clientName,
                    process,
                    applicationNumber: row.applicationNumber || null,
                    patentNumber: row.patentNumber || null,
                    emailDate: row.emailDate || new Date().toISOString().split('T')[0],
                    allocationDate: row.allocationDate || new Date().toISOString().split('T')[0],
                    processor,
                    qa,
                    workflowStatus,
                    processorStatus,
                    qaStatus,
                    processingDate: null,
                    qaDate: null,
                    reworkReason: null,
                    subject: row.subject || 'No Subject',
                    entries: [],
                } as Project;
            }).filter(p => p.refNumber);

            if (newProjects.length > 0) {
                setProjects(prev => [...newProjects, ...prev]);
                toast({
                    title: "Bulk Add Complete",
                    description: `${newProjects.length} projects have been added.`,
                });
            } else {
                 toast({ title: "Upload Error", description: "CSV file is empty or does not contain required 'refNumber' column.", variant: "destructive" });
            }
            setIsUploading(false);
            setSelectedFile(null);
        },
        error: (error: any) => {
            toast({ title: "Parsing Error", description: error.message, variant: "destructive" });
            setIsUploading(false);
        }
    });
  }


  const handleAdvancedSearch = (criteria: SearchCriteria) => {
    setSearchCriteria(criteria);

    let results = [...projects];
    
    if (criteria.length > 0) {
        results = results.filter(project => {
          return criteria.every(criterion => {
            if (!criterion.field || !criterion.operator) return true;
            // Allow blank search
            if (criterion.operator === 'blank') {
                return !project[criterion.field as keyof Project];
            }
            if (!criterion.value) return true;

            const fieldValue = project[criterion.field as keyof Project] as string | null | undefined;

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
                     // Adjust for timezone issues when comparing dates
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
  
  const handleManagerQuickSearch = () => {
    const lowercasedSearch = managerSearch.toLowerCase();
    let results = [...projects];

    if (!lowercasedSearch) {
        setFilteredProjects(results);
        return;
    }

    results = results.filter(p => {
        if (managerSearchColumn === 'any') {
            return Object.values(p).some(val => 
                String(val).toLowerCase().includes(lowercasedSearch)
            );
        } else {
            return (p[managerSearchColumn] as string)?.toString().toLowerCase().includes(lowercasedSearch);
        }
    });
    
    setFilteredProjects(results);
  };

  const handleResetAdvancedSearch = () => {
      setSearchCriteria(null);
      setFilteredProjects(null);
      setManagerSearch('');
      setManagerSearchColumn('any');
  }
  
  const handleOpenEditDialog = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  };
  
  const handleOpenAddRowsDialog = (project: Project) => {
    setSourceProject(project);
    setIsAddRowsDialogOpen(true);
  }


  const dashboardProjects = React.useMemo(() => {
    const isManagerOrAdminView = activeRole === 'Manager' || activeRole === 'Admin';
    
    let baseProjects: Project[];

    if (isManagerOrAdminView) {
        // For manager/admin, filteredProjects holds the results. If null, show nothing.
        baseProjects = filteredProjects ?? [];
    } else {
        baseProjects = [...projects];
        if (activeRole === 'Processor') {
          baseProjects = baseProjects.filter(p => p.processor === user.name && p.workflowStatus === 'With Processor' && processorActionableStatuses.includes(p.processorStatus));
        } else if (activeRole === 'QA') {
          baseProjects = baseProjects.filter(p => p.qa === user.name && p.workflowStatus === 'With QA');
        }
    }
    
    let filtered = baseProjects;
    
    // Quick search for non-manager roles (client-side filtering)
    if (search && !isManagerOrAdminView) {
        if (searchColumn === 'any') {
            const lowercasedSearch = search.toLowerCase();
            filtered = filtered.filter(p => {
                return Object.values(p).some(val => 
                    String(val).toLowerCase().includes(lowercasedSearch)
                );
            });
        } else {
            filtered = filtered.filter(p => 
                (p[searchColumn] as string)?.toString().toLowerCase().includes(search.toLowerCase())
            );
        }
    }

    if (clientNameFilter !== 'all' && !isManagerOrAdminView) {
        filtered = filtered.filter(p => p.clientName === clientNameFilter);
    }
    
    if (processFilter !== 'all' && !isManagerOrAdminView) {
        filtered = filtered.filter(p => p.process === processFilter);
    }
    
    if (sort) {
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
  }, [activeRole, user.name, projects, search, searchColumn, sort, filteredProjects, clientNameFilter, processFilter]);
  
  if (!activeRole) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const isManagerOrAdmin = activeRole === 'Manager' || activeRole === 'Admin';
  
  const columns = getColumns(
      isManagerOrAdmin, 
      rowSelection, 
      setRowSelection, 
      dashboardProjects,
      handleOpenEditDialog,
      handleOpenAddRowsDialog
  );
  const selectedBulkUpdateField = bulkUpdateFields.find(f => f.value === bulkUpdateField);

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
        <Header 
            user={user}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            search={search}
            setSearch={setSearch}
            searchColumn={searchColumn}
            setSearchColumn={setSearchColumn}
            managerSearch={managerSearch}
            setManagerSearch={setManagerSearch}
            managerSearchColumn={managerSearchColumn}
            setManagerSearchColumn={setManagerSearchColumn}
            handleManagerQuickSearch={handleManagerQuickSearch}
            handleDownload={handleDownload}
            isDownloadDisabled={dashboardProjects.length === 0}
            isManagerOrAdmin={isManagerOrAdmin}
            hasSearchResults={filteredProjects !== null}
            onAmendSearch={handleResetAdvancedSearch}
            onResetSearch={handleResetAdvancedSearch}
            clientNameFilter={clientNameFilter}
            setClientNameFilter={setClientNameFilter}
            processFilter={processFilter}
            setProcessFilter={setProcessFilter}
            clientNames={clientNames}
            processes={processes}
        />
        <div className="flex flex-col flex-grow overflow-y-auto p-4 gap-4">
            {activeRole === 'Admin' ? (
                <UserManagementTable sessionUser={user} />
            ) : isManagerOrAdmin ? (
              <>
                {filteredProjects === null ? (
                    <Accordion type="single" collapsible className="w-full space-y-4" defaultValue="work-status">
                        <AccordionItem value="work-allocation" className="border-none">
                                <div className="animated-border">
                                <AccordionTrigger className="p-3 bg-card rounded-md text-base font-semibold hover:no-underline">Work Allocation / Records Addition</AccordionTrigger>
                                <AccordionContent className="bg-card rounded-b-md">
                                    <Card className="border-0 shadow-none">
                                        <CardContent className="pt-4">
                                            <div className="flex items-center gap-4">
                                                <div 
                                                    className="flex items-center justify-center border-2 border-dashed rounded-md p-4 w-full cursor-pointer hover:bg-muted/50"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <div className="flex-grow flex items-center gap-2 text-muted-foreground">
                                                    <FileUp className="h-5 w-5" />
                                                    <span>{selectedFile ? selectedFile.name : 'Click to select a CSV file'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="flex justify-end gap-2">
                                            <Button variant="outline" onClick={() => setSelectedFile(null)} disabled={!selectedFile || isUploading}>
                                                <X className="mr-2 h-4 w-4" /> Cancel
                                            </Button>
                                            <Button onClick={handleProcessUpload} disabled={!selectedFile || isUploading}>
                                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                Upload
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </AccordionContent>
                                </div>
                        </AccordionItem>

                        <AccordionItem value="advanced-search" className="border-none">
                                <div className="animated-border">
                                <AccordionTrigger className="p-3 bg-card rounded-md text-base font-semibold hover:no-underline">Advanced Search</AccordionTrigger>
                                <AccordionContent className="pt-0 bg-card rounded-b-md">
                                        <AdvancedSearchForm onSearch={handleAdvancedSearch} initialCriteria={searchCriteria} />
                                </AccordionContent>
                                </div>
                        </AccordionItem>
                         <AccordionItem value="work-status" className="border-none">
                            <div className="animated-border">
                                <AccordionTrigger className="p-3 bg-card rounded-md text-base font-semibold hover:no-underline">Work Status</AccordionTrigger>
                                <AccordionContent className="bg-card rounded-b-md p-4">
                                     <div className="grid md:grid-cols-2 gap-4">
                                        <ProcessingStatusSummary projects={projects} />
                                        <QAStatusSummary projects={projects} />
                                    </div>
                                </AccordionContent>
                            </div>
                        </AccordionItem>
                    </Accordion>
                ) : (
                    <div className="space-y-4">
                        <DataTable 
                            data={dashboardProjects}
                            columns={columns}
                            sort={sort}
                            setSort={setSort}
                            rowSelection={rowSelection}
                            setRowSelection={setRowSelection}
                            isManagerOrAdmin={isManagerOrAdmin}
                            totalCount={dashboardProjects.length}
                        >
                            {Object.keys(rowSelection).length > 0 && (
                                <div className="flex items-center gap-4 p-4 border-t bg-muted/50">
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
                        </DataTable>
                    </div>
                )}
              </>
            ) : (
                <DataTable 
                    data={dashboardProjects}
                    columns={columns}
                    sort={sort}
                    setSort={setSort}
                    rowSelection={{}}
                    setRowSelection={() => {}}
                    isManagerOrAdmin={false}
                    totalCount={dashboardProjects.length}
                />
            )}
        </div>
    </div>
  );
}

export default Dashboard;
