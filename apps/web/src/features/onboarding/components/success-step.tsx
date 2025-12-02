import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from '@tanstack/react-router';
import { CheckCircle2, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useSetOnboardingCompleted } from '@/store/onboarding';
import { useEffect } from 'react';

interface SuccessStepProps {
  menuId: string | null;
}

export function SuccessStep({ menuId }: SuccessStepProps) {
  const navigate = useNavigate();
  const setOnboardingCompleted = useSetOnboardingCompleted();

  // Mark onboarding as completed
  useEffect(() => {
    setOnboardingCompleted();
  }, [setOnboardingCompleted]);

  const handleEditMenu = () => {
    if (menuId) {
      navigate({ to: '/menus/$menuId/editor', params: { menuId } });
    } else {
      navigate({ to: '/menus' });
    }
  };

  const handleGoToDashboard = () => {
    navigate({ to: '/' });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <CardTitle className="text-3xl">You're All Set!</CardTitle>
        <CardDescription className="text-lg">
          {menuId
            ? 'Your venue and menu are ready. Start adding items to bring your menu to life!'
            : 'Your venue is ready. Create a menu whenever you like!'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {menuId
              ? 'Pro tip: Use the drag-and-drop editor to organize your menu sections and items.'
              : 'Pro tip: You can create multiple menus per venue for different meal times or occasions.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleGoToDashboard}
            className="min-w-[180px]"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            View Dashboard
          </Button>
          {menuId && (
            <Button size="lg" onClick={handleEditMenu} className="min-w-[180px]">
              Edit Your Menu
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
