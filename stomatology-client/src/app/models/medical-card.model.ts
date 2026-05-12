export interface MedicalCard {
    id: number;
    visit_date: string;   // "2026-05-12"
    diagnosis: string;
    created_at: string;
    updated_at: string;
}

export interface PaginatedMedicalCards {
    count: number;
    next: string | null;
    previous: string | null;
    results: MedicalCard[];
}