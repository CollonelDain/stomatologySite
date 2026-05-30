import { CommonModule, isPlatformBrowser } from "@angular/common";
import { AfterViewInit, Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, PLATFORM_ID, SimpleChanges, ViewChild, Inject } from "@angular/core";
import { MedicalCard, PatientDetail } from "../../../models";
import { MedicalCardsService } from "../../services/medical-card.service";
import { CdkVirtualScrollViewport, ScrollingModule } from "@angular/cdk/scrolling";
import { MedicalCardComponent } from "../medical-card/medical-card.component";
import { MedicalCardFormComponent } from "../medical-card/components/medical-card-form/medical-card-form.component";
import { PatientsService } from "../../services/patients.service";
import { RouterModule } from "@angular/router";
import { PatientFormComponent } from "../patient-form/patient-form.component";
import { debounceTime, distinctUntilChanged, Subject, Subscription } from "rxjs";

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ScrollingModule,
    MedicalCardComponent,
    MedicalCardFormComponent,
    PatientFormComponent
  ],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.css']
})
export class PatientDetailComponent implements OnChanges, AfterViewInit, OnInit, OnDestroy {
  @Input() patientId!: number;
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  private patientsService = inject(PatientsService);
  private cardsService = inject(MedicalCardsService);

  // Данные пациента
  patient: PatientDetail | null = null;
  patientLoading = false;
  patientError: string | null = null;

  // Медицинские карты
  cards: MedicalCard[] = [];
  cardsLoading = false;
  cardsError: string | null = null;

  // Пагинация карт
  currentPage = 1;
  totalCards = 0;
  nextCardsUrl: string | null = null;
  private readonly SCROLL_THRESHOLD = 200;

  // Поиск по дате приёма
  searchVisitDate: string = '';
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  // Модальные окна
  showEditPatientModal = false;
  showCardForm = false;
  editingCard: MedicalCard | undefined = undefined;

  // Скрытие информации о пациенте (мобильная версия)
  showPatientInfo: boolean = true;
  isMobile: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    // Определяем, мобильное ли устройство (ширина <= 768px)
    if (isPlatformBrowser(this.platformId)) {
      this.checkMobile();
      window.addEventListener('resize', () => this.checkMobile());
    }

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(date => {
      this.searchVisitDate = date;
      this.resetAndLoadCards();
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', () => this.checkMobile());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId'] && this.patientId) {
      this.loadPatient();
      this.resetAndLoadCards();
    }
  }

  ngAfterViewInit(): void {
    if (this.viewport) {
      this.viewport.elementScrolled().subscribe(() => this.checkScrollEnd());
    }
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================
  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isMobile) {
      this.showPatientInfo = true;
    }
  }

  togglePatientInfo(): void {
    if (this.isMobile) {
      this.showPatientInfo = !this.showPatientInfo;
    }
  }

  // ==================== ДАННЫЕ ПАЦИЕНТА ====================
  private loadPatient(): void {
    this.patientLoading = true;
    this.patientError = null;
    this.patientsService.getPatientById(this.patientId).subscribe({
      next: (data) => {
        this.patient = data;
        this.patientLoading = false;
      },
      error: (err) => {
        this.patientError = 'Не удалось загрузить данные пациента';
        this.patientLoading = false;
      }
    });
  }

  openEditPatientModal(): void {
    this.showEditPatientModal = true;
  }

  closeEditPatientModal(): void {
    this.showEditPatientModal = false;
  }

  onPatientUpdated(): void {
    this.closeEditPatientModal();
    this.loadPatient();
  }

  get editPatientData() {
    if (!this.patient) return undefined;
    return {
      id: this.patient.id,
      patient_code: this.patient.patient_code,
      first_name: this.patient.first_name,
      last_name: this.patient.last_name,
      middle_name: this.patient.middle_name,
      email: this.patient.email,
      phone: this.patient.phone,
      date_of_birth: this.patient.date_of_birth?.toISOString().split('T')[0] || null
    };
  }

  // ==================== МЕДИЦИНСКИЕ КАРТЫ ====================
  onVisitDateSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  private resetAndLoadCards(): void {
    this.cards = [];
    this.currentPage = 1;
    this.nextCardsUrl = null;
    this.totalCards = 0;
    this.loadCardsPage(1);
  }

  onScrollIndexChange(index: number): void {
    const THRESHOLD = 5;
    if (this.cards.length > 0 && index >= this.cards.length - THRESHOLD && this.canLoadMoreCards()) {
      this.loadNextCardsPage();
    }
  }

  loadCardsPage(page: number): void {
    if (this.cardsLoading) return;
    this.cardsLoading = true;
    this.cardsService.getCards(this.patientId, page, this.searchVisitDate).subscribe({
      next: (response) => {
        if (page === 1) this.cards = [];
        this.cards = [...this.cards, ...response.results];
        this.totalCards = response.count;
        this.nextCardsUrl = response.next;
        this.currentPage = page;
        this.cardsLoading = false;
        setTimeout(() => this.viewport?.checkViewportSize(), 50);
      },
      error: (err) => {
        this.cardsError = 'Не удалось загрузить карты осмотра';
        this.cardsLoading = false;
      }
    });
  }

  canLoadMoreCards(): boolean {
    return !this.cardsLoading && this.nextCardsUrl !== null && this.cards.length < this.totalCards;
  }

  loadNextCardsPage(): void {
    if (this.canLoadMoreCards()) {
      this.loadCardsPage(this.currentPage + 1);
    }
  }

  private checkScrollEnd(): void {
    if (!this.viewport) return;
    const native = this.viewport.getElementRef().nativeElement;
    if (native.scrollTop + native.clientHeight >= native.scrollHeight - this.SCROLL_THRESHOLD && this.canLoadMoreCards()) {
      this.loadNextCardsPage();
    }
  }

  openAddCardForm(): void {
    this.editingCard = undefined;
    this.showCardForm = true;
  }

  onEditCard(card: MedicalCard): void {
    this.editingCard = card;
    this.showCardForm = true;
  }

  onDeleteCard(card: MedicalCard): void {
    if (confirm('Удалить карту осмотра?')) {
      this.cardsService.deleteCard(this.patientId, card.id).subscribe({
        next: () => this.resetAndLoadCards(),
        error: (err) => console.error(err)
      });
    }
  }

  closeCardForm(): void {
    this.showCardForm = false;
    this.editingCard = undefined;
  }

  onCardFormSuccess(data: { visit_date: string; diagnosis: string }): void {
    const request = this.editingCard
      ? this.cardsService.updateCard(this.patientId, this.editingCard.id, data)
      : this.cardsService.createCard(this.patientId, data);
    request.subscribe({
      next: () => {
        this.closeCardForm();
        this.resetAndLoadCards();
      },
      error: (err) => console.error(err)
    });
  }
}