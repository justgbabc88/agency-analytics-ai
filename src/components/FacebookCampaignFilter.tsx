import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Facebook } from "lucide-react";

interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time: string;
}

interface FacebookCampaignFilterProps {
  campaigns: FacebookCampaign[];
  selectedCampaignId?: string;
  onCampaignChange: (campaignId?: string) => void;
}

export const FacebookCampaignFilter = ({ 
  campaigns, 
  selectedCampaignId, 
  onCampaignChange 
}: FacebookCampaignFilterProps) => {
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

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Facebook className="h-4 w-4" />
        Campaign:
      </div>
      <Select value={selectedCampaignId || "all"} onValueChange={(value) => onCampaignChange(value === "all" ? undefined : value)}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select campaign" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Campaigns</SelectItem>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.id}>
              <div className="flex items-center justify-between w-full">
                <span className="truncate max-w-[180px]">{campaign.name}</span>
                <Badge 
                  variant="outline" 
                  className={`ml-2 text-xs ${getStatusColor(campaign.status)}`}
                >
                  {campaign.status}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};