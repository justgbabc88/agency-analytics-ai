import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Facebook, ChevronDown, X } from "lucide-react";

interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time: string;
}

interface FacebookCampaignFilterProps {
  campaigns: FacebookCampaign[];
  selectedCampaignIds: string[];
  onCampaignChange: (campaignIds: string[]) => void;
}

export const FacebookCampaignFilter = ({ 
  campaigns, 
  selectedCampaignIds, 
  onCampaignChange 
}: FacebookCampaignFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedCampaignIds);

  // Update temp state when selectedCampaignIds changes (from external)
  useEffect(() => {
    setTempSelectedIds(selectedCampaignIds);
  }, [selectedCampaignIds]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const handleCampaignToggle = (campaignId: string, event?: React.MouseEvent) => {
    event?.stopPropagation(); // Prevent event bubbling
    if (tempSelectedIds.includes(campaignId)) {
      setTempSelectedIds(tempSelectedIds.filter(id => id !== campaignId));
    } else {
      setTempSelectedIds([...tempSelectedIds, campaignId]);
    }
  };

  const handleSelectAll = () => {
    if (tempSelectedIds.length === campaigns.length) {
      setTempSelectedIds([]);
    } else {
      setTempSelectedIds(campaigns.map(c => c.id));
    }
  };

  const handleClearAll = () => {
    setTempSelectedIds([]);
  };

  const handleApply = () => {
    onCampaignChange(tempSelectedIds);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelectedIds(selectedCampaignIds);
    setIsOpen(false);
  };

  const hasChanges = JSON.stringify(tempSelectedIds.sort()) !== JSON.stringify(selectedCampaignIds.sort());

  const getDisplayText = () => {
    if (selectedCampaignIds.length === 0) {
      return "All Campaigns";
    } else if (selectedCampaignIds.length === 1) {
      const campaign = campaigns.find(c => c.id === selectedCampaignIds[0]);
      return campaign?.name || "1 Campaign";
    } else {
      return `${selectedCampaignIds.length} Campaigns`;
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Facebook className="h-4 w-4" />
        Campaigns:
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-[280px] justify-between bg-background ${hasChanges ? 'border-primary' : ''}`}
          >
            <span className="truncate">
              {getDisplayText()}
              {hasChanges && <span className="ml-1 text-primary">*</span>}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[320px] p-0 bg-background border shadow-lg z-50"
          align="start"
        >
          <div className="p-3 border-b bg-background">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Select Campaigns</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-6 px-2 text-xs"
                >
                  {tempSelectedIds.length === campaigns.length ? 'Deselect All' : 'Select All'}
                </Button>
                {tempSelectedIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto bg-background">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 border-b border-border/50"
              >
                <Checkbox
                  checked={tempSelectedIds.includes(campaign.id)}
                  onCheckedChange={() => handleCampaignToggle(campaign.id)}
                />
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={(e) => handleCampaignToggle(campaign.id, e)}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">
                      {campaign.name}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`ml-2 text-xs ${getStatusColor(campaign.status)}`}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Apply/Cancel buttons */}
          <div className="p-3 border-t bg-background flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {tempSelectedIds.length === 0 ? 'All campaigns' : `${tempSelectedIds.length} selected`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-7 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!hasChanges}
                className="h-7 px-3 text-xs"
              >
                Apply
              </Button>
            </div>
          </div>
          
          {selectedCampaignIds.length > 0 && (
            <div className="p-3 border-t bg-muted/20">
              <div className="text-xs text-muted-foreground mb-2">Currently Applied:</div>
              <div className="flex flex-wrap gap-1">
                {selectedCampaignIds.slice(0, 3).map((campaignId) => {
                  const campaign = campaigns.find(c => c.id === campaignId);
                  return (
                    <Badge 
                      key={campaignId} 
                      variant="secondary" 
                      className="text-xs flex items-center gap-1"
                    >
                      {campaign?.name?.slice(0, 15)}
                      {campaign?.name && campaign.name.length > 15 && '...'}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onCampaignChange(selectedCampaignIds.filter(id => id !== campaignId));
                        }}
                      />
                    </Badge>
                  );
                })}
                {selectedCampaignIds.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedCampaignIds.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};