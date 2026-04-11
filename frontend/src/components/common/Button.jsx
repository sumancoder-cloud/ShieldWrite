import { forwardRef } from 'react';

const variants = {
  primary: 'btn-primary text-white font-semibold',
  secondary: 'btn-secondary font-medium',
  ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
  danger: 'bg-destructive text-white hover:opacity-90 transition-opacity font-semibold',
  green: 'bg-gradient-to-r from-accent to-secondary text-white font-semibold shadow-lg shadow-accent/25 hover:opacity-90 transition-opacity',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
  xl: 'px-9 py-4 text-lg rounded-2xl',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', loading = false, disabled = false, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 cursor-pointer select-none
        ${variants[variant]} ${sizes[size]} ${className}
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
});

export default Button;
