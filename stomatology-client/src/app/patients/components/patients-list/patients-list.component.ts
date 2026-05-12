import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatedResponse, PatientsService } from '../../services/patients.service';
import { PatientsList } from '../../../models';
import { PatientFormComponent } from '../patient-form/patient-form.component';
import { PatientDetailComponent } from '../patient-detail/patient-detail.component';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

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
    this.loadPage(1);
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
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

  private checkScrollEnd(): void {
    if (!this.viewport) return;
    const nativeElement = this.viewport.getElementRef().nativeElement;
    const { scrollTop, scrollHeight, clientHeight } = nativeElement;
    if (scrollTop + clientHeight >= scrollHeight - this.SCROLL_THRESHOLD && this.canLoadMore()) {
      this.loadNextPage();
    }
  }

  loadPage(page: number): void {
    if (this.loading) return;
    this.loading = true;
    this.patientsService.getPatientsPage(page, this.searchTerm).subscribe({
      next: (response: PaginatedResponse<PatientsList>) => {
        if (page === 1) this.patients = [];
        this.patients = [...this.patients, ...response.results];
        this.totalCount = response.count;
        this.nextPageUrl = response.next;
        this.currentPage = page;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Не удалось загрузить список пациентов';
        this.loading = false;
      }
    });
  }

  onScrollIndexChange(index: number): void {
  // Если мы приблизились к последним N элементам, загружаем следующую страницу
  const THRESHOLD = 5;
  if (this.patients.length > 0 && index >= this.patients.length - THRESHOLD && this.canLoadMore()) {
    this.loadNextPage();
  }
}

  canLoadMore(): boolean {
    return !this.loading && this.nextPageUrl !== null && this.patients.length < this.totalCount;
  }

  loadNextPage(): void {
    if (this.canLoadMore()) {
      this.loadPage(this.currentPage + 1);
    }
  }

  selectPatient(patient: PatientsList): void {
    this.selectedPatient = patient;
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

  refreshList(): void {
    this.patients = [];
    this.currentPage = 1;
    this.nextPageUrl = null;
    this.totalCount = 0;
    this.loadPage(1);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }
}