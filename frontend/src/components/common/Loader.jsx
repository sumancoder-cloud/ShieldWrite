export function Spinner({ size = 'md', color = 'orange' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  const colors = {
    orange: 'border-primary/30 border-t-primary',
    green: 'border-accent/30 border-t-accent',
    white: 'border-white/30 border-t-white',
  };
  return (
    <span
      className={`inline-block ${sizes[size]} border-2 ${colors[color]} rounded-full animate-spin`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-2 w-10 h-10 rounded-full border-4 border-accent/20 border-b-accent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
        <p className="text-muted-foreground text-sm animate-pulse">Loading ShieldWrite...</p>
      </div>
    </div>
  );
}

export default Spinner;
