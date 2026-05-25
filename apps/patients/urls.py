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
        '<int:patient_pk>/cards/<int:pk>/',
        views.ExaminationCardDetailView.as_view(),
        name='card-detail'
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
]