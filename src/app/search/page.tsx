
"use client";

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, RotateCcw, Rows, Save, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from "papaparse";

import type { Project, Role, User, ProcessType } from '@/lib/data';
import { getSession, onAuthChanged, getUsers } from '@/lib/auth';
import { getPaginatedProjects, bulkUpdateProjects, getProjectsForExport } from '@/app/actions';
import { SearchCriteria } from '@/components/advanced-search-form';
import { allColumns, getColumns } from '@/components/columns';
import { ColumnSelectDialog } from '@/components/column-select-dialog';
import { DataTable } from '@/components/data-table';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditProjectDialog } from '@/components/edit-project-dialog';
import { AddRowsDialog } from '@/components/add-rows-dialog';

interface SearchResultsState {
    projects: Project[];
    totalCount: number;
    totalPages: number;
    sort: { key: keyof Project, direction: 'asc' | 'desc' };
    page: number;
}

export default function SearchResultsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    // Consolidated loading state
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSwitching, setIsSwitching] = React.useState(false);
    const [switchingToRole, setSwitchingToRole] = React.useState<Role | null>(null);

    // Data state
    const [user, setUser] = React.useState<User | null>(null);
    const [dataState, setDataState] = React.useState<SearchResultsState>({
        projects: [],
        totalCount: 0,
        totalPages: 1,
        page: 1,
        sort: { key: 'row_number', direction: 'desc' },
    });
    const [dropdownOptions, setDropdownOptions] = React.useState({
        clientNames: [] as string[],
        processors: [] as string[],
        qas: [] as string[],
        caseManagers: [] as string[],
        processes: [] as ProcessType[],
    });

    // UI state
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
    const [isColumnSelectOpen, setIsColumnSelectOpen] = React.useState(false);
    const [visibleColumnKeys, setVisibleColumnKeys] = React.useState<string[]>([]);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [editingProject, setEditingProject] = React.useState<Project | null>(null);
    const [isAddRowsDialogOpen, setIsAddRowsDialogOpen] = React.useState(false);
    const [sourceProject, setSourceProject] = React.useState<Project | null>(null);
    const [bulkUpdateField, setBulkUpdateField] = React.useState<keyof Project>('processor');
    const [bulkUpdateValue, setBulkUpdateValue] = React.useState('');
    const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);

    const loadColumnLayout = (role: Role) => {
        const savedLayout = localStorage.getItem(`columnLayout-${role}`);
        if (savedLayout) {
            setVisibleColumnKeys(JSON.parse(savedLayout));
        } else {
            setVisibleColumnKeys([
                'select', 'actions', 'row_number', 'ref_number', 'client_name', 'process', 'processor', 'qa', 'case_manager', 'workflowStatus', 'processing_status', 'qa_status', 'received_date', 'allocation_date', 'processing_date', 'qa_date'
            ]);
        }
    };

    const saveColumnLayout = () => {
        if (user?.roles.includes('Manager')) {
            localStorage.setItem(`columnLayout-Manager`, JSON.stringify(visibleColumnKeys));
            toast({
                title: "Layout Saved",
                description: `Your column layout for the Manager role has been saved.`,
            });
        }
    };

    const fetchPageData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const page = parseInt(searchParams.get('page') || '1', 10);
            const sortKey = (searchParams.get('sort') || 'row_number') as keyof Project;
            const sortDir = (searchParams.get('dir') || 'desc') as 'asc' | 'desc';
            
            const quickSearch = searchParams.get('quickSearch') || '';
            const searchColumnParam = searchParams.get('searchColumn') || 'any';
            let advancedCriteria: SearchCriteria | null = null;
            if (searchParams.get('advanced') === 'true') {
                advancedCriteria = JSON.parse(searchParams.get('criteria') || '[]');
            }

            const [{ projects, totalCount, totalPages }, allUsers] = await Promise.all([
                 getPaginatedProjects({
                    page,
                    limit: 50,
                    filters: { quickSearch, searchColumn: searchColumnParam, advanced: advancedCriteria },
                    sort: { key: sortKey, direction: sortDir },
                }),
                getUsers()
            ]);
            
            setDropdownOptions({
                clientNames: [...new Set(allUsers.map(u => u.name).filter(Boolean))].sort(),
                processors: allUsers.filter(u => u.roles.includes('Processor')).map(u => u.name).sort(),
                qas: allUsers.filter(u => u.roles.includes('QA')).map(u => u.name).sort(),
                caseManagers: allUsers.filter(u => u.roles.includes('Case Manager')).map(u => u.name).sort(),
                processes: ['Patent', 'TM', 'IDS', 'Project'] as ProcessType[],
            });

            setDataState({
                projects,
                totalCount,
                totalPages,
                page,
                sort: { key: sortKey, direction: sortDir },
            });
        } catch (err) {
            console.error("Error fetching search results:", err);
            toast({ title: "Error", description: "Could not load search results.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [searchParams, toast]);
    
    React.useEffect(() => {
        const unsubscribe = onAuthChanged(async (fbUser) => {
            if (fbUser) {
                const session = await getSession();
                if (session) {
                    setUser(session.user);
                    loadColumnLayout('Manager'); // Search page is a Manager view
                    fetchPageData();
                } else {
                    router.push('/login');
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [fetchPageData, router]);

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        router.push(`/search?${params.toString()}`);
    };

    const handleResetSearch = () => {
        router.push('/?role=Manager');
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const sortKey = (searchParams.get('sort') || 'row_number') as keyof Project;
            const sortDir = (searchParams.get('dir') || 'desc') as 'asc' | 'desc';
            const quickSearch = searchParams.get('quickSearch') || '';
            const searchColumnParam = searchParams.get('searchColumn') || 'any';
            let advancedCriteria: SearchCriteria | null = null;
            if (searchParams.get('advanced') === 'true') {
                advancedCriteria = JSON.parse(searchParams.get('criteria') || '[]');
            }

            const projectsToExport = await getProjectsForExport({
                filters: { quickSearch, searchColumn: searchColumnParam, advanced: advancedCriteria },
                sort: { key: sortKey, direction: sortDir },
            });

            if (projectsToExport.length === 0) {
                toast({ title: "No data to export", variant: "destructive" });
                return;
            }

            const csv = Papa.unparse(projectsToExport);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `projects_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Error exporting data:", err);
            toast({ title: "Export Error", description: "Could not export project data.", variant: "destructive" });
        } finally {
            setIsDownloading(false);
        }
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
                fetchPageData(); // Refresh data
                setRowSelection({});
                setBulkUpdateValue('');
            } else {
                throw new Error(result.error || "An unknown error occurred.");
            }
        } catch(e) {
            toast({ title: "Error", description: `Failed to update projects. ${e instanceof Error ? e.message : ''}`, variant: "destructive"});
        } finally {
            setIsBulkUpdating(false);
        }
    };
    
    const handleOpenEditDialog = (project: Project) => {
        setEditingProject(project);
        setIsEditDialogOpen(true);
    };
    
    const handleAddRowsDialog = (project: Project) => {
        setSourceProject(project);
        setIsAddRowsDialogOpen(true);
    };

    const handleRoleSwitch = (role: Role) => {
        setIsSwitching(true);
        setSwitchingToRole(role);
        router.push(`/?role=${role}`);
    };

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


    if (isLoading || !user || visibleColumnKeys.length === 0) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    {isSwitching ? (
                         <p className="text-lg text-muted-foreground">
                            Opening {switchingToRole} Dashboard...
                        </p>
                    ) : (
                        <p className="text-lg text-muted-foreground">Loading Search Results...</p>
                    )}
                </div>
            </div>
        );
    }
    
    const columns = getColumns(
        true, // isManagerOrAdmin
        'Manager',
        rowSelection, 
        setRowSelection, 
        dataState.projects,
        handleOpenEditDialog,
        handleAddRowsDialog,
        visibleColumnKeys
    );
    
    const showSubHeader = dataState.totalCount > 0;

    return (
        <div className="flex flex-col h-screen bg-background w-full">
            {editingProject && (
                 <EditProjectDialog
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    project={editingProject}
                    onUpdateSuccess={fetchPageData}
                    userRole={'Manager'}
                    clientNames={dropdownOptions.clientNames}
                    processors={dropdownOptions.processors}
                    qas={dropdownOptions.qas}
                    caseManagers={dropdownOptions.caseManagers}
                    processes={dropdownOptions.processes}
                />
            )}
            {sourceProject && (
              <AddRowsDialog
                isOpen={isAddRowsDialogOpen}
                onOpenChange={setIsAddRowsDialogOpen}
                sourceProject={sourceProject}
                onAddRowsSuccess={fetchPageData}
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
                activeRole="Manager"
                setActiveRole={handleRoleSwitch}
                isManagerOrAdmin={true}
                clientNames={dropdownOptions.clientNames}
                processes={dropdownOptions.processes}
                showManagerSearch={false}
            />
            
            {showSubHeader && (
                <div className="flex-shrink-0 border-b bg-muted">
                    <div className="flex items-center justify-end gap-2 px-4 py-1">
                        <Button variant="outline" className="h-7 px-2 text-xs" onClick={handleResetSearch}>
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset Search
                        </Button>
                        <Button variant="outline" className="h-7 px-2 text-xs" onClick={() => setIsColumnSelectOpen(true)}>
                            <Rows className="mr-1.5 h-3.5 w-3.5" />
                            Select Columns
                        </Button>
                        <Button variant="outline" className="h-7 px-2 text-xs" onClick={saveColumnLayout}>
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            Save Layout
                        </Button>
                        <Button 
                            variant="outline" 
                            className="h-7 px-2 text-xs" 
                            onClick={handleDownload} 
                            disabled={dataState.totalCount === 0 || isDownloading}
                            title="Download CSV"
                        >
                            {isDownloading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />}
                             Download
                        </Button>
                    </div>
                </div>
            )}


            <main className="flex flex-col flex-grow overflow-y-auto transition-opacity duration-300">
                 <div className="flex-grow flex flex-col overflow-y-auto">
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
                    <div className="flex-grow">
                        <DataTable 
                            data={dataState.projects}
                            columns={columns}
                            sort={dataState.sort}
                            setSort={(newSort) => setDataState(s => ({ ...s, sort: newSort as any }))}
                            rowSelection={rowSelection}
                            setRowSelection={setRowSelection}
                            isManagerOrAdmin={true}
                            totalCount={dataState.totalCount}
                            activeRole="Manager"
                            page={dataState.page}
                            totalPages={dataState.totalPages}
                            onPageChange={handlePageChange}
                            isFetching={isLoading}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
