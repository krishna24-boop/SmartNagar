export type UserRole = 'nagrik' | 'department' | 'nagar_nigam' | 'admin';
export type DepartmentType = 'sadak' | 'safai' | 'bijli' | 'jal';
export type ComplaintStatus = 'darj' | 'kaam_chalu' | 'ho_gaya';
export type PriorityLevel = 'kam' | 'madhyam' | 'gambhir' | 'turant';

export interface User {
  id: string;
  name: string;
  emailOrMobile: string;
  role: UserRole;
  department?: DepartmentType;
  createdAt: string;
}

export interface WeatherData {
  temp: number;
  precipitationNext48h: number; // in mm
  precipitationProbability: number; // 0-100%
  weatherCondition: string;
  rainAlert: boolean;
}

export interface PriorityBreakdown {
  severityPoints: number;
  weatherPoints: number;
  duplicatePoints: number;
  pendingDaysPoints: number;
  totalScore: number;
  level: PriorityLevel;
  reason: string;
}

export interface Complaint {
  id: string;
  trackingId: string;
  // Citizen Identity (ONLY visible to Admin and Nagrik's own dashboard)
  citizenId?: string;
  citizenName?: string;
  citizenContact?: string;
  
  // Public / Department fields
  title: string;
  description: string;
  hindiDraft: string;
  category: DepartmentType;
  photoUrl: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    landmark?: string;
    ward?: string;
  };
  
  // AI Diagnosis
  aiAnalysis: {
    problemIdentified: string;
    detectedSeverity: PriorityLevel;
    detectedCategory: DepartmentType;
    severityReason: string;
    aiEstimatedDays: number;
    aiEtaText: string;
  };
  
  // Dynamic Priority
  priority: PriorityBreakdown;
  
  // Weather at submission
  weather: WeatherData;
  
  // Department official commitment
  departmentEta?: string; // e.g. "2 din mein (12 Oct tak)"
  departmentAssignedTo?: string;
  departmentNote?: string;
  
  // Status & timeline
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionPhotoUrl?: string;
  resolutionNote?: string;
  
  // SLA tracking
  isLate: boolean;
  slaHours: number;
  hoursElapsed: number;
  
  // Indicator for sample vs user submitted
  isSampleData?: boolean;
}

export interface DepartmentSummary {
  department: DepartmentType;
  nameHindi: string;
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  lateCount: number;
  criticalCount: number;
}
