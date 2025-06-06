
export interface PixelData {
  id: string; // Make this required instead of optional
  name: string;
  pixelId: string;
  domains: string;
  config?: {
    funnelPages?: any[];
  };
}
