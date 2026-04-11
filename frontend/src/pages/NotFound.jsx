import { useLocation } from 'wouter';
import BubbleBackground from '../components/BubbleBackground.jsx';
import Button from '../components/common/Button.jsx';

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center relative overflow-hidden">
      <BubbleBackground intensity={0.5} />
      <div className="relative z-10 text-center px-4 animate-fade-up">
        <div className="text-9xl font-bold text-gradient-orange mb-4">404</div>
        <h1 className="text-3xl font-bold text-foreground mb-3">Page not found</h1>
        <p className="text-muted-foreground mb-8">This page doesn't exist or has been moved.</p>
        <Button onClick={() => setLocation('/')}>Go Home</Button>
      </div>
    </div>
  );
}
