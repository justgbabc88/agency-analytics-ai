
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Shield, CheckCircle } from "lucide-react";

interface SecurityAlertProps {
  type: 'error' | 'warning' | 'success';
  message: string;
  onDismiss?: () => void;
}

export const SecurityAlert = ({ type, message, onDismiss }: SecurityAlertProps) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <Shield className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'success':
        return 'default';
    }
  };

  return (
    <Alert variant={getVariant()} className={`
      ${type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : ''}
      ${type === 'warning' ? 'border-yellow-200 bg-yellow-50 text-yellow-800' : ''}
    `}>
      {getIcon()}
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};
