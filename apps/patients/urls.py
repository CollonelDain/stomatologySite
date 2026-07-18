from django.urls import path
from . import views

urlpatterns = [
    # ── Пациенты ──────────────────────────────────────────────────────────────
    path(
        '',
        views.PatientListCreateView.as_view(),
        name='patient-list-create'
    ),
    path(
        '<int:pk>/',
        views.PatientDetailView.as_view(),
        name='patient-detail'
    ),

    # ── Карты осмотра ──────────────────────────────────────────────────────────
    path(
        '<int:patient_pk>/cards/',
        views.ExaminationCardListCreateView.as_view(),
        name='card-list-create'
    ),
    path(
        '<int:patient_pk>/cards/latest/',
        views.LatestExaminationCardView.as_view(),
        name='card-latest'
    ),
    path(
        '<int:patient_pk>/cards/diagnosis-history/',
        views.PatientCardsDiagnosisHistoryView.as_view(),
        name='card-diagnosis-history'
    ),
    path(
        '<int:patient_pk>/cards/<int:pk>/',
        views.ExaminationCardDetailView.as_view(),
        name='card-detail'
    ),

    # ── Справочник МКБ-10 ──────────────────────────────────────────────────────
    # GET /patients/icd-codes/              — полный справочник
    # GET /patients/icd-codes/?defects=1,3  — только для выбранных дефектов
    path(
        'icd-codes/',
        views.ICD10CodesView.as_view(),
        name='icd-codes'
    ),

    # ── Диагностика ────────────────────────────────────────────────────────────
    path(
        '<int:patient_pk>/cards/<int:card_pk>/diagnosis/', 
        views.DiagnosisView.as_view(),
        name='card-diagnosis'
    ),
    path(
        '<int:patient_pk>/cards/<int:card_pk>/diagnosis/pdf/',
        views.DiagnosisPDFView.as_view(), 
        name='card-diagnosis-pdf'
    ),
    path(
        '<int:patient_pk>/cards/<int:card_pk>/diagnosis/generate-text/',
        views.DiagnosisGenerateTextView.as_view(),
        name='card-diagnosis-generate-text'
    ),
]