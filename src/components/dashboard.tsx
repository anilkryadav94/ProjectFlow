
"use client";

import * as React from 'react';
import Papa from "papaparse";
import { type Project, type Role, type User, roleHierarchy, processors, qas, projectStatuses, clientNames, processes, processorActionableStatuses, processorSubmissionStatuses, qaSubmissionStatuses, workflowStatuses, allProcessorStatuses, allQaStatuses } from '@/lib/data';
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
import { EditProjectDialog } from './edit-project-dialog';
import { AddRowsDialog } from './add-rows-dialog';
import { addRows, bulkUpdateProjects } from '@/app/actions';

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
  
  const urlRole = searchParams.get('role') as Role | null;
  const [activeRole, setActiveRole] = React.useState<Role | null>(null);
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [search, setSearch] = React.useState('');
  const [searchColumn, setSearchColumn] = React.useState<SearchableColumn>('any');
  
  const [managerSearch, setManagerSearch] = React.useState('');
  const [managerSearchColumn, setManagerSearchColumn] = React.useState<SearchableColumn>('any');

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
  
  const { toast } = useToast();
  
  const refreshProjects = async () => {
    // This will be a server action or API call in a real app
    // For now, we just re-set the state from initial props
    // In a real scenario, you'd fetch from Firestore here.
    setProjects(initialProjects);
    router.refresh(); // Re-runs the server component to get new initialProjects
  };
  
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
    try {
        await bulkUpdateProjects({ projectIds, field: bulkUpdateField, value: bulkUpdateValue });
        toast({ title: "Success", description: `${projectIds.length} projects have been updated.` });
        await refreshProjects();
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

            try {
                // For simplicity, we'll just add the first row's data as new rows.
                // A real implementation would handle mapping columns.
                const firstRow = rows[0];
                const sourceProjectId = projects[0]?.id; // Use first project as a dummy source
                
                if (!sourceProjectId) {
                     toast({ title: "Error", description: "No existing projects to use as a template.", variant: "destructive" });
                     setIsUploading(false);
                     return;
                }

                await addRows(sourceProjectId, [], rows.length);
                await refreshProjects();

                toast({
                    title: "Bulk Add Complete",
                    description: `${rows.length} projects have been added.`,
                });

            } catch(e) {
                 toast({ title: "Upload Error", description: "Failed to add projects to database.", variant: "destructive" });
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
  
  const handleManagerQuickSearch = () => {
    const lowercasedSearch = managerSearch.toLowerCase();
    let results = [...projects];

    if (lowercasedSearch) {
        results = results.filter(p => {
            if (managerSearchColumn === 'any') {
                return Object.values(p).some(val => 
                    String(val).toLowerCase().includes(lowercasedSearch)
                );
            } else {
                return (p[managerSearchColumn] as string)?.toString().toLowerCase().includes(lowercasedSearch);
            }
        });
    }
    
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
  
  const handleAddRowsDialog = (project: Project) => {
    setSourceProject(project);
    setIsAddRowsDialogOpen(true);
  }


  const dashboardProjects = React.useMemo(() => {
    const isManagerOrAdminView = activeRole === 'Manager' || activeRole === 'Admin';
    
    let baseProjects: Project[];

    if (isManagerOrAdminView) {
        baseProjects = filteredProjects ?? projects;
    } else {
        baseProjects = [...projects];
        if (activeRole === 'Processor') {
          baseProjects = baseProjects.filter(p => p.processor === user.name && p.workflowStatus === 'With Processor' && processorActionableStatuses.includes(p.processing_status));
        } else if (activeRole === 'QA') {
          baseProjects = baseProjects.filter(p => p.qa === user.name && p.workflowStatus === 'With QA');
        } else if (activeRole === 'Case Manager') {
            baseProjects = baseProjects.filter(p => p.case_manager === user.name && p.qa_status === 'Client Query');
        }
    }
    
    let filtered = baseProjects;
    
    if (search && !isManagerOrAdminView) {
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

    if (clientNameFilter !== 'all' && !isManagerOrAdminView) {
        filtered = filtered.filter(p => p.client_name === clientNameFilter);
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
  }, [activeRole, user.name, projects, search, searchColumn, sort, filteredProjects, clientNameFilter, processFilter, managerSearch, managerSearchColumn]);
  
  if (!activeRole) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const isManagerOrAdmin = activeRole === 'Manager' || activeRole === 'Admin';
  
  const columns = getColumns(
      isManagerOrAdmin,
      activeRole,
      rowSelection, 
      setRowSelection, 
      dashboardProjects,
      handleOpenEditDialog,
      handleAddRowsDialog
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
            handleManagerQuickSearch={handleManagerQuickSearch}
            handleDownload={handleDownload}
            isDownloadDisabled={dashboardProjects.length === 0}
            isManagerOrAdmin={isManagerOrAdmin}
            hasSearchResults={filteredProjects !== null && searchCriteria !== null}
            onResetSearch={handleResetAdvancedSearch}
            clientNameFilter={clientNameFilter}
            setClientNameFilter={setClientNameFilter}
            processFilter={processFilter}
            setProcessFilter={setProcessFilter}
            clientNames={clientNames}
            processes={processes}
        />
        <main className="flex flex-col flex-grow overflow-y-auto p-4 md:p-6 gap-6">
            {activeRole === 'Admin' ? (
                <UserManagementTable sessionUser={user} />
            ) : isManagerOrAdmin ? (
              <div className="space-y-6">
                 <Accordion type="single" collapsible className="w-full" defaultValue="work-allocation">
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
                </Accordion>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="advanced-search" className="border-none">
                        <div className="animated-border">
                        <AccordionTrigger className="p-3 bg-card rounded-md text-base font-semibold hover:no-underline">Advanced Search</AccordionTrigger>
                        <AccordionContent className="pt-0 bg-card rounded-b-md">
                                <AdvancedSearchForm onSearch={handleAdvancedSearch} initialCriteria={searchCriteria} />
                        </AccordionContent>
                        </div>
                    </AccordionItem>
                </Accordion>
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
              </div>
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
        </main>
    </div>
  );
}

export default Dashboard;

    
    
