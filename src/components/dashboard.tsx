"use client";

import * as React from 'react';
import { addDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from "@/hooks/use-toast"
import { type Project, projects as initialProjects, type Role } from '@/lib/data';
import { DataTable } from '@/components/data-table';
import { columns } from '@/components/columns';
import { Header } from '@/components/header';
import { ManagerView } from '@/components/manager-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Dashboard() {
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [filteredProjects, setFilteredProjects] = React.useState<Project[]>(initialProjects);
  const [search, setSearch] = React.useState('');
  const [role, setRole] = React.useState<Role>('Admin');
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [sort, setSort] = React.useState<{ key: keyof Project; direction: 'asc' | 'desc' } | null>({ key: 'allocationDate', direction: 'desc' });
  const { toast } = useToast();

  React.useEffect(() => {
    let newFilteredProjects = [...projects];

    // Role-based filtering
    if (role === 'Processor') {
        // For demo, let's assume the processor is 'Alice'
        newFilteredProjects = newFilteredProjects.filter(p => p.processor === 'Alice');
    } else if (role === 'QA') {
        // For demo, let's assume the QA is 'David'
        newFilteredProjects = newFilteredProjects.filter(p => p.qa === 'David');
    }

    // Search filtering
    if (search) {
      newFilteredProjects = newFilteredProjects.filter(project =>
        project.applicationNumber.toLowerCase().includes(search.toLowerCase()) ||
        project.patentNumber.toLowerCase().includes(search.toLowerCase()) ||
        project.refNumber.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Date range filtering on 'allocationDate'
    if (date?.from && date?.to) {
        newFilteredProjects = newFilteredProjects.filter(project => {
            const allocationDate = new Date(project.allocationDate);
            return allocationDate >= date.from! && allocationDate <= date.to!;
        });
    }

    // Sorting
    if (sort) {
      newFilteredProjects.sort((a, b) => {
        const valA = a[sort.key];
        const valB = b[sort.key];

        if (valA === null) return 1;
        if (valB === null) return -1;

        if (valA < valB) {
          return sort.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredProjects(newFilteredProjects);
  }, [search, date, sort, projects, role]);

  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(prevProjects => {
        const existingProjectIndex = prevProjects.findIndex(p => p.id === updatedProject.id);
        if (existingProjectIndex > -1) {
            const newProjects = [...prevProjects];
            newProjects[existingProjectIndex] = updatedProject;
            return newProjects;
        }
        return [updatedProject, ...prevProjects];
    });
    toast({
        title: "Project Saved",
        description: `Project ${updatedProject.refNumber} has been updated.`,
    })
  };

  const exportToCsv = () => {
    const csvHeader = Object.keys(filteredProjects[0]).join(',');
    const csvRows = filteredProjects.map(row => 
      Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = `${csvHeader}\n${csvRows.join('\n')}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `ProjectFlow_Export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
        title: "Export Complete",
        description: "Your data has been downloaded as a CSV file.",
    })
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <Tabs defaultValue="projects" className="space-y-4">
        <Header 
          search={search}
          setSearch={setSearch}
          role={role}
          setRole={setRole}
          date={date}
          setDate={setDate}
          onExport={exportToCsv}
          onProjectUpdate={handleProjectUpdate}
        />
        <TabsContent value="projects" className="space-y-4">
          <DataTable 
            data={filteredProjects}
            columns={columns}
            sort={sort}
            setSort={setSort}
            onProjectUpdate={handleProjectUpdate}
          />
        </TabsContent>
        <TabsContent value="manager" className="space-y-4">
          <ManagerView />
        </TabsContent>
       </Tabs>
    </div>
  );
}
