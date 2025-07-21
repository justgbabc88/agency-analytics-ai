import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, RefreshCw, Info } from "lucide-react";

interface FacebookAdSetStatusProps {
  adSetsAvailable: boolean;
  rateLimitHit: boolean;
  syncMethod: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const FacebookAdSetStatus = ({
  adSetsAvailable,
  rateLimitHit,
  syncMethod,
  onRetry,
  isRetrying = false
}: FacebookAdSetStatusProps) => {
  // If ad sets are available, don't show any status
  if (adSetsAvailable) {
    return null;
  }

  // Show rate limit warning
  if (rateLimitHit) {
    return (
      <Alert className="mb-4 border-yellow-200 bg-yellow-50">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <strong>Facebook API Rate Limit Reached</strong>
              <p className="text-sm mt-1">
                Ad sets are temporarily unavailable due to Facebook's API limits. 
                Campaign data is still available. Ad sets will be available again in the next sync cycle.
              </p>
            </div>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                className="ml-4 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show generic ad sets unavailable message
  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <strong>Ad Sets Loading</strong>
            <p className="text-sm mt-1">
              Ad sets are being fetched from Facebook. Campaign data is available.
              {syncMethod === 'batch_api' && ' Using optimized batch sync method.'}
            </p>
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
              className="ml-4 border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};