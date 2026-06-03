// src/app/patients/components/patients-list/patients-list.component.ts

import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PatientsService, PaginatedResponse } from '../../services/patients.service';
import { PatientsList } from '../../../models';
import { PatientFormComponent } from '../patient-form/patient-form.component';
import { PatientDetailComponent } from '../patient-detail/patient-detail.component';
import { UiStateService } from '../../../services/ui-state.service';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, ScrollingModule, PatientFormComponent, PatientDetailComponent],
  templateUrl: './patients-list.component.html',
  styleUrls: ['./patients-list.component.css']
})
export class PatientsListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  private patientsService = inject(PatientsService);
  private uiState = inject(UiStateService);

  patients: PatientsList[] = [];
  loading = false;
  error: string | null = null;
  showModal = false;
  selectedPatient: PatientsList | null = null;

  currentPage = 1;
  totalCount = 0;
  nextPageUrl: string | null = null;
  private readonly SCROLL_THRESHOLD = 200;

  searchTerm = '';
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  ngOnInit(): void {
    // Восстанавливаем поисковый запрос
    const savedSearch = this.uiState.getPatientSearchQuery();
    if (savedSearch) {
      this.searchTerm = savedSearch;
    }
    this.loadPage(1, this.searchTerm);

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.uiState.setPatientSearchQuery(term);
      this.refreshList();
    });
  }

  ngAfterViewInit(): void {
    if (this.viewport) {
      this.viewport.elementScrolled().subscribe(() => this.checkScrollEnd());
    }
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadPage(page: number, search: string): void {
    if (this.loading) return;
    this.loading = true;
    this.patientsService.getPatientsPage(page, search).subscribe({
      next: (response: PaginatedResponse<PatientsList>) => {
        if (page === 1) this.patients = [];
        this.patients = [...this.patients, ...response.results];
        this.totalCount = response.count;
        this.nextPageUrl = response.next;
        this.currentPage = page;
        this.loading = false;

        // Восстановление выбранного пациента (после загрузки первой страницы или после refresh)
        if (page === 1) {
          const savedId = this.uiState.getLastSelectedPatientId();
          if (savedId && !this.selectedPatient) {
            const found = this.patients.find(p => p.id === savedId);
            if (found) this.selectPatient(found);
          }
        }
      },
      error: (err) => {
        console.error(err);
        this.error = 'Не удалось загрузить список пациентов';
        this.loading = false;
      }
    });
  }

  refreshList(): void {
    this.patients = [];
    this.currentPage = 1;
    this.nextPageUrl = null;
    this.totalCount = 0;
    this.loadPage(1, this.searchTerm);
  }

  canLoadMore(): boolean {
    return !this.loading && this.nextPageUrl !== null && this.patients.length < this.totalCount;
  }

  loadNextPage(): void {
    if (this.canLoadMore()) {
      this.loadPage(this.currentPage + 1, this.searchTerm);
    }
  }

  private checkScrollEnd(): void {
    if (!this.viewport) return;
    const native = this.viewport.getElementRef().nativeElement;
    if (native.scrollTop + native.clientHeight >= native.scrollHeight - this.SCROLL_THRESHOLD && this.canLoadMore()) {
      this.loadNextPage();
    }
  }

  onScrollIndexChange(index: number): void {
    const THRESHOLD = 5;
    if (this.patients.length > 0 && index >= this.patients.length - THRESHOLD && this.canLoadMore()) {
      this.loadNextPage();
    }
  }

  selectPatient(patient: PatientsList): void {
    this.selectedPatient = patient;
    this.uiState.setLastSelectedPatientId(patient.id);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onPatientCreated(): void {
    this.closeModal();
    this.refreshList();
  }
}