import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed, QrCode, Palette, BarChart3 } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

const features = [
  {
    icon: UtensilsCrossed,
    title: 'Create Beautiful Menus',
    description: 'Drag-and-drop editor to build professional digital menus',
  },
  {
    icon: QrCode,
    title: 'QR Code Access',
    description: 'Generate QR codes for easy customer access',
  },
  {
    icon: Palette,
    title: 'Custom Themes',
    description: 'Match your brand with customizable colors and fonts',
  },
  {
    icon: BarChart3,
    title: 'Track Analytics',
    description: 'See how customers interact with your menus',
  },
];

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <UtensilsCrossed className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl">Welcome to MenuCraft</CardTitle>
        <CardDescription className="text-lg">
          Create stunning digital menus for your restaurant in minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <feature.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={onNext} className="min-w-[200px]">
            Get Started
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
