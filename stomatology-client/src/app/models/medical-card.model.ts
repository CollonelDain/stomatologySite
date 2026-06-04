// src/app/patients/models/medical-card.model.ts

// ==================== ВСПОМОГАТЕЛЬНЫЕ ИНТЕРФЕЙСЫ ====================

export interface OsTooth {
  tooth_number: number;
  eod: number | null;
  heat: boolean;
  cold: boolean;
  air: boolean;
  probe: boolean;
  osmosis: boolean;
}

export interface OidPlusTooth {
  tooth_number: number;
  localization: string; // 'вестибулярная' | 'оральная' | 'окклюзионная' | 'апроксимальная'
}

// Субъективные данные (S)
export interface SubjectiveData {
  sc: {
    sc01: boolean; // воздух
    sc02: boolean; // температурные
    sc03: boolean; // осмотические
    sc04: boolean; // тактильные
  };
  scale_nrs: number; // 0-10
  sa: {
    sad: {
      sad01: boolean; // травма (откол, трещина)
      sad02: boolean; // повышенная стираемость
      sad03: boolean; // заболевания пародонта
      sad04: boolean; // гипоплазия эмали / дисплазия
      sad05: boolean; // отсутствие цемента
    };
    sar: string; // сопутствующие заболевания
    san: string; // особенности питания
    sam: string; // психологические особенности
    sap: {
      sap01: boolean; // кислоты
      sap02: boolean; // абразивы
      sap03: boolean; // профессиональная травма
    };
  };
}

// Объективные данные (O)
export interface ObjectiveData {
  or: {
    orb: boolean; // тонкий биотип
    oro: boolean; // функциональная перегрузка
    orh: boolean; // нерациональная гигиена
  };
  oid_plus: {
    oid_plus1: boolean; // эрозия
    oid_plus2: boolean; // клиновидный дефект
    oid_plus3: boolean; // повышенная стираемость
    oid_plus4: boolean; // гипоплазия эмали
    oid_plus5: boolean; // некроз эмали
    oid_plus6: boolean; // травматическое повреждение
    oid_plus7: boolean; // препарирован под реставрацию
  };
  oid_plus_teeth: OidPlusTooth[];
  oid_minus: {
    oid_minus_n: boolean; // обнажение шейки зуба
    oid_minus_b: boolean; // отбеливание зубов
    oid_minus_s: boolean; // системная гиперестезия
  };
  os: OsTooth[];
}

// ==================== ОСНОВНАЯ МОДЕЛЬ МЕДИЦИНСКОЙ КАРТЫ ====================
export interface MedicalCard {
  id: number;
  patient: number;           // ID пациента
  visit_date: string;        // YYYY-MM-DD
  tooth_count: number;       // общее количество зубов (по умолчанию 32)
  subjective: SubjectiveData;
  objective: ObjectiveData;
  diagnosis_text: string;    // заключение врача (редактируемый текст)
  created_at: string;
  updated_at: string;
}

// ==================== ПАГИНИРОВАННЫЙ ОТВЕТ ====================
export interface PaginatedMedicalCards {
  count: number;
  next: string | null;
  previous: string | null;
  results: MedicalCard[];
}