import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Wand2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FieldMapping {
  id: string;
  sheetColumn: string;
  dashboardField: string;
  confidence?: number;
  isAutoMapped?: boolean;
}

interface AutoFieldMapperProps {
  sheetColumns: string[];
  dashboardFields: string[];
  fieldMappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  onAddMapping: () => void;
  onRemoveMapping: (id: string) => void;
  onUpdateMapping: (id: string, field: keyof FieldMapping, value: string) => void;
}

export const AutoFieldMapper = ({
  sheetColumns,
  dashboardFields,
  fieldMappings,
  onMappingsChange,
  onAddMapping,
  onRemoveMapping,
  onUpdateMapping
}: AutoFieldMapperProps) => {
  const { toast } = useToast();
  const [hasAutoMapped, setHasAutoMapped] = useState(false);

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().replace(/[_\s-]/g, '');
    const s2 = str2.toLowerCase().replace(/[_\s-]/g, '');
    
    // Exact match
    if (s1 === s2) return 1.0;
    
    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Partial similarity using common words
    const commonWords = ['page', 'views', 'clicks', 'cost', 'spend', 'revenue', 'conversions', 'rate', 'ctr', 'cpm', 'roas', 'buyers', 'optins'];
    let matchScore = 0;
    
    for (const word of commonWords) {
      if (s1.includes(word) && s2.includes(word)) {
        matchScore += 0.3;
      }
    }
    
    // Levenshtein distance for fuzzy matching
    const distance = levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    const similarity = 1 - (distance / maxLength);
    
    return Math.max(matchScore, similarity);
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const autoMapFields = () => {
    if (sheetColumns.length === 0) {
      toast({
        title: "No Columns Available",
        description: "Please select a sheet first to enable auto-mapping.",
        variant: "destructive",
      });
      return;
    }

    const newMappings: FieldMapping[] = [];
    const usedColumns = new Set<string>();
    const usedFields = new Set<string>();

    // Find best matches for each dashboard field
    dashboardFields.forEach(dashboardField => {
      let bestMatch = '';
      let bestScore = 0;
      
      sheetColumns.forEach(column => {
        if (!usedColumns.has(column)) {
          const score = calculateSimilarity(column, dashboardField);
          if (score > bestScore && score > 0.3) { // Minimum confidence threshold
            bestScore = score;
            bestMatch = column;
          }
        }
      });

      if (bestMatch && !usedFields.has(dashboardField)) {
        newMappings.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          sheetColumn: bestMatch,
          dashboardField,
          confidence: bestScore,
          isAutoMapped: true
        });
        usedColumns.add(bestMatch);
        usedFields.add(dashboardField);
      }
    });

    // Keep existing manual mappings that don't conflict
    const manualMappings = fieldMappings.filter(mapping => 
      !mapping.isAutoMapped && 
      !usedColumns.has(mapping.sheetColumn) && 
      !usedFields.has(mapping.dashboardField)
    );

    const allMappings = [...manualMappings, ...newMappings];
    onMappingsChange(allMappings);
    setHasAutoMapped(true);

    toast({
      title: "Auto-Mapping Complete",
      description: `Found ${newMappings.length} potential field matches. Review and adjust as needed.`,
    });
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-100 text-gray-700';
    if (confidence >= 0.8) return 'bg-green-100 text-green-700';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-orange-100 text-orange-700';
  };

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return 'Manual';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Field Mapping
            {hasAutoMapped && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Auto-mapped
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={autoMapFields}
            variant="outline"
            size="sm"
            disabled={sheetColumns.length === 0}
            className="flex items-center gap-2"
          >
            <Wand2 className="h-4 w-4" />
            Auto-Map Fields
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4 font-medium text-sm">
          <div>Sheet Column</div>
          <div>Dashboard Field</div>
          <div>Confidence</div>
          <div>Actions</div>
        </div>
        
        {fieldMappings.map(mapping => (
          <div key={mapping.id} className="grid grid-cols-4 gap-4 items-center">
            <Select 
              value={mapping.sheetColumn} 
              onValueChange={(value) => onUpdateMapping(mapping.id, 'sheetColumn', value)}
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
              onValueChange={(value) => onUpdateMapping(mapping.id, 'dashboardField', value)}
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

            <Badge 
              variant="secondary" 
              className={getConfidenceColor(mapping.confidence)}
            >
              {getConfidenceText(mapping.confidence)}
              {mapping.confidence && ` (${Math.round(mapping.confidence * 100)}%)`}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveMapping(mapping.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        <Button variant="outline" onClick={onAddMapping}>
          Add Manual Mapping
        </Button>
      </CardContent>
    </Card>
  );
};
