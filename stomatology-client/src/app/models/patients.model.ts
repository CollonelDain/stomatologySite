export interface PatientDetail {
    id: number;
    patient_code: string;
    first_name: string;
    last_name: string;
    middle_name: string | null;
    full_name: string;
    email: string | null;
    phone: string | null;
    date_of_birth: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface PatientsList {
    id: number;
    patient_code: string;
    first_name: string;
    last_name: string;
    middle_name: string | null;
    full_name: string;
    email: string | null;
    phone: string | null;
    date_of_birth: Date | null;
    last_visit: Date | null;
    cards_count: number;
    created_at: Date;
}

export interface PatientCreateUpdate {
    patient_code: string;
    // first_name: string;
    // last_name: string;
    // middle_name?: string | null;
    // email?: string | null;
    // phone?: string | null;
    // date_of_birth?: string | null;
}