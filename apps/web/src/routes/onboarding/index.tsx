import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { UtensilsCrossed } from 'lucide-react';
import { StepIndicator } from '@/features/onboarding/components/step-indicator';
import { WelcomeStep } from '@/features/onboarding/components/welcome-step';
import { VenueStep } from '@/features/onboarding/components/venue-step';
import { MenuStep } from '@/features/onboarding/components/menu-step';
import { SuccessStep } from '@/features/onboarding/components/success-step';

export const Route = createFileRoute('/onboarding/')({
  component: OnboardingPage,
});

const steps = [
  { title: 'Welcome', description: 'Get started' },
  { title: 'Venue', description: 'Create location' },
  { title: 'Menu', description: 'Add a menu' },
  { title: 'Done', description: 'Start editing' },
];

function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [createdVenueId, setCreatedVenueId] = useState<string | null>(null);
  const [createdMenuId, setCreatedMenuId] = useState<string | null>(null);

  const handleVenueComplete = (venueId: string) => {
    setCreatedVenueId(venueId);
    setCurrentStep(3);
  };

  const handleMenuComplete = (menuId: string) => {
    setCreatedMenuId(menuId);
    setCurrentStep(4);
  };

  const handleMenuSkip = () => {
    setCurrentStep(4);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-center px-4">
          <div className="flex items-center gap-2 font-semibold">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <span>MenuCraft</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-8">
        <StepIndicator steps={steps} currentStep={currentStep} />

        <div className="mt-8">
          {currentStep === 1 && (
            <WelcomeStep onNext={() => setCurrentStep(2)} />
          )}
          {currentStep === 2 && (
            <VenueStep onComplete={handleVenueComplete} />
          )}
          {currentStep === 3 && (
            <MenuStep
              venueId={createdVenueId}
              onComplete={handleMenuComplete}
              onSkip={handleMenuSkip}
            />
          )}
          {currentStep === 4 && (
            <SuccessStep menuId={createdMenuId} />
          )}
        </div>
      </main>
    </div>
  );
}
