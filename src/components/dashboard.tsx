
"use client";

import * as React from 'react';
import Papa from "papaparse";
import { type Project, type Role, type User, roleHierarchy, processors, qas, projectStatuses, clientNames, processes, processorActionableStatuses } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/columns';
import { Header } from '@/components/header';
import { UserManagementTable } from './user-management-table';
import { Button } from './ui/button';
import { bulkUpdateProjects } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2 } from 'lucide-react';
import { AdvancedSearchForm, type SearchCriteria } from './advanced-search-form';
import { useSearchParams } from 'next/navigation';

interface DashboardProps {
  user: User;
  initialProjects: Project[];
}

export function DashboardWrapper(props: DashboardProps) {
    return (
        <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <Dashboard {...props} />
        </React.Suspense>
    )
}


export type SearchableColumn = 'refNumber' | 'applicationNumber' | 'patentNumber' | 'subject' | 'processorStatus' | 'qaStatus' | 'workflowStatus' | 'allocationDate' | 'emailDate';

const bulkUpdateFields = [
    { value: 'processor', label: 'Processor', options: processors },
    { value: 'qa', label: 'QA', options: qas },
] as const;

function Dashboard({ 
  user, 
  initialProjects,
}: DashboardProps) {
  const searchParams = useSearchParams();
  const urlRole = searchParams.get('role') as Role;

  const [activeRole, setActiveRole] = React.useState<Role | null>(null);
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [search, setSearch] = React.useState('');
  const [searchColumn, setSearchColumn] = React.useState<SearchableColumn>('refNumber');
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'allocationDate', direction: 'desc' });
  
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [bulkUpdateField, setBulkUpdateField] = React.useState<(typeof bulkUpdateFields)[number]['value']>('processor');
  const [bulkUpdateValue, setBulkUpdateValue] = React.useState('');
  const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);

  const [searchCriteria, setSearchCriteria] = React.useState<SearchCriteria | null>(null);
  const [showSearchForm, setShowSearchForm] = React.useState(true);
  const [filteredProjects, setFilteredProjects] = React.useState<Project[] | null>(null);

  const [clientNameFilter, setClientNameFilter] = React.useState('all');
  const [processFilter, setProcessFilter] = React.useState<string | 'all'>('all');
  

  const { toast } = useToast();

  React.useEffect(() => {
    if (urlRole && user.roles.includes(urlRole)) {
        setActiveRole(urlRole);
    } else if (user?.roles?.length > 0) {
      const highestRole = roleHierarchy.find(role => user.roles.includes(role));
      setActiveRole(highestRole || user.roles[0]);
    }
  }, [user.roles, urlRole]);
  
  const handleDownload = () => {
    const dataToExport = filteredProjects ?? dashboardProjects;
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
        const result = await bulkUpdateProjects({ projectIds, field: bulkUpdateField, value: bulkUpdateValue });
        if (result.success) {
            setProjects(prevProjects => {
                const updated = new Map(result.updatedProjects.map(p => [p.id, p]));
                return prevProjects.map(p => updated.get(p.id) || p);
            });
            if (filteredProjects) {
                 setFilteredProjects(prevProjects => {
                    if (!prevProjects) return null;
                    const updated = new Map(result.updatedProjects.map(p => [p.id, p]));
                    return prevProjects.map(p => updated.get(p.id) || p);
                });
            }
            toast({ title: "Success", description: `${result.updatedProjects.length} projects have been updated.` });
            setRowSelection({});
            setBulkUpdateValue('');
        }
    } catch (error) {
        toast({ title: "Bulk Update Failed", description: "An error occurred.", variant: "destructive" });
    } finally {
        setIsBulkUpdating(false);
    }
  };

  const handleAdvancedSearch = (criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
    setShowSearchForm(false);

    let results = [...projects];
    
    results = results.filter(project => {
      return criteria.every(criterion => {
        if (!criterion.field || !criterion.operator || (criterion.operator !== 'blank' && !criterion.value)) return true;
        const fieldValue = project[criterion.field as keyof Project] as string | null | undefined;

        switch (criterion.operator) {
            case 'blank':
                return !fieldValue;
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
                 return new Date(fieldValue).toDateString() === new Date(criterion.value).toDateString();
            default:
                return true;
        }
      });
    });
    setFilteredProjects(results);
  };
  
  const handleResetAdvancedSearch = () => {
      setSearchCriteria(null);
      setFilteredProjects(null);
      setShowSearchForm(true);
  }

  const handleAmendSearch = () => {
      setFilteredProjects(null);
      setShowSearchForm(true);
  }

  const dashboardProjects = React.useMemo(() => {
    const isManagerOrAdminView = activeRole === 'Manager' || activeRole === 'Admin';
    
    if (isManagerOrAdminView) {
        if (!filteredProjects && showSearchForm) {
            return [];
        }

        let baseProjects = showSearchForm ? [] : (filteredProjects ?? projects);

        if (search) {
             baseProjects = baseProjects.filter(p => 
                (p[searchColumn] as string)?.toLowerCase().includes(search.toLowerCase())
             );
        }
        return baseProjects;
    }
    
    let filtered = [...projects];

    if (activeRole === 'Processor') {
      filtered = filtered.filter(p => p.processor === user.name && p.workflowStatus === 'With Processor' && processorActionableStatuses.includes(p.processorStatus));
    } else if (activeRole === 'QA') {
      filtered = filtered.filter(p => p.qa === user.name && p.workflowStatus === 'With QA');
    }

    if (search) {
      filtered = filtered.filter(p => 
        (p[searchColumn] as string)?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (clientNameFilter !== 'all') {
        filtered = filtered.filter(p => p.clientName === clientNameFilter);
    }
    
    if (processFilter !== 'all') {
        filtered = filtered.filter(p => p.process === processFilter);
    }
    
    if (sort) {
      filtered.sort((a, b) => {
        const valA = a[sort.key];
        const valB = b[sort.key];
        if (valA === null) return 1; if (valB === null) return -1;
        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [activeRole, user.name, projects, search, searchColumn, sort, filteredProjects, clientNameFilter, processFilter, showSearchForm]);


  if (!activeRole) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const isManagerOrAdmin = activeRole === 'Manager' || activeRole === 'Admin';
  const columns = getColumns(
      isManagerOrAdmin, 
      rowSelection, 
      setRowSelection, 
      dashboardProjects,
      activeRole,
      { search, searchColumn, clientName: clientNameFilter, process: processFilter }
  );
  const selectedBulkUpdateField = bulkUpdateFields.find(f => f.value === bulkUpdateField);

  return (
    <div className="flex flex-col h-screen bg-background w-full">
        <Header 
            user={user}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            search={search}
            setSearch={setSearch}
            searchColumn={searchColumn}
            setSearchColumn={setSearchColumn}
            handleDownload={handleDownload}
            isDownloadDisabled={dashboardProjects.length === 0}
            isManagerOrAdmin={isManagerOrAdmin}
            hasSearchResults={filteredProjects !== null}
            onAmendSearch={handleAmendSearch}
            onResetSearch={handleResetAdvancedSearch}
            clientNameFilter={clientNameFilter}
            setClientNameFilter={setClientNameFilter}
            processFilter={processFilter}
            setProcessFilter={setProcessFilter}
            clientNames={clientNames}
            processes={processes}
        />
        <div className="flex flex-col flex-grow overflow-hidden p-4 gap-4">
            {activeRole === 'Admin' ? (
                <UserManagementTable sessionUser={user} />
            ) : isManagerOrAdmin ? (
              <>
                {showSearchForm && <AdvancedSearchForm onSearch={handleAdvancedSearch} initialCriteria={searchCriteria} />}
                
                {!showSearchForm && (
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
