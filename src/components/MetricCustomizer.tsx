
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface FunnelProductConfig {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

const defaultFunnelProducts: FunnelProductConfig[] = [
  { id: 'mainProduct', label: 'Main Product', visible: true, color: '#10B981' },
  { id: 'bump', label: 'Bump Product', visible: true, color: '#3B82F6' },
  { id: 'upsell1', label: 'Upsell 1', visible: true, color: '#F59E0B' },
  { id: 'downsell1', label: 'Downsell 1', visible: true, color: '#8B5CF6' },
  { id: 'upsell2', label: 'Upsell 2', visible: false, color: '#EF4444' },
  { id: 'downsell2', label: 'Downsell 2', visible: false, color: '#06B6D4' },
];

interface MetricCustomizerProps {
  onProductsChange: (products: FunnelProductConfig[]) => void;
  className?: string;
}

export const MetricCustomizer = ({ onProductsChange, className }: MetricCustomizerProps) => {
  const [products, setProducts] = useState<FunnelProductConfig[]>(defaultFunnelProducts);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleProduct = (productId: string) => {
    const updatedProducts = products.map(product => 
      product.id === productId ? { ...product, visible: !product.visible } : product
    );
    setProducts(updatedProducts);
    onProductsChange(updatedProducts);
  };

  const visibleProducts = products.filter(p => p.visible);

  if (!isExpanded) {
    return (
      <div className={className}>
        <Button 
          variant="outline" 
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Configure Funnel Products ({visibleProducts.length})
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Funnel Products Configuration
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">Visible products:</span>
          {visibleProducts.map(product => (
            <Badge key={product.id} variant="secondary" className="text-xs">
              {product.label}
            </Badge>
          ))}
        </div>

        <div className="space-y-3">
          {products.map(product => (
            <div key={product.id} className="flex items-center space-x-2">
              <Checkbox
                id={product.id}
                checked={product.visible}
                onCheckedChange={() => toggleProduct(product.id)}
              />
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: product.color }}
                />
                <label
                  htmlFor={product.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {product.label}
                </label>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
