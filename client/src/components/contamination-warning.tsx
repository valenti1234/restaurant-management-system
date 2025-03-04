import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertTriangle } from "lucide-react";
import type { CrossContaminationRisk, Allergen } from "@shared/schema";

interface ContaminationWarningProps {
  menuItemId: number;
  allergens: Allergen[];
}

export function ContaminationWarning({ menuItemId, allergens }: ContaminationWarningProps) {
  const [open, setOpen] = useState(false);

  const { data: risks } = useQuery<CrossContaminationRisk[]>({
    queryKey: [`/api/menu/${menuItemId}/risks`],
    enabled: allergens.length > 0,
  });

  if (!risks || risks.length === 0) return null;

  const highRisks = risks.filter(risk => risk.riskLevel === "high");
  const mediumRisks = risks.filter(risk => risk.riskLevel === "medium");
  const lowRisks = risks.filter(risk => risk.riskLevel === "low");

  const getWarningLevel = () => {
    if (highRisks.length > 0) return "destructive";
    if (mediumRisks.length > 0) return "secondary";
    return "outline";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={getWarningLevel()}
          size="sm"
          className="mt-2"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Allergen Warning
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          {highRisks.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>High Risk Areas</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2">
                  {highRisks.map(risk => (
                    <li key={risk.id}>
                      <strong>{risk.kitchenArea.replace('_', ' ')}:</strong>{' '}
                      {risk.preventiveMeasures}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {mediumRisks.length > 0 && (
            <Alert>
              <AlertTitle>Medium Risk Areas</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2">
                  {mediumRisks.map(risk => (
                    <li key={risk.id}>
                      <strong>{risk.kitchenArea.replace('_', ' ')}:</strong>{' '}
                      {risk.preventiveMeasures}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {lowRisks.length > 0 && (
            <Alert>
              <AlertTitle>Low Risk Areas</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2">
                  {lowRisks.map(risk => (
                    <li key={risk.id}>
                      <strong>{risk.kitchenArea.replace('_', ' ')}:</strong>{' '}
                      {risk.preventiveMeasures}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}