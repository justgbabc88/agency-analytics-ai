import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Filter, X } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface CampaignFilterProps {
  campaigns: Campaign[];
  selectedCampaigns: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export const CampaignFilter = ({ 
  campaigns, 
  selectedCampaigns, 
  onSelectionChange 
}: CampaignFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const isAllSelected = selectedCampaigns.length === campaigns.length;
  const selectedCount = selectedCampaigns.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(campaigns.map(c => c.id));
    }
  };

  const handleCampaignToggle = (campaignId: string) => {
    if (selectedCampaigns.includes(campaignId)) {
      onSelectionChange(selectedCampaigns.filter(id => id !== campaignId));
    } else {
      onSelectionChange([...selectedCampaigns, campaignId]);
    }
  };

  const clearAllFilters = () => {
    onSelectionChange(campaigns.map(c => c.id));
  };

  if (campaigns.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-2 text-sm"
          >
            <Filter className="h-3 w-3" />
            Campaigns
            {selectedCount < campaigns.length && (
              <Badge variant="secondary" className="h-4 px-1 text-xs">
                {selectedCount}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="border-b p-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filter by Campaign</h4>
              {selectedCount < campaigns.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="select-all"
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm text-muted-foreground">
                Select all campaigns ({campaigns.length})
              </label>
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto p-3">
            <div className="space-y-2">
              {campaigns.map((campaign) => {
                const isSelected = selectedCampaigns.includes(campaign.id);
                return (
                  <div 
                    key={campaign.id} 
                    className="flex items-center space-x-2 p-1 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      id={campaign.id}
                      checked={isSelected}
                      onCheckedChange={() => handleCampaignToggle(campaign.id)}
                    />
                    <label 
                      htmlFor={campaign.id} 
                      className="flex-1 text-sm cursor-pointer truncate"
                      title={campaign.name}
                    >
                      {campaign.name}
                    </label>
                    <Badge 
                      variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
          
          {selectedCount > 0 && selectedCount < campaigns.length && (
            <div className="border-t p-3">
              <p className="text-xs text-muted-foreground">
                {selectedCount} of {campaigns.length} campaigns selected
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};