
export interface PixelData {
  id?: string; // Make this optional for creation, required after creation
  name: string;
  pixelId: string;
  domains: string;
  config?: {
    funnelPages?: any[];
  };
}

// Helper type for database pixel data
export interface DatabasePixelData {
  id: string;
  name: string;
  pixel_id: string;
  project_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  domains: string[] | null;
  conversion_events: string[];
  config: any; // Database Json type
}

// Helper function to convert database pixel to our PixelData type
export const convertDatabasePixelToPixelData = (dbPixel: DatabasePixelData): PixelData => {
  return {
    id: dbPixel.id,
    name: dbPixel.name,
    pixelId: dbPixel.pixel_id,
    domains: dbPixel.domains?.join(', ') || '',
    config: dbPixel.config && typeof dbPixel.config === 'object' ? dbPixel.config : { funnelPages: [] }
  };
};
