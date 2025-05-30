import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, FileSpreadsheet, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";

interface GoogleSheet {
  id: string;
  name: string;
  webViewLink: string;
}

interface FieldMapping {
  id: string;
  sheetColumn: string;
  dashboardField: string;
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

  const { storeSyncedData } = useGoogleSheetsData();

  useEffect(() => {
    if (isConnected) {
      loadSheets();
    }
  }, [isConnected]);

  useEffect(() => {
    if (selectedSheet) {
      loadSheetColumns();
    }
  }, [selectedSheet]);

  const loadSheets = async () => {
    setLoadingSheets(true);
    try {
      const googleSheets = await listSheets();
      setSheets(googleSheets);
    } catch (error) {
      console.error('Failed to load sheets:', error);
      toast({
        title: "Error Loading Sheets",
        description: "Failed to load your Google Sheets. Please try reconnecting.",
        variant: "destructive",
      });
    } finally {
      setLoadingSheets(false);
    }
  };

  const loadSheetColumns = async () => {
    if (!selectedSheet) return;

    try {
      const sheetData = await getSheetData(selectedSheet);
      setSheetColumns(sheetData.columns || []);
      setAvailableSheets(sheetData.sheets || []);
      
      // Auto-select the first sheet if available
      if (sheetData.sheets && sheetData.sheets.length > 0) {
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

  const dashboardFields = [
    "campaign_name",
    "impressions",
    "clicks",
    "cost",
    "conversions",
    "revenue",
    "date",
    "ctr",
    "cpc",
    "roas"
  ];

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
    setFieldMappings(prev => 
      prev.map(mapping => 
        mapping.id === id ? { ...mapping, [field]: value } : mapping
      )
    );
  };

  const removeFieldMapping = (id: string) => {
    setFieldMappings(prev => prev.filter(mapping => mapping.id !== id));
  };

  const handleSyncData = async () => {
    if (!selectedSheet || !selectedSubSheet || fieldMappings.length === 0) {
      toast({
        title: "Configuration Required",
        description: "Please select a sheet, sub-sheet, and configure field mappings.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the selected sub-sheet name with proper range
      const range = `${selectedSubSheet}!A:Z`;
      console.log('Syncing with range:', range);
      
      const sheetData = await getSheetData(selectedSheet, range);
      
      // Store the synced data using our hook
      storeSyncedData(sheetData, fieldMappings);
      
      // Process and sync the data based on field mappings
      console.log('Syncing data:', sheetData);
      
      toast({
        title: "Sync Completed",
        description: `Successfully synced ${sheetData.data?.length - 1 || 0} rows from Google Sheets and updated dashboard metrics.`,
      });
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync data from Google Sheets. Please try again.",
        variant: "destructive",
      });
    }
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
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && (
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Field Mapping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 font-medium text-sm">
                  <div>Sheet Column</div>
                  <div>Dashboard Field</div>
                  <div>Actions</div>
                </div>
                
                {fieldMappings.map(mapping => (
                  <div key={mapping.id} className="grid grid-cols-3 gap-4 items-center">
                    <Select 
                      value={mapping.sheetColumn} 
                      onValueChange={(value) => updateFieldMapping(mapping.id, 'sheetColumn', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {sheetColumns.map(column => (
                          <SelectItem key={column} value={column}>
                            {column}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={mapping.dashboardField} 
                      onValueChange={(value) => updateFieldMapping(mapping.id, 'dashboardField', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {dashboardFields.map(field => (
                          <SelectItem key={field} value={field}>
                            {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFieldMapping(mapping.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addFieldMapping}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Mapping
                  </Button>
                  <Button onClick={handleSyncData} className="ml-auto">
                    Sync Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
