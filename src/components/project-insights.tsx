
"use client";

import * as React from "react";
import { Loader2, WandSparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { askProjectInsights, type InsightResponse } from "@/ai/flows/project-insights-flow";
import type { Project } from "@/lib/data";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";

interface ProjectInsightsProps {
  projects: Project[];
}

export function ProjectInsights({ projects }: ProjectInsightsProps) {
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [response, setResponse] = React.useState<InsightResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !projects || projects.length === 0) {
      if (!projects || projects.length === 0) {
        setError("There is no project data available to analyze.");
      }
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setError(null);

    try {
      // Pass the query and the project data to the AI flow
      const result = await askProjectInsights({ query, projects });
      setResponse(result);
    } catch (err) {
      console.error("AI Insight Error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderResponse = () => {
    if (!response) return null;

    if (response.responseType === "text") {
      return <p className="text-sm whitespace-pre-wrap">{response.data}</p>;
    }

    if (response.responseType === "chart" && Array.isArray(response.data) && response.data.length > 0) {
      const chartData = response.data as { name: string; value: number }[];
      
      const chartConfig = {
        value: {
          label: "Value",
          color: "hsl(var(--chart-1))",
        },
      };

      return (
        <ChartContainer config={chartConfig} className="w-full h-[300px]">
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 15)}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={4} />
          </BarChart>
        </ChartContainer>
      );
    }

    return <p className="text-sm text-muted-foreground">The AI returned an empty or invalid response.</p>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Project Insights</CardTitle>
        <CardDescription>
          Ask questions about the project data currently loaded on your dashboard.
          For example: "How many projects are assigned to Anil?" or "Show me a chart of projects by client name."
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="e.g., What is the status of projects for Client A?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="mr-2 h-4 w-4" />
            )}
            Ask AI
          </Button>
        </form>

        {(isLoading || response || error) && (
          <div className="mt-6 p-4 border rounded-md min-h-[100px] flex items-center justify-center bg-muted/50">
            {isLoading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
            {error && <p className="text-destructive text-sm">{error}</p>}
            {response && renderResponse()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
