import React from 'react';
import { FormProvider, FieldValues, UseFormReturn } from 'react-hook-form';
import { Form } from '@/components/ui/form';

interface BaseFormProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  onSubmit: (data: T) => void | Promise<void>;
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

/**
 * Base form component that wraps react-hook-form providers
 * Provides consistent form handling and styling across the app
 */
export const BaseForm = React.forwardRef<
  HTMLFormElement,
  BaseFormProps<any>
>(({ form, onSubmit, children, isLoading, className }, ref) => {
  return (
    <FormProvider {...form}>
      <form
        ref={ref}
        onSubmit={form.handleSubmit(onSubmit)}
        className={className}
      >
        {children}
      </form>
    </FormProvider>
  );
});

BaseForm.displayName = 'BaseForm';

interface TextFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  description?: string;
}

/**
 * Reusable text field component for forms
 * Handles label, input, error message, and description
 */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      name,
      type = 'text',
      placeholder,
      required,
      disabled,
      className,
      maxLength,
      description,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`space-y-2 ${className || ''}`}>
        <label htmlFor={name} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          ref={ref}
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          {...props}
        />
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
    );
  }
);

TextField.displayName = 'TextField';

interface SelectFieldProps {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  description?: string;
}

/**
 * Reusable select field component for forms
 */
export const SelectField = React.forwardRef<
  HTMLSelectElement,
  SelectFieldProps
>(
  (
    {
      label,
      name,
      options,
      required,
      disabled,
      className,
      placeholder,
      description,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`space-y-2 ${className || ''}`}>
        <label htmlFor={name} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          ref={ref}
          id={name}
          name={name}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';

interface TextAreaFieldProps {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  rows?: number;
  description?: string;
}

/**
 * Reusable textarea field component for forms
 */
export const TextAreaField = React.forwardRef<
  HTMLTextAreaElement,
  TextAreaFieldProps
>(
  (
    {
      label,
      name,
      placeholder,
      required,
      disabled,
      className,
      maxLength,
      rows = 4,
      description,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`space-y-2 ${className || ''}`}>
        <label htmlFor={name} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          ref={ref}
          id={name}
          name={name}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={rows}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          {...props}
        />
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
    );
  }
);

TextAreaField.displayName = 'TextAreaField';
