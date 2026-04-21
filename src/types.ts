export interface Office {
  id: string;
  name: string;
  focalPerson?: string;
}

export interface Department {
  id: string;
  srNo: string;
  name: string;
  focalPerson?: string;
  offices: Office[];
  officialName: string;
  jobDescription: string;
}
