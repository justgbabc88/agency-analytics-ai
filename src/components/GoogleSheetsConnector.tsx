import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, User, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { AutoFieldMapper } from "./AutoFieldMapper";

interface GoogleSheet {
  id: string;
  name: string;
  webViewLink: string;
}

interface FieldMapping {
  id: string;
  sheetColumn: string;
  dashboardField: string;
  confidence?: number;
  isAutoMapped?: boolean;
}

interface SheetInfo {
  title: string;
  sheetId: number;
}

export const GoogleSheetsConnector = () => {
  const [sheets, setSheets] = useState<GoogleSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [sheetColumns, setSheetColumns] = useState<string[]>([]);
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [selectedSubSheet, setSelectedSubSheet] = useState<string>("");
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const { 
    isConnected, 
    user, 
    loading, 
    initiateAuth, 
    disconnect, 
    listSheets, 
    getSheetData 
  } = useGoogleAuth();

  const { config, storeSyncedData, storeConfig, clearConfig } = useGoogleSheetsData();

  const dashboardFields = [
    "page_views",
    "optins", 
    "main_offer_buyers",
    "bump_product_buyers",
    "upsell_1_buyers",
    "downsell_1_buyers", 
    "upsell_2_buyers",
    "downsell_2_buyers",
    "roas",
    "spend",
    "ctr_all",
    "ctr_link", 
    "cpm",
    "frequency",
    "date"
  ];

  useEffect(() => {
    if (isConnected) {
      loadSheets();
    }
  }, [isConnected]);

  useEffect(() => {
    if (config && sheets.length > 0) {
      setSelectedSheet(config.selectedSheet);
      setSelectedSubSheet(config.selectedSubSheet);
      setFieldMappings(config.fieldMappings);
      
      if (config.selectedSheet) {
        loadSheetColumns(config.selectedSheet);
      }
    }
  }, [config, sheets]);

  useEffect(() => {
    if (selectedSheet && !config) {
      loadSheetColumns(selectedSheet);
    }
  }, [selectedSheet]);

  const loadSheets = async () => {
    setLoadingSheets(true);
    try {
      const googleSheets = await listSheets();
      setSheets(googleSheets);
    } catch (error: any) {
      console.error('Failed to load sheets:', error);
      
      if (error.message?.includes('Authentication expired') || error.message?.includes('reconnect')) {
        toast({
          title: "Authentication Expired",
          description: "Your Google account connection has expired. Please disconnect and reconnect.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Loading Sheets",
          description: "Failed to load your Google Sheets. Please try reconnecting.",
          variant: "destructive",
        });
      }
    } finally {
      setLoadingSheets(false);
    }
  };

  const loadSheetColumns = async (sheetId?: string) => {
    const targetSheet = sheetId || selectedSheet;
    if (!targetSheet) return;

    try {
      const sheetData = await getSheetData(targetSheet);
      setSheetColumns(sheetData.columns || []);
      setAvailableSheets(sheetData.sheets || []);
      
      if (sheetData.sheets && sheetData.sheets.length > 0 && !config) {
        setSelectedSubSheet(sheetData.sheets[0].title);
      }
    } catch (error) {
      console.error('Failed to load sheet columns:', error);
      toast({
        title: "Error Loading Columns",
        description: "Failed to load columns from the selected sheet.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleConnect = async () => {
    try {
      await initiateAuth();
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setSheets([]);
    setSelectedSheet("");
    setSheetColumns([]);
    setFieldMappings([]);
    setAvailableSheets([]);
    setSelectedSubSheet("");
    clearConfig();
    toast({
      title: "Google Account Disconnected",
      description: "Your Google account has been disconnected.",
    });
  };

  const addFieldMapping = () => {
    const newMapping: FieldMapping = {
      id: Date.now().toString(),
      sheetColumn: "",
      dashboardField: "",
    };
    setFieldMappings([...fieldMappings, newMapping]);
  };

  const updateFieldMapping = (id: string, field: keyof FieldMapping, value: string) => {
    const updatedMappings = fieldMappings.map(mapping => 
      mapping.id === id ? { ...mapping, [field]: value } : mapping
    );
    setFieldMappings(updatedMappings);
  };

  const removeFieldMapping = (id: string) => {
    setFieldMappings(prev => prev.filter(mapping => mapping.id !== id));
  };

  const performSync = async () => {
    if (!selectedSheet || !selectedSubSheet || fieldMappings.length === 0) {
      toast({
        title: "Configuration Required",
        description: "Please select a sheet, sub-sheet, and configure field mappings.",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      const range = `${selectedSubSheet}!A:Z`;
      console.log('Syncing with range:', range);
      
      const sheetData = await getSheetData(selectedSheet, range);
      
      storeSyncedData(sheetData, fieldMappings);
      
      const selectedSheetTitle = sheets.find(s => s.id === selectedSheet)?.name || '';
      storeConfig(selectedSheet, selectedSubSheet, fieldMappings, selectedSheetTitle);
      
      console.log('Syncing data:', sheetData);
      
      toast({
        title: "Sync Completed",
        description: `Successfully synced ${sheetData.data?.length - 1 || 0} rows from Google Sheets and updated dashboard metrics.`,
      });
    } catch (error: any) {
      console.error('Sync failed:', error);
      
      if (error.message?.includes('Authentication expired') || error.message?.includes('reconnect')) {
        toast({
          title: "Authentication Expired",
          description: "Your Google account connection has expired. Please disconnect and reconnect.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: "Failed to sync data from Google Sheets. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshData = async () => {
    if (config) {
      await performSync();
    }
  };

  const clearConfiguration = () => {
    setSelectedSheet("");
    setSelectedSubSheet("");
    setFieldMappings([]);
    setSheetColumns([]);
    setAvailableSheets([]);
    clearConfig();
    toast({
      title: "Configuration Cleared",
      description: "Google Sheets configuration has been reset.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="text-center space-y-4">
              <p className="text-gray-600">Connect your Google account to access your spreadsheets</p>
              <Button 
                onClick={handleGoogleConnect} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Connecting...' : 'Connect Google Account'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Connected
                  </Badge>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm text-gray-600">{user?.email}</span>
                  </div>
                </div>
                <Button variant="outline" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>

              {config && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Configuration Saved</p>
                      <p className="text-xs text-blue-700">
                        {config.sheetTitle} → {config.selectedSubSheet} ({config.fieldMappings.length} mappings)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRefreshData}
                        disabled={syncing}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Refresh Data'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearConfiguration}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && !config && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Google Sheet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Select 
                  value={selectedSheet} 
                  onValueChange={setSelectedSheet}
                  disabled={loadingSheets}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingSheets ? "Loading sheets..." : "Choose a spreadsheet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map(sheet => (
                      <SelectItem key={sheet.id} value={sheet.id}>
                        {sheet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {availableSheets.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Sheet Tab</label>
                  <Select 
                    value={selectedSubSheet} 
                    onValueChange={setSelectedSubSheet}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a sheet tab" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSheets.map(sheet => (
                        <SelectItem key={sheet.sheetId} value={sheet.title}>
                          {sheet.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {sheets.length === 0 && !loadingSheets && (
                <p className="text-sm text-gray-500">No spreadsheets found in your Google Drive.</p>
              )}
            </CardContent>
          </Card>

          {selectedSheet && selectedSubSheet && (
            <>
              <AutoFieldMapper
                sheetColumns={sheetColumns}
                dashboardFields={dashboardFields}
                fieldMappings={fieldMappings}
                onMappingsChange={setFieldMappings}
                onAddMapping={addFieldMapping}
                onRemoveMapping={removeFieldMapping}
                onUpdateMapping={updateFieldMapping}
              />
              
              <div className="flex justify-end">
                <Button onClick={performSync} disabled={syncing || fieldMappings.length === 0}>
                  {syncing ? 'Syncing...' : 'Sync Data'}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
