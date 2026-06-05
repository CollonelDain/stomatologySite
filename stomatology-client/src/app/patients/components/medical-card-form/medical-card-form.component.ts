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

  // Варианты локализации (первый мультиселект)
  localizationOptions: string[] = [
    'вестибулярная',
    'оральная',
    'окклюзионная',
    'апроксимальная медиальная',
    'апроксимальная дистальная',
    'корень зуба'
  ];

  // Варианты типов дефектов (второй мультиселект) – id и отображаемое имя
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

  // Индексы открытых dropdown
  dropdownOpenIndex: number | null = null;
  defectDropdownOpenIndex: number | null = null;

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

  // Создание группы для осмотра зуба (OS)
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

  // Синхронизация OS с OID+ зубами
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

  // Добавление нового зуба в OID+
  addOidPlusTooth(): void {
    const newGroup = this.fb.group({
      tooth_number: [null],
      localization: [''],
      defect_types: [[]]   // массив строк
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

  // ========== ЛОКАЛИЗАЦИЯ (мультиселект, разделитель ;) ==========
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

  // ========== ТИПЫ ДЕФЕКТОВ (работа с массивом string[]) ==========
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

  closeAllDropdowns(): void {
    this.dropdownOpenIndex = null;
    this.defectDropdownOpenIndex = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const isInsideDropdown = target.closest('.custom-dropdown');
    if (!isInsideDropdown) {
      this.closeAllDropdowns();
    }
  }

  // ========== ЗАГРУЗКА КАРТЫ ==========
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
            oid_minus: card.objective.oid_minus
          }
        });

        const oidPlusArray = this.oidPlusTeethArray;
        oidPlusArray.clear();
        card.objective.oid_plus_teeth.forEach((t: any) => {
          // Преобразуем локализацию из старого формата (запятые -> ;)
          const localizationValue = t.localization ? t.localization.replace(/,/g, ';') : '';
          oidPlusArray.push(this.fb.group({
            tooth_number: [t.tooth_number],
            localization: [localizationValue],
            defect_types: [t.defect_types || []]
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

  // ========== СОХРАНЕНИЕ ==========
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
        oid_plus_teeth: formValue.objective.oid_plus_teeth.map((tooth: any) => ({
          ...tooth,
          // Если нужно преобразовать обратно в запятые (если бэк ожидает строку), но у нас defect_types уже массив
          localization: tooth.localization ? tooth.localization.replace(/;/g, ',') : '',
          defect_types: tooth.defect_types  // уже массив строк
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