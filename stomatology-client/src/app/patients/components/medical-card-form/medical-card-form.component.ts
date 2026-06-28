// src/app/patients/components/medical-card-form/medical-card-form.component.ts

import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MedicalCardsService } from '../../services/medical-card.service';
import { UiStateService } from '../../../services/ui-state.service';

interface DefectTypeOption {
  id: string;
  name: string;
}

// Все МКБ-коды с привязкой к дефектам (хардкод)
const ICD_CODES: Record<string, { title: string; defect_codes: string[] }> = {
  // ===== Дефект 1: Рецессия десны =====
  'К06.00': { title: 'Рецессия десны. Локальная', defect_codes: ['1'] },
  'К06.01': { title: 'Рецессия десны. Генерализованная', defect_codes: ['1'] },
  'К06.09': { title: 'Рецессия десны неуточнённая', defect_codes: ['1'] },

  // ===== Дефект 2: Повышенная стираемость твердых тканей зубов =====
  'К03.0': { title: 'Повышенное стирание зубов', defect_codes: ['2'] },
  'К03.00': { title: 'Повышенное стирание зубов. Окклюзионное', defect_codes: ['2'] },
  'К03.01': { title: 'Повышенное стирание зубов. Апроксимальное', defect_codes: ['2'] },
  'К03.08': { title: 'Другое уточнённое стирание зубов', defect_codes: ['2'] },
  'К03.09': { title: 'Стирание зубов неуточнённое', defect_codes: ['2'] },
  'К03.1': { title: 'Сошлифовывание (абразивный износ) зубов', defect_codes: ['2', '4'] },
  'К03.10': { title: 'Сошлифовывание зубов, вызванное зубным порошком (клиновидный дефект БДУ)', defect_codes: ['2', '4'] },
  'К03.11': { title: 'Сошлифовывание зубов привычное', defect_codes: ['2', '4'] },
  'К03.12': { title: 'Сошлифовывание зубов профессиональное', defect_codes: ['2', '4'] },
  'К03.13': { title: 'Сошлифовывание зубов традиционное (ритуальное)', defect_codes: ['2', '4'] },
  'К03.18': { title: 'Другое уточнённое сошлифовывание зубов', defect_codes: ['2', '4'] },
  'К03.19': { title: 'Сошлифовывание зубов неуточнённое', defect_codes: ['2', '4'] },

  // ===== Дефект 3: Эрозии эмали =====
  'К03.2': { title: 'Эрозия зубов', defect_codes: ['3'] },
  'К03.20': { title: 'Эрозия зубов профессиональная', defect_codes: ['3'] },
  'К03.21': { title: 'Эрозия зубов, обусловленная персистирующей регургитацией или рвотой', defect_codes: ['3'] },
  'К03.22': { title: 'Эрозия зубов, обусловленная диетой', defect_codes: ['3'] },
  'К03.23': { title: 'Эрозия зубов, обусловленная лекарственными средствами и медикаментами', defect_codes: ['3'] },
  'К03.24': { title: 'Эрозия зубов идиопатическая', defect_codes: ['3'] },
  'К03.28': { title: 'Другая уточнённая эрозия зубов', defect_codes: ['3'] },
  'К03.29': { title: 'Эрозия зубов неуточнённая', defect_codes: ['3'] },

  // ===== Дефект 4: Клиновидные дефекты (уже есть выше, но для полноты дублируем) =====
  // Коды для дефекта 4 уже добавлены в дефект 2 (К03.1, К03.10-К03.19)

  // ===== Дефект 5: Флюороз и процедуры отбеливания зубов =====
  'К00.30': { title: 'Эндемический флюороз эмали (флюороз зубов)', defect_codes: ['5'] },
  'К00.31': { title: 'Неэндемическая крапчатость эмали (нефлюорозное потемнение эмали)', defect_codes: ['5'] },
  'К00.39': { title: 'Крапчатые зубы неуточнённые', defect_codes: ['5'] },

  // ===== Дефект 6: Травма твердых тканей зубов / Незавершенный амелогенез =====
  'S02.50': { title: 'Перелом только эмали зуба, откол эмали', defect_codes: ['6'] },
  'S02.51': { title: 'Перелом коронки зуба без повреждения пульпы', defect_codes: ['6'] },

  // ===== Дефект 7: Гипоплазия эмали зубов =====
  'К00.4': { title: 'Нарушение формирования зубов', defect_codes: ['7'] },
  'К00.40': { title: 'Гипоплазия эмали', defect_codes: ['7'] },
  'К00.41': { title: 'Перинатальная гипоплазия эмали', defect_codes: ['7'] },
  'К00.42': { title: 'Неонатальная гипоплазия эмали', defect_codes: ['7'] },
  'К00.43': { title: 'Аплазия и гипоплазия цемента', defect_codes: ['7'] },
  'К00.44': { title: 'Дилацерация (трещины эмали)', defect_codes: ['7'] },
  'К00.45': { title: 'Одонтодисплазия (региональная одонтодисплазия)', defect_codes: ['7'] },
  'К00.46': { title: 'Зуб Тернера', defect_codes: ['7'] },
  'К00.48': { title: 'Другие уточнённые нарушения формирования зубов', defect_codes: ['7'] },
  'К00.49': { title: 'Нарушения формирования зубов неуточнённые', defect_codes: ['7'] },

  // ===== Дефект 8: Некроз эмали =====
  'К03.81': { title: 'Изменения эмали, обусловленные облучением (радиационный, постлучевой некроз)', defect_codes: ['8'] },

  'К00.50': { title: 'Незавершённый амелогенез', defect_codes: ['1', '2', '3', '4', '5', '6', '7', '8'] },
};

