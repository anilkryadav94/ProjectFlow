
"use client";

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, RotateCcw, Rows, Save, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from "papaparse";

import type { Project, Role, User, WorkflowStatus } from '@/lib/data';
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
import type { SearchableColumn } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { workflowStatuses } from '@/lib/data';
import { getAllClients, type Client } from '@/services/client-service';
import { getAllProcesses, type Process } from '@/services/process-service';
import { getAllCountries, type Country } from '@/services/country-service';
import { getAllDocumentTypes, type DocumentType } from '@/services/document-type-service';
import { getAllRenewalAgents, type RenewalAgent } from '@/services/renewal-agent-service';


type ViewType = 'table' | 'chart';

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
        clients: [] as Client[],
        processors: [] as { id: string, name: string }[],
        qas: [] as { id: string, name: string }[],
        caseManagers: [] as { id: string, name: string }[],
        processes: [] as Process[],
        countries: [] as Country[],
        documentTypes: [] as DocumentType[],
        renewalAgents: [] as RenewalAgent[],
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
    const [bulkUpdateField, setBulkUpdateField] = React.useState<keyof Project | 'processorId' | 'qaId' | 'caseManagerId'>('processorId');
    const [bulkUpdateValue, setBulkUpdateValue] = React.useState('');
    const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);
    const [search, setSearch] = React.useState(searchParams.get('quickSearch') || '');
    const [searchColumn, setSearchColumn] = React.useState<SearchableColumn>((searchParams.get('searchColumn') as SearchableColumn) || 'any');
    const [view, setView] = React.useState<ViewType>((searchParams.get('view') as ViewType) || 'table');
    const [chartData, setChartData] = React.useState<any[]>([]);

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
            const currentView = (searchParams.get('view') as ViewType) || 'table';
            const chartType = searchParams.get('chartType');
            setView(currentView);

            const filters = { quickSearch, searchColumn: searchColumnParam, advanced: advancedCriteria };

            if (currentView === 'chart') {
                const allProjectsForChart = await getProjectsForExport({ filters, sort: { key: sortKey, direction: sortDir } });
                 if (chartType === 'projectsByStatus') {
                    const statusCounts = workflowStatuses.reduce((acc, status) => {
                        acc[status] = 0;
                        return acc;
                    }, {} as Record<WorkflowStatus, number>);

                    allProjectsForChart.forEach(p => {
                        if (p.workflowStatus) {
                            statusCounts[p.workflowStatus]++;
                        }
                    });
                    
                    const newChartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
                    setChartData(newChartData);
                }
                setDataState(s => ({...s, projects: [], totalCount: 0, totalPages: 1}));
            } else {
                 const { projects, totalCount, totalPages } = await getPaginatedProjects({
                    page,
                    limit: 20,
                    filters,
                    sort: { key: sortKey, direction: sortDir },
                });
                 setDataState({
                    projects,
                    totalCount,
                    totalPages,
                    page,
                    sort: { key: sortKey, direction: sortDir },
                });
            }

            const [allUsers, clients, processes, countries, documentTypes, renewalAgents] = await Promise.all([
                getUsers(),
                getAllClients(),
                getAllProcesses(),
                getAllCountries(),
                getAllDocumentTypes(),
                getAllRenewalAgents()
            ]);
            setDropdownOptions({
                clients,
                processes,
                countries,
                documentTypes,
                renewalAgents,
                processors: allUsers.filter(u => u.roles.includes('Processor')).map(u => ({ id: u.id, name: u.name })).sort((a, b) => a.name.localeCompare(b.name)),
                qas: allUsers.filter(u => u.roles.includes('QA')).map(u => ({ id: u.id, name: u.name })).sort((a, b) => a.name.localeCompare(b.name)),
                caseManagers: allUsers.filter(u => u.roles.includes('Case Manager')).map(u => ({ id: u.id, name: u.name })).sort((a, b) => a.name.localeCompare(b.name)),
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
    
    const handleQuickSearch = () => {
        if (!search.trim()) {
             toast({ title: "Empty Search", description: "Please enter a value to search.", variant: "destructive" });
            return;
        }
        const params = new URLSearchParams();
        params.set('quickSearch', search);
        params.set('searchColumn', searchColumn);
        params.delete('view'); // Reset to table view
        params.delete('chartType');
        router.push(`/search?${params.toString()}`);
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
                visibleColumns: visibleColumnKeys,
            });

            if (projectsToExport.length === 0) {
                toast({ title: "No data to export", variant: "destructive" });
                return;
            }

            const csv = Papa.unparse(projectsToExport as any);
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
            await bulkUpdateProjects({ projectIds, field: bulkUpdateField, value: bulkUpdateValue });
            toast({ title: "Success", description: `${projectIds.length} projects have been updated.` });
            fetchPageData(); // Refresh data
            setRowSelection({});
            setBulkUpdateValue('');

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
        value: 'processorId' | 'qaId' | 'caseManagerId' | 'client_name' | 'process';
        label: string;
        options: { id: string, name: string }[] | { name: string }[];
        type: 'select-id' | 'select-name';
      }[] = [
        { value: 'processorId', label: 'Processor', options: dropdownOptions.processors, type: 'select-id' },
        { value: 'qaId', label: 'QA', options: dropdownOptions.qas, type: 'select-id' },
        { value: 'caseManagerId', label: 'Case Manager', options: dropdownOptions.caseManagers, type: 'select-id' },
        { value: 'client_name', label: 'Client Name', options: dropdownOptions.clients, type: 'select-name' },
        { value: 'process', label: 'Process', options: dropdownOptions.processes, type: 'select-name' },
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
    
    const showSubHeader = view === 'table' && dataState.projects.length > 0;
    const chartConfig = { value: { label: "Count", color: "hsl(var(--chart-1))" } };


    return (
        <div className="flex flex-col h-screen bg-background w-full">
            {editingProject && (
                 <EditProjectDialog
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    project={editingProject}
                    onUpdateSuccess={fetchPageData}
                    userRole={'Manager'}
                    clientNames={dropdownOptions.clients.map(c => c.name)}
                    processors={dropdownOptions.processors.map(p => p.name)}
                    qas={dropdownOptions.qas.map(q => q.name)}
                    caseManagers={dropdownOptions.caseManagers.map(cm => cm.name)}
                    processes={dropdownOptions.processes.map(p => p.name)}
                    countries={dropdownOptions.countries.map(c => c.name)}
                    documentTypes={dropdownOptions.documentTypes.map(d => d.name)}
                    renewalAgents={dropdownOptions.renewalAgents.map(r => r.name)}
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
                search={search}
                setSearch={setSearch}
                searchColumn={searchColumn}
                setSearchColumn={setSearchColumn}
                onQuickSearch={handleQuickSearch}
                isManagerOrAdmin={true}
                showManagerSearch={true}
                clients={dropdownOptions.clients}
                processes={dropdownOptions.processes}
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


            <main className="flex flex-col flex-grow overflow-y-auto transition-opacity duration-300 p-4">
                 {view === 'table' ? (
                     <div className="flex-grow flex flex-col overflow-y-auto">
                        {Object.keys(rowSelection).length > 0 && (
                            <div className="flex-shrink-0 flex items-center gap-4 p-4 border-b bg-muted/50">
                                <span className="text-sm font-semibold">{Object.keys(rowSelection).length} selected</span>
                                <div className="flex items-center gap-2">
                                    <Select value={bulkUpdateField} onValueChange={(v) => {
                                        setBulkUpdateField(v as any);
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
                                                <SelectItem key={'id' in opt ? opt.id : opt.name} value={'id' in opt ? opt.id : opt.name}>{opt.name}</SelectItem>
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
                 ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Projects by Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={chartConfig} className="w-full h-[400px]">
                                <BarChart data={chartData} accessibilityLayer>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                     <ChartLegend content={<ChartLegendContent />} />
                                    <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                 )}
            </main>
        </div>
    );
}

