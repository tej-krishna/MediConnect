export interface EmergencyGuide {
  id: string;
  title: string;
  redFlagSymptoms: string[];
  guidance: string;
  displayOrder: number;
  isActive: boolean;
  clinicallyReviewed: boolean;
}