// Обратный индекс для быстрой фильтрации: дефект → список кодов
const ICD_BY_DEFECT: Record<string, string[]> = {};
Object.entries(ICD_CODES).forEach(([code, entry]) => {
  entry.defect_codes.forEach((defectId: string) => {
    if (!ICD_BY_DEFECT[defectId]) {
      ICD_BY_DEFECT[defectId] = [];
    }
    ICD_BY_DEFECT[defectId].push(code);
  });
});

@Component({
  selector: 'app-medical-card-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './medical-card-form.component.html',
  styleUrls: ['./medical-card-form.component.css']
})
export class MedicalCardFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cardsService = inject(MedicalCardsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private uiState = inject(UiStateService);

  patientId!: number;
  cardId: number | null = null;
  loading = false;

  localizationOptions: string[] = [
    'вестибулярная',
    'оральная',
    'окклюзионная',
    'апроксимальная медиальная',
    'апроксимальная дистальная',
    'корень зуба',
    'пришеечная область'
  ];

  defectTypeOptions: DefectTypeOption[] = [
    { id: '1', name: 'рецессия десны' },
    { id: '2', name: 'повышенная стираемость твердых тканей зубов' },
    { id: '3', name: 'эрозии эмали' },
    { id: '4', name: 'клиновидные дефекты' },
    { id: '5', name: 'флюороз и процедуры отбеливания зубов' },
    { id: '6', name: 'травма твердых тканей зубов/ незавершенный амелогенез' },
    { id: '7', name: 'гипоплазия эмали зубов' },
    { id: '8', name: 'некроз эмали' }
  ];

  dropdownOpenIndex: number | null = null;
  defectDropdownOpenIndex: number | null = null;
  icdDropdownOpenIndex: number | null = null;

  get teethArray(): FormArray {
    return this.form.get('objective.os') as FormArray;
  }

  get oidPlusTeethArray(): FormArray {
    return this.form.get('objective.oid_plus_teeth') as FormArray;
  }

  form: FormGroup = this.fb.group({
    visit_date: ['', Validators.required],
    tooth_count: [32, [Validators.required, Validators.min(1), Validators.max(32)]],
    diagnosis_text: [''],
    subjective: this.fb.group({
      sc: this.fb.group({
        sc01: [false], sc02: [false], sc03: [false], sc04: [false]
      }),
      scale_nrs: [0, [Validators.min(0), Validators.max(10)]],
      sa: this.fb.group({
        sad: this.fb.group({
          sad01: [false], sad02: [false], sad03: [false], sad04: [false], sad05: [false]
        }),
        sar: [''],
        san: [''],
        sam: [''],
        sap: this.fb.group({
          sap01: [false], sap02: [false], sap03: [false]
        })
      })
    }),
    objective: this.fb.group({
      or: this.fb.group({
        orb: [false], oro: [false], orh: [false]
      }),
      main_diagnosis_confirm: [false],
      oid_plus_teeth: this.fb.array([]),
      oid_minus: this.fb.group({
        oid_minus_n: [false], oid_minus_b: [false], oid_minus_s: [false]
      }),
      os: this.fb.array([])
    })
  });

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.patientId = +params['patientId'];
      if (params['cardId'] && params['cardId'] !== 'new') {
        this.cardId = +params['cardId'];
        this.loadCard();
      } else {
        this.oidPlusTeethArray.clear();
        this.teethArray.clear();
      }
    });
  }

  // ---------- Фильтрация МКБ (на фронте) ----------
  private getFilteredIcdCodes(defectTypes: string[]): string[] {
    if (!defectTypes || defectTypes.length === 0) {
      return Object.keys(ICD_CODES);
    }

    // Если выбраны все 8 дефектов, возвращаем все коды
    const allDefectIds = this.defectTypeOptions.map(d => d.id);
    const isAllSelected = allDefectIds.every(id => defectTypes.includes(id));
    if (isAllSelected) {
      return Object.keys(ICD_CODES);
    }

    // Фильтруем по выбранным дефектам
    const codes = new Set<string>();
    for (const defect of defectTypes) {
      const found = ICD_BY_DEFECT[defect] || [];
      found.forEach(c => codes.add(c));
    }
    return Array.from(codes);
  }

  // Метод для шаблона
  getIcdOptionsForTooth(toothIndex: number): { code: string; title: string }[] {
    const group = this.oidPlusTeethArray.at(toothIndex) as FormGroup;
    const defectTypes = group.get('defect_types')?.value as string[] || [];
    const filteredCodes = this.getFilteredIcdCodes(defectTypes);
    return filteredCodes.map(code => ({
      code: code,
      title: ICD_CODES[code]?.title || code
    }));
  }

  // ---------- Локализация ----------
  toggleDropdown(index: number, event: Event): void {
    event.stopPropagation();
    if (this.dropdownOpenIndex === index) {
      this.dropdownOpenIndex = null;
    } else {
      this.closeAllDropdowns();
      this.dropdownOpenIndex = index;
    }
  }

  getLocalizationDisplay(toothIndex: number): string {
    const group = this.oidPlusTeethArray.at(toothIndex) as FormGroup;
    const value = group.get('localization')?.value || '';
    return value ? value.split(';').join(', ') : '';
  }

  isLocalizationSelected(toothIndex: number, option: string): boolean {
    const group = this.oidPlusTeethArray.at(toothIndex) as FormGroup;
    const value = group.get('localization')?.value || '';
    return value.split(';').includes(option);
  }

  toggleLocalizationOption(toothIndex: number, option: string, event: Event): void {
    event.stopPropagation();
    const group = this.oidPlusTeethArray.at(toothIndex) as FormGroup;
    let current = group.get('localization')?.value || '';
    let selected: string[] = current ? current.split(';') : [];

    if (selected.includes(option)) {
      selected = selected.filter((x: string) => x !== option);
    } else {
      selected.push(option);
    }

    group.get('localization')?.setValue(selected.join(';'));
  }

  // ---------- Типы дефектов ----------
  toggleDefectDropdown(index: number, event: Event): void {
    event.stopPropagation();
    if (this.defectDropdownOpenIndex === index) {
      this.defectDropdownOpenIndex = null;
    } else {
      this.closeAllDropdowns();
      this.defectDropdownOpenIndex = index;
    }
  }

  getDefectTypesDisplay(toothIndex: number): string {
    const group = this.oidPlusTeethArray.at(toothIndex) as FormGroup;
    const value = group.get('defect_types')?.value as string[] || [];
    return value.map(id => this.defectTypeOptions.find(opt => opt.id === id)?.name || id).join(', ');
  }

  isDefectTypeSelected(toothIndex: number, typeId: string): boolean {
    const group = this.oidPlusTeethArray.at(toothIndex) as FormGroup;
    const value = group.get('defect_types')?.value as string[] || [];
    return value.includes(typeId);
  }

  toggleDefectType(toothIndex: number, typeId: string, event: Event): void {
    event.stopPropagation();
    const group = this.oidPlusTeethArray.at(toothIndex) as FormGroup;
    let selected = group.get('defect_types')?.value as string[] || [];
    if (selected.includes(typeId)) {
      selected = selected.filter(id => id !== typeId);
    } else {
      selected = [...selected, typeId];
    }
    group.get('defect_types')?.setValue(selected);
  }

  // ---------- Коды МКБ ----------
  toggleIcdDropdown(index: number, event: Event): void {
  event.stopPropagation();
  // Если чекбокс не активирован, не открываем
  if (!this.form.get('objective.main_diagnosis_confirm')?.value) {
    return;
  }
  if (this.icdDropdownOpenIndex === index) {
    this.icdDropdownOpenIndex = null;
  } else {
    this.closeAllDropdowns();
    this.icdDropdownOpenIndex = index;
  }
}

  getIcdDisplay(toothIndex: number): string {
    const group = this.oidPlusTeethArray.at(toothIndex) as FormGroup;
    const value = group.get('icd_codes')?.value as string[] || [];
    return value.join(', ');
  }

  isIcdSelected(toothIndex: number, code: string): boolean {
    const group = this.oidPlusTeethArray.at(toothIndex) as FormGroup;
    const value = group.get('icd_codes')?.value as string[] || [];
    return value.includes(code);
  }

  toggleIcdOption(toothIndex: number, code: string, event: Event): void {
    event.stopPropagation();
    const group = this.oidPlusTeethArray.at(toothIndex) as FormGroup;
    let selected = group.get('icd_codes')?.value as string[] || [];
    if (selected.includes(code)) {
      selected = selected.filter(c => c !== code);
    } else {
      selected = [...selected, code];
    }
    group.get('icd_codes')?.setValue(selected);
  }

  closeAllDropdowns(): void {
    this.dropdownOpenIndex = null;
    this.defectDropdownOpenIndex = null;
    this.icdDropdownOpenIndex = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const isInsideDropdown = target.closest('.custom-dropdown');
    if (!isInsideDropdown) {
      this.closeAllDropdowns();
    }
  }

  // ---------- Управление зубами ----------
  addOidPlusTooth(): void {
    const newGroup = this.fb.group({
      tooth_number: [null],
      localization: [''],
      defect_types: [[]],
      icd_codes: [[]]
    });
    this.oidPlusTeethArray.push(newGroup);
    const toothNumberControl = newGroup.get('tooth_number');
    toothNumberControl?.valueChanges.subscribe(() => {
      this.syncOsWithOidPlus();
    });
    this.syncOsWithOidPlus();
  }

  removeOidPlusTooth(index: number): void {
    this.oidPlusTeethArray.removeAt(index);
    this.syncOsWithOidPlus();
  }

  // ---------- Синхронизация OS ----------
  createToothGroup(toothNumber: number, existingData?: any): FormGroup {
    return this.fb.group({
      tooth_number: [toothNumber],
      heat: [existingData?.heat || false],
      cold: [existingData?.cold || false],
      air: [existingData?.air || false],
      probe: [existingData?.probe || false],
      osmosis: [existingData?.osmosis || false],
      eod: [existingData?.eod || null]
    });
  }

  private syncOsWithOidPlus(): void {
    const toothNumbers = new Set<number>();
    for (const control of this.oidPlusTeethArray.controls) {
      const num = control.get('tooth_number')?.value;
      if (num && !toothNumbers.has(num)) toothNumbers.add(num);
    }

    const existingOsMap = new Map<number, any>();
    for (const control of this.teethArray.controls) {
      const num = control.get('tooth_number')?.value;
      if (num) existingOsMap.set(num, control.value);
    }

    this.teethArray.clear();
    const sortedNumbers = Array.from(toothNumbers).sort((a, b) => a - b);
    for (const num of sortedNumbers) {
      const existing = existingOsMap.get(num);
      this.teethArray.push(this.createToothGroup(num, existing));
    }
  }

  // ---------- Загрузка карты ----------
  loadCard(): void {
    this.loading = true;
    this.cardsService.getCard(this.patientId, this.cardId!).subscribe({
      next: (card) => {
        this.form.patchValue({
          visit_date: card.visit_date,
          tooth_count: card.tooth_count,
          diagnosis_text: card.diagnosis_text,
          subjective: card.subjective,
          objective: {
            or: card.objective.or,
            main_diagnosis_confirm: card.objective.main_diagnosis_confirm || false,
            oid_minus: card.objective.oid_minus
          }
        });

        const oidPlusArray = this.oidPlusTeethArray;
        oidPlusArray.clear();
        card.objective.oid_plus_teeth.forEach((t: any) => {
          const localizationValue = t.localization ? t.localization.replace(/,/g, ';') : '';
          oidPlusArray.push(this.fb.group({
            tooth_number: [t.tooth_number],
            localization: [localizationValue],
            defect_types: [t.defect_types || []],
            icd_codes: [t.icd_codes || []]
          }));
        });

        const savedOsMap = new Map<number, any>();
        card.objective.os.forEach((osTooth: any) => {
          savedOsMap.set(osTooth.tooth_number, osTooth);
        });
        this.teethArray.clear();
        const toothNumbers = new Set<number>();
        for (const control of oidPlusArray.controls) {
          const num = control.get('tooth_number')?.value;
          if (num) toothNumbers.add(num);
        }
        const sortedNumbers = Array.from(toothNumbers).sort((a, b) => a - b);
        for (const num of sortedNumbers) {
          const existing = savedOsMap.get(num);
          this.teethArray.push(this.createToothGroup(num, existing));
        }

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  // ---------- Сохранение ----------
  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const formValue = this.form.getRawValue();
    const payload: any = {
      patient: this.patientId,
      visit_date: formValue.visit_date,
      tooth_count: formValue.tooth_count,
      diagnosis_text: formValue.diagnosis_text || '',
      subjective: formValue.subjective,
      objective: {
        or: formValue.objective.or,
        main_diagnosis_confirm: formValue.objective.main_diagnosis_confirm || false,
        oid_plus_teeth: formValue.objective.oid_plus_teeth.map((tooth: any) => ({
          ...tooth,
          localization: tooth.localization ? tooth.localization.replace(/;/g, ',') : '',
          defect_types: tooth.defect_types,
          icd_codes: tooth.icd_codes
        })),
        oid_minus: formValue.objective.oid_minus,
        os: formValue.objective.os
      }
    };
    const request$ = this.cardId
      ? this.cardsService.updateCard(this.patientId, this.cardId, payload)
      : this.cardsService.createCard(this.patientId, payload);
    request$.subscribe({
      next: () => {
        this.uiState.setLastSelectedPatientId(this.patientId);
        this.router.navigate(['/patients']);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.uiState.setLastSelectedPatientId(this.patientId);
    this.router.navigate(['/patients']);
  }
}