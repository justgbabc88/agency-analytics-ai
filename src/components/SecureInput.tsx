
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeInput } from "@/utils/validation";
import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  sanitize?: boolean;
  showPasswordToggle?: boolean;
}

export const SecureInput = forwardRef<HTMLInputElement, SecureInputProps>(
  ({ label, error, sanitize = true, showPasswordToggle = false, type, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [value, setValue] = useState(props.value || '');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = sanitize ? sanitizeInput(e.target.value) : e.target.value;
      setValue(newValue);
      if (props.onChange) {
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: newValue }
        };
        props.onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
      }
    };

    const inputType = showPasswordToggle && type === 'password' 
      ? (showPassword ? 'text' : 'password') 
      : type;

    return (
      <div className="space-y-2">
        {label && <Label htmlFor={props.id}>{label}</Label>}
        <div className="relative">
          <Input
            ref={ref}
            type={inputType}
            value={value}
            onChange={handleChange}
            className={`${className} ${error ? 'border-red-500' : ''}`}
            {...props}
          />
          {showPasswordToggle && type === 'password' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

SecureInput.displayName = "SecureInput";
