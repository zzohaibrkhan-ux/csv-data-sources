'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, RefreshCw, Trash2, Eye, Database, Table as TableIcon, Clock, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  url: string;
  description: string | null;
  row_count: number;
  last_refresh: string | null;
  created_at: string;
  updated_at: string;
}

interface PreviewData {
  columns: string[];
  rows: Record<string, unknown>[];
}

export default function Home() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [pqDialogOpen, setPqDialogOpen] = useState(false);
  const [pqDataSource, setPqDataSource] = useState<DataSource | null>(null);

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [adding, setAdding] = useState(false);

  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDataSource, setPreviewDataSource] = useState<DataSource | null>(null);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/datasources');
      if (!response.ok) {
        if (response.status === 404) {
          setSetupRequired(true);
        }
        throw new Error('Failed to fetch data sources');
      }

      const data = await response.json();
      setDataSources(data);
      setSetupRequired(false);

      // Auto-initialize if no data sources exist
      if (data.length === 0) {
        try {
          await fetch('/api/initialize', { method: 'POST' });
          // Refresh data sources after initialization
          const refreshResponse = await fetch('/api/datasources');
          const refreshData = await refreshResponse.json();
          setDataSources(refreshData);
          toast({
            title: 'Initialized',
            description: 'Permanent data sources have been loaded',
          });
        } catch (initError) {
          console.error('Initialization error:', initError);
        }
      }
    } catch (error) {
      console.error('Error fetching data sources:', error);
      if (dataSources.length === 0) {
        setSetupRequired(true);
      }
      toast({
        title: 'Error',
        description: 'Failed to fetch data sources. Check dev logs for details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  const handleAddDataSource = async () => {
    if (!addName.trim() || !addUrl.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and URL are required',
        variant: 'destructive',
      });
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/datasources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName,
          url: addUrl,
          description: addDescription,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add data source');
      }

      toast({
        title: 'Success',
        description: 'Data source added successfully',
      });

      setAddDialogOpen(false);
      setAddName('');
      setAddUrl('');
      setAddDescription('');
      fetchDataSources();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add data source',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handlePreview = async (dataSource: DataSource) => {
    setPreviewDataSource(dataSource);
    setPreviewDialogOpen(true);
    setPreviewLoading(true);

    try {
      const response = await fetch(`/api/datasources/${dataSource.id}/preview`);
      if (!response.ok) {
        throw new Error('Failed to fetch preview data');
      }

      const data = await response.json();
      setPreviewData(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load preview data',
        variant: 'destructive',
      });
      setPreviewDialogOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRefresh = async (id: string) => {
    const response = await fetch(`/api/datasources/${id}/refresh`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to refresh data source');
    }

    toast({
      title: 'Success',
      description: 'Data source refreshed successfully',
    });

    fetchDataSources();
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/datasources/${deletingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete data source');
      }

      toast({
        title: 'Success',
        description: 'Data source deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchDataSources();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete data source',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handlePqClick = (dataSource: DataSource) => {
    setPqDataSource(dataSource);
    setPqDialogOpen(true);

    const connStr = "postgresql://postgres:JIbwnENPXBdeYx3D@db.rnacwhzrxqnsqnhwdbnj.supabase.co:5432/postgres";
    const mCode = `let
    ServerName = "db.rnacwhzrxqnsqnhwdbnj.supabase.co",
    Port = "5432",
    DatabaseName = "postgres"
in
    Source = Sql.Database("postgres", "\${connStr}")
in
    Source\`;

    toast({
      title: 'Power Query Connection',
      description: \`Connection string copied for \${dataSource.name}. Database: postgres. Password: JIbwnENPXBdeYx3D\`,
    });

    navigator.clipboard.writeText(connStr);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return \`\${(num / 1000000).toFixed(1)}M\`;
    }
    if (num >= 1000) {
      return \`\${(num / 1000).toFixed(1)}K\`;
    }
    return num.toString();
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return \`\${diffMins}m ago\`;
    if (diffHours < 24) return \`\${diffHours}h ago\`;
    return \`\${diffDays}d ago\`;
  };

  const totalRows = dataSources.reduce((sum, ds) => sum + ds.row_count, 0);

  if (setupRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Setup Required
            </CardTitle>
            <CardDescription>
              Please set up your Supabase database tables to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Before using the application, you need to execute the SQL schema in your Supabase database.
                Permanent data sources will be loaded automatically after setup.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h3 className="font-semibold">Setup Instructions:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to your Supabase dashboard</li>
                <li>Navigate to SQL Editor</li>
                <li>Click "New query"</li>
                <li>Copy the SQL from below and paste it</li>
                <li>Click Run to create the tables</li>
              </ol>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/setup', { method: 'POST' });
                    const data = await response.json();
                    navigator.clipboard.writeText(data.sql);
                    toast({
                      title: 'SQL Copied',
                      description: 'SQL schema copied to clipboard',
                    });
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: 'Failed to copy SQL',
                      variant: 'destructive',
                    });
                  }
                }}
                className="mb-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                Copy SQL Schema
              </Button>
              <p className="text-xs text-muted-foreground">
                Click this button to copy the SQL schema, then paste it in your Supabase SQL Editor.
              </p>
            </div>

            <Button
              onClick={fetchDataSources}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              I've Set Up The Database
            </Button>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              CSV Data Sources
            </h1>
            <p className="text-muted-foreground mt-2">
              Permanent data sources with Supabase backend
            </p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Plus className="h-5 w-5 mr-2" />
                Add Data Source
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Add New Data Source</DialogTitle>
                <DialogDescription>
                  Add a new CSV data source to your collection
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name *
                  </label>
                  <Input
                    id="name"
                    placeholder="e.g., Sales Data 2024"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="url" className="text-sm font-medium">
                    CSV URL *
                  </label>
                  <Input
                    id="url"
                    placeholder="https://example.com/data.csv"
                    value={addUrl}
                    onChange={(e) => setAddUrl(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    placeholder="Describe this data source..."
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  disabled={adding}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddDataSource} disabled={adding}>
                  {adding ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Data Source
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Total Sources
              </CardTitle>
              <Database className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {dataSources.length}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500/10 to-orange-500/10 border-pink-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-pink-700 dark:text-pink-300">
                Total Rows
              </CardTitle>
              <TableIcon className="h-4 w-4 text-pink-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">
                  {formatNumber(totalRows)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Last Updated
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {dataSources.length > 0
                    ? formatRelativeTime(
                        dataSources.reduce((latest, ds) =>
                          new Date(ds.last_refresh || 0) > new Date(latest.last_refresh || 0) ? ds : latest
                        ).last_refresh
                      )
                    )
                  )
                  : 'Never'}
                : 'Never'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Data Sources Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Data Sources</h2>
            <Badge variant="secondary">{dataSources.length} sources</Badge>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : dataSources.length === 0 ? (
            <Card className="p-12 text-center">
              <Database className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Data Sources Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first CSV data source to get started
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Add Data Source
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dataSources.map((dataSource) => (
                <Card key={dataSource.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{dataSource.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {dataSource.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Rows</span>
                        <Badge variant="secondary">{formatNumber(dataSource.row_count)}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last Refresh</span>
                        <span className="font-medium">{formatRelativeTime(dataSource.last_refresh)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Created</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(dataSource.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePreview(dataSource)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRefresh(dataSource.id)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Refresh
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePqClick(dataSource)}
                        >
                          <Database className="h-4 w-4 mr-1" />
                          PQ
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(dataSource.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground py-4">
          <p>Powered by Supabase • Data persists across page refreshes</p>
        </footer>
      </div>
    );
}
