
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Eye, EyeOff, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { useState } from "react";

interface FunnelProductConfig {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

interface MetricCustomizerProps {
  onProductsChange: (products: FunnelProductConfig[]) => void;
  className?: string;
}

export const MetricCustomizer = ({ onProductsChange, className }: MetricCustomizerProps) => {
  const [funnelProducts, setFunnelProducts] = useState<FunnelProductConfig[]>([
    { id: 'mainProduct', label: 'Main Product Rate', visible: true, color: '#10B981' },
    { id: 'bump', label: 'Bump Rate', visible: true, color: '#3B82F6' },
    { id: 'upsell1', label: 'Upsell 1 Rate', visible: true, color: '#F59E0B' },
    { id: 'downsell1', label: 'Downsell 1 Rate', visible: false, color: '#8B5CF6' },
    { id: 'upsell2', label: 'Upsell 2 Rate', visible: false, color: '#EF4444' },
    { id: 'downsell2', label: 'Downsell 2 Rate', visible: false, color: '#06B6D4' },
  ]);

  const [isExpanded, setIsExpanded] = useState(false);

  const toggleProduct = (productId: string) => {
    const updatedProducts = funnelProducts.map(product => 
      product.id === productId ? { ...product, visible: !product.visible } : product
    );
    setFunnelProducts(updatedProducts);
    onProductsChange(updatedProducts);
  };

  const visibleProducts = funnelProducts.filter(p => p.visible);

  return (
    <Card className={`${className} border-2 border-dashed border-blue-200 bg-blue-50/50`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium text-blue-900">
              Funnel Products Display ({visibleProducts.length} selected)
            </CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-blue-700/80">
          Select which products to show in the funnel analysis below
        </p>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {funnelProducts.map(product => (
              <div key={product.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-white/60 transition-colors">
                <Checkbox
                  id={product.id}
                  checked={product.visible}
                  onCheckedChange={() => toggleProduct(product.id)}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <div className="flex items-center gap-2 flex-1">
                  <div 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: product.color }}
                  />
                  <label
                    htmlFor={product.id}
                    className="text-xs font-medium text-gray-700 cursor-pointer flex-1"
                  >
                    {product.label}
                  </label>
                  {product.visible && <Eye className="h-3 w-3 text-green-600" />}
                  {!product.visible && <EyeOff className="h-3 w-3 text-gray-400" />}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-blue-200">
            {visibleProducts.map(product => (
              <Badge key={product.id} variant="secondary" className="text-xs h-5 px-2">
                <div 
                  className="w-1.5 h-1.5 rounded-full mr-1" 
                  style={{ backgroundColor: product.color }}
                />
                {product.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
