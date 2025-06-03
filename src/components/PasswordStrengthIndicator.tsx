
import { validatePassword } from "@/utils/validation";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const validation = validatePassword(password);
  const passedChecks = 5 - validation.errors.length;
  const strength = (passedChecks / 5) * 100;

  const getStrengthColor = () => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strength < 40) return 'Weak';
    if (strength < 80) return 'Medium';
    return 'Strong';
  };

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Password strength:</span>
        <span className={`text-sm font-medium ${
          strength < 40 ? 'text-red-600' : 
          strength < 80 ? 'text-yellow-600' : 
          'text-green-600'
        }`}>
          {getStrengthText()}
        </span>
      </div>
      <Progress value={strength} className="h-2" />
      {validation.errors.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-1">
          {validation.errors.map((error, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="text-red-500">•</span>
              {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
