
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FunnelSelectorProps {
  onFunnelChange: (funnelType: string) => void;
  className?: string;
}

export const FunnelSelector = ({ onFunnelChange, className }: FunnelSelectorProps) => {
  const funnelTypes = [
    { value: "low-ticket", label: "Low Ticket Funnel" },
    { value: "webinar", label: "Webinar Funnel" },
    { value: "book-call", label: "Book a Call Funnel" },
  ];

  return (
    <Select onValueChange={onFunnelChange} defaultValue="low-ticket">
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select funnel type" />
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-200 z-50">
        {funnelTypes.map((funnel) => (
          <SelectItem key={funnel.value} value={funnel.value}>
            {funnel.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
