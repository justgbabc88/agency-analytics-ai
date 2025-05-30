
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

export const useGoogleSheetsData = () => {
  const [syncedData, setSyncedData] = useState<SyncedData | null>(null);

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

  const calculateMetricsFromSyncedData = () => {
    if (!syncedData || !syncedData.data.length) return null;

    const data = syncedData.data;
    
    // Calculate totals and averages
    const totals = {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      revenue: 0
    };

    data.forEach(row => {
      // Parse numeric values, removing currency symbols and commas
      totals.impressions += parseInt(row.Impressions?.replace(/[^\d]/g, '') || '0') || 0;
      totals.clicks += parseInt(row.Clicks?.replace(/[^\d]/g, '') || '0') || 0;
      totals.cost += parseFloat(row.Cost?.replace(/[$,]/g, '') || '0') || 0;
      totals.conversions += parseInt(row.Conversions?.replace(/[^\d]/g, '') || '0') || 0;
      totals.revenue += parseFloat(row.Revenue?.replace(/[$,]/g, '') || '0') || 0;
    });

    // Calculate derived metrics
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
    const roas = totals.cost > 0 ? totals.revenue / totals.cost : 0;

    return {
      ...totals,
      ctr,
      conversionRate,
      cpc,
      roas,
      dataRows: data.length
    };
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('google_sheets_synced_data');
    if (stored) {
      try {
        setSyncedData(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse stored Google Sheets data:', error);
      }
    }
  }, []);

  return {
    syncedData,
    storeSyncedData,
    calculateMetricsFromSyncedData,
    clearSyncedData: () => {
      setSyncedData(null);
      localStorage.removeItem('google_sheets_synced_data');
    }
  };
};
