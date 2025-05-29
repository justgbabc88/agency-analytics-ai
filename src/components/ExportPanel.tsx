
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, FileSpreadsheet, Calendar } from "lucide-react";
import { useState } from "react";

interface ExportPanelProps {
  className?: string;
}

const exportFormats = [
  { value: 'pdf', label: 'PDF Report', icon: FileText, description: 'Comprehensive dashboard report' },
  { value: 'csv', label: 'CSV Data', icon: FileSpreadsheet, description: 'Raw metrics data export' },
];

const reportTypes = [
  { value: 'performance', label: 'Performance Summary' },
  { value: 'detailed', label: 'Detailed Analytics' },
  { value: 'funnel', label: 'Funnel Analysis' },
  { value: 'custom', label: 'Custom Report' },
];

export const ExportPanel = ({ className }: ExportPanelProps) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [selectedReport, setSelectedReport] = useState('performance');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create mock download
    const filename = `dashboard-${selectedReport}-${Date.now()}.${selectedFormat}`;
    console.log(`Exporting ${filename}...`);
    
    setIsExporting(false);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export & Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportFormats.map((format) => {
            const Icon = format.icon;
            return (
              <div
                key={format.value}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedFormat === format.value ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedFormat(format.value)}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium">{format.label}</h3>
                    <p className="text-sm text-gray-600">{format.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Report Type</label>
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Export will include data from the selected date range</span>
          </div>

          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? 'Exporting...' : `Export ${selectedFormat.toUpperCase()}`}
          </Button>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Recent Exports</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Performance Report - Dec 2024</span>
              </div>
              <Badge variant="secondary" className="text-xs">PDF</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="text-sm">Metrics Data - Last Week</span>
              </div>
              <Badge variant="secondary" className="text-xs">CSV</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
