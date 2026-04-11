import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, hint, className = '', containerClass = '', ...props },
  ref
) {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClass}`}>
      {label && (
        <label className="text-sm font-medium text-foreground/80" style={{ letterSpacing: '0.01em' }}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`
          input-field w-full px-4 py-3 text-sm
          ${error ? 'border-destructive/70 focus:border-destructive' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-400 flex items-center gap-1">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
});

export default Input;
