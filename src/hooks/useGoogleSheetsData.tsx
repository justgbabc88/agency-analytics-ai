
import { useState, useEffect } from 'react';

interface GoogleSheetsRow {
  [key: string]: string;
}

interface SyncedData {
  spreadsheetId: string;
  title: string;
  data: GoogleSheetsRow[];
  syncedAt: string;
}

interface FieldMapping {
  id: string;
  sheetColumn: string;
  dashboardField: string;
}

interface GoogleSheetsConfig {
  selectedSheet: string;
  selectedSubSheet: string;
  fieldMappings: FieldMapping[];
  sheetTitle: string;
}

export const useGoogleSheetsData = () => {
  const [syncedData, setSyncedData] = useState<SyncedData | null>(null);
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(null);

  const storeSyncedData = (data: any, fieldMappings: any[]) => {
    if (!data.data || data.data.length <= 1) return;

    // Skip header row and process data
    const rows = data.data.slice(1);
    const headers = data.data[0];
    
    // Convert array of arrays to array of objects
    const processedData = rows.map((row: string[]) => {
      const rowObject: GoogleSheetsRow = {};
      headers.forEach((header: string, index: number) => {
        rowObject[header] = row[index] || '';
      });
      return rowObject;
    });

    const syncedDataObject: SyncedData = {
      spreadsheetId: data.spreadsheetId,
      title: data.title,
      data: processedData,
      syncedAt: new Date().toISOString()
    };

    setSyncedData(syncedDataObject);
    
    // Store in localStorage for persistence
    localStorage.setItem('google_sheets_synced_data', JSON.stringify(syncedDataObject));
  };

  const storeConfig = (selectedSheet: string, selectedSubSheet: string, fieldMappings: FieldMapping[], sheetTitle: string) => {
    const configObject: GoogleSheetsConfig = {
      selectedSheet,
      selectedSubSheet,
      fieldMappings,
      sheetTitle
    };

    setConfig(configObject);
    localStorage.setItem('google_sheets_config', JSON.stringify(configObject));
  };

  const calculateMetricsFromSyncedData = (dataToUse?: SyncedData | null) => {
    const targetData = dataToUse || syncedData;
    if (!targetData || !targetData.data.length) return null;

    const data = targetData.data;
    console.log('Calculating metrics from data:', data);
    
    // Calculate totals and averages
    const totals = {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      revenue: 0,
      pageViews: 0,
      optins: 0
    };

    data.forEach(row => {
      // Parse numeric values, removing currency symbols and commas
      totals.impressions += parseInt(row.Impressions?.replace(/[^\d]/g, '') || '0') || 0;
      totals.clicks += parseInt(row.Clicks?.replace(/[^\d]/g, '') || '0') || 0;
      totals.cost += parseFloat(row.Cost?.replace(/[$,]/g, '') || '0') || 0;
      totals.conversions += parseInt(row.Conversions?.replace(/[^\d]/g, '') || '0') || 0;
      totals.revenue += parseFloat(row.Revenue?.replace(/[$,]/g, '') || '0') || 0;
      
      // Also try to get funnel data
      totals.pageViews += parseInt(row['Page Views']?.replace(/[^\d]/g, '') || '0') || 0;
      totals.optins += parseInt(row['Opt-Ins']?.replace(/[^\d]/g, '') || '0') || 0;
      
      // Try alternative column names for conversions and revenue
      if (!totals.conversions) {
        totals.conversions += parseInt(row['Main Offer']?.replace(/[^\d]/g, '') || '0') || 0;
      }
      
      // If no direct revenue, try to calculate from ROAS
      if (!totals.revenue && row['ROAS']) {
        const roas = parseFloat(row['ROAS']?.replace(/[^\d.]/g, '') || '0') || 0;
        const cost = parseFloat(row.Cost?.replace(/[$,]/g, '') || '0') || 0;
        if (roas > 0 && cost > 0) {
          totals.revenue += roas * cost;
        }
      }
    });

    console.log('Calculated totals:', totals);

    // Calculate derived metrics
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 
                          totals.pageViews > 0 ? (totals.optins / totals.pageViews) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
    const roas = totals.cost > 0 ? totals.revenue / totals.cost : 0;

    const metrics = {
      ...totals,
      ctr,
      conversionRate,
      cpc,
      roas,
      dataRows: data.length
    };

    console.log('Final calculated metrics:', metrics);
    return metrics;
  };

  // Load data and config from localStorage on mount
  useEffect(() => {
    const storedData = localStorage.getItem('google_sheets_synced_data');
    const storedConfig = localStorage.getItem('google_sheets_config');
    
    if (storedData) {
      try {
        setSyncedData(JSON.parse(storedData));
      } catch (error) {
        console.error('Failed to parse stored Google Sheets data:', error);
      }
    }

    if (storedConfig) {
      try {
        setConfig(JSON.parse(storedConfig));
      } catch (error) {
        console.error('Failed to parse stored Google Sheets config:', error);
      }
    }
  }, []);

  return {
    syncedData,
    config,
    storeSyncedData,
    storeConfig,
    calculateMetricsFromSyncedData,
    clearSyncedData: () => {
      setSyncedData(null);
      localStorage.removeItem('google_sheets_synced_data');
    },
    clearConfig: () => {
      setConfig(null);
      localStorage.removeItem('google_sheets_config');
    }
  };
};
