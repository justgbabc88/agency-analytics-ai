import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Target, ChevronDown, X } from "lucide-react";

interface FacebookAdSet {
  id: string;
  name: string;
  campaign_id: string;
  campaign_name: string;
  status: string;
  created_time: string;
}

interface FacebookAdSetFilterProps {
  adSets: FacebookAdSet[];
  selectedAdSetIds: string[];
  onAdSetChange: (adSetIds: string[]) => void;
  selectedCampaignIds: string[];
}

export const FacebookAdSetFilter = ({ 
  adSets, 
  selectedAdSetIds, 
  onAdSetChange,
  selectedCampaignIds
}: FacebookAdSetFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedAdSetIds);

  // Simple filtering logic: 
  // - If no campaigns selected OR all campaigns selected: show all ad sets
  // - If specific campaigns selected: show only ad sets from those campaigns
  const totalCampaigns = adSets.reduce((acc, adSet) => {
    const uniqueCampaigns = new Set(acc);
    uniqueCampaigns.add(adSet.campaign_id);
    return Array.from(uniqueCampaigns);
  }, [] as string[]).length;

  const allCampaignsSelected = selectedCampaignIds.length === 0 || selectedCampaignIds.length === totalCampaigns;
  
  const filteredAdSets = allCampaignsSelected 
    ? adSets // Show all ad sets
    : adSets.filter(adSet => selectedCampaignIds.includes(adSet.campaign_id)); // Show only ad sets from selected campaigns

  console.log('🔍 Simple AdSet Filter:', {
    totalAdSets: adSets.length,
    totalCampaigns,
    selectedCampaignIds: selectedCampaignIds.length,
    allCampaignsSelected,
    filteredAdSets: filteredAdSets.length,
    timestamp: new Date().toISOString()
  });

  // Update temp state when selectedAdSetIds changes (from external)
  useEffect(() => {
    setTempSelectedIds(selectedAdSetIds);
  }, [selectedAdSetIds]);

  // Clear ad set selection when campaigns change
  useEffect(() => {
    const validAdSetIds = selectedAdSetIds.filter(adSetId => 
      filteredAdSets.some(adSet => adSet.id === adSetId)
    );
    if (validAdSetIds.length !== selectedAdSetIds.length) {
      onAdSetChange(validAdSetIds);
    }
  }, [selectedCampaignIds, filteredAdSets, selectedAdSetIds, onAdSetChange]);

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

  const handleAdSetToggle = (adSetId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (tempSelectedIds.includes(adSetId)) {
      setTempSelectedIds(tempSelectedIds.filter(id => id !== adSetId));
    } else {
      setTempSelectedIds([...tempSelectedIds, adSetId]);
    }
  };

  const handleSelectAll = () => {
    if (tempSelectedIds.length === filteredAdSets.length) {
      setTempSelectedIds([]);
    } else {
      setTempSelectedIds(filteredAdSets.map(a => a.id));
    }
  };

  const handleClearAll = () => {
    setTempSelectedIds([]);
  };

  const handleApply = () => {
    onAdSetChange(tempSelectedIds);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelectedIds(selectedAdSetIds);
    setIsOpen(false);
  };

  const hasChanges = JSON.stringify(tempSelectedIds.sort()) !== JSON.stringify(selectedAdSetIds.sort());

  const getDisplayText = () => {
    if (isDisabled) {
      if (selectedCampaignIds.length === 0) {
        return "Select campaigns first";
      } else {
        return "No ad sets available";
      }
    }
    if (selectedAdSetIds.length === 0) {
      return "All Ad Sets";
    } else if (selectedAdSetIds.length === 1) {
      const adSet = filteredAdSets.find(a => a.id === selectedAdSetIds[0]);
      return adSet?.name || "1 Ad Set";
    } else {
      return `${selectedAdSetIds.length} Ad Sets`;
    }
  };

  // If no campaigns selected or no ad sets available, disable the filter
  const isDisabled = filteredAdSets.length === 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Target className="h-4 w-4" />
        Ad Sets:
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={isDisabled}
            className={`w-[280px] justify-between bg-background ${hasChanges ? 'border-primary' : ''} ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
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
              <span className="font-medium text-sm">Select Ad Sets</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-6 px-2 text-xs"
                >
                  {tempSelectedIds.length === filteredAdSets.length ? 'Deselect All' : 'Select All'}
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
            {filteredAdSets
              .sort((a, b) => {
                // Sort active ad sets first, then by campaign name, then by ad set name
                if (a.status.toLowerCase() === 'active' && b.status.toLowerCase() !== 'active') return -1;
                if (a.status.toLowerCase() !== 'active' && b.status.toLowerCase() === 'active') return 1;
                const campaignCompare = a.campaign_name.localeCompare(b.campaign_name);
                if (campaignCompare !== 0) return campaignCompare;
                return a.name.localeCompare(b.name);
              })
              .map((adSet) => (
              <div
                key={adSet.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 border-b border-border/50"
              >
                <Checkbox
                  checked={tempSelectedIds.includes(adSet.id)}
                  onCheckedChange={() => handleAdSetToggle(adSet.id)}
                />
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={(e) => handleAdSetToggle(adSet.id, e)}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium break-words leading-tight">
                      {adSet.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`self-start text-xs ${getStatusColor(adSet.status)}`}
                      >
                        {adSet.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {adSet.campaign_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t bg-background flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {tempSelectedIds.length === 0 ? 'All ad sets' : `${tempSelectedIds.length} selected`}
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
          
          {selectedAdSetIds.length > 0 && (
            <div className="p-3 border-t bg-muted/20">
              <div className="text-xs text-muted-foreground mb-2">Currently Applied:</div>
              <div className="flex flex-wrap gap-1">
                {selectedAdSetIds.slice(0, 3).map((adSetId) => {
                  const adSet = filteredAdSets.find(a => a.id === adSetId);
                  return (
                    <Badge 
                      key={adSetId} 
                      variant="secondary" 
                      className="text-xs flex items-center gap-1"
                    >
                      {adSet?.name?.slice(0, 15)}
                      {adSet?.name && adSet.name.length > 15 && '...'}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdSetChange(selectedAdSetIds.filter(id => id !== adSetId));
                        }}
                      />
                    </Badge>
                  );
                })}
                {selectedAdSetIds.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedAdSetIds.length - 3} more
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