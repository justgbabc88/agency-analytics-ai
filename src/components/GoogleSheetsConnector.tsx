
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, FileSpreadsheet, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GoogleSheet {
  id: string;
  name: string;
  url: string;
}

interface FieldMapping {
  id: string;
  sheetColumn: string;
  dashboardField: string;
}

export const GoogleSheetsConnector = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [sheets, setSheets] = useState<GoogleSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [sheetColumns, setSheetColumns] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const { toast } = useToast();

  // Mock data for demo purposes
  useEffect(() => {
    if (isConnected) {
      setSheets([
        { id: "1", name: "Marketing Metrics 2024", url: "https://docs.google.com/spreadsheets/d/abc123" },
        { id: "2", name: "Campaign Performance", url: "https://docs.google.com/spreadsheets/d/def456" },
        { id: "3", name: "Lead Generation Data", url: "https://docs.google.com/spreadsheets/d/ghi789" },
      ]);
    }
  }, [isConnected]);

  useEffect(() => {
    if (selectedSheet) {
      // Mock sheet columns
      setSheetColumns(["Date", "Campaign Name", "Impressions", "Clicks", "Cost", "Conversions", "Revenue"]);
    }
  }, [selectedSheet]);

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

  const handleGoogleConnect = () => {
    // In a real implementation, this would initiate OAuth flow
    setIsConnected(true);
    toast({
      title: "Google Account Connected",
      description: "Successfully connected to your Google account. You can now select sheets.",
    });
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setSheets([]);
    setSelectedSheet("");
    setSheetColumns([]);
    setFieldMappings([]);
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

  const handleSyncData = () => {
    if (!selectedSheet || fieldMappings.length === 0) {
      toast({
        title: "Configuration Required",
        description: "Please select a sheet and configure field mappings.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sync Started",
      description: "Data sync from Google Sheets has been initiated.",
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
              <Button onClick={handleGoogleConnect} className="bg-blue-600 hover:bg-blue-700">
                Connect Google Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Connected
                  </Badge>
                  <span className="text-sm text-gray-600">user@example.com</span>
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
                <Label>Available Sheets</Label>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a spreadsheet" />
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
            </CardContent>
          </Card>

          {selectedSheet && (
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
