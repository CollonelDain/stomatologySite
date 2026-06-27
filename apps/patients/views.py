from django.shortcuts import render
from django.http import HttpResponse

from rest_framework import generics, permissions, status, filters
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .models import Patient, ExaminationCard
from .serializers import (
    PatientListSerializer,
    PatientDetailSerializer,
    PatientCreateUpdateSerializer,
    ExaminationCardListSerializer,
    ExaminationCardDetailSerializer,
    ExaminationCardCreateSerializer,
)

from .diagnosis import compute_diagnosis
from .pdf_generator import generate_diagnosis_pdf
from .icd10_catalog import ICD10_CODES, ICD10_BY_DEFECT, get_icd_codes_for_defects


# ── Вспомогательная функция ────────────────────────────────────────────────────

def get_patient_for_doctor(patient_pk, doctor):
    """Возвращает пациента, если он принадлежит данному врачу, иначе 404."""
    try:
        return Patient.objects.get(pk=patient_pk, doctor=doctor)
    except Patient.DoesNotExist:
        raise NotFound('Пациент не найден.')


def get_card_for_patient(card_pk: int, patient: Patient) -> ExaminationCard:
    """Возвращает карту осмотра пациента или 404."""
    try:
        return ExaminationCard.objects.get(pk=card_pk, patient=patient)
    except ExaminationCard.DoesNotExist:
        raise NotFound('Карта осмотра не найдена.')


def generate_diagnosis_text(diag: dict) -> str:
    """
    Формирует текст заключения врача на основе вычисленного диагноза.

    Формат:
      Основной диагноз: К03.8 Чувствительный дентин, форма (зубы: ...)
      Сопутствующие: код МКБ расшифровка (зубы: ...)
    """
    parts = []

    # ── Основной диагноз ──────────────────────────────────────────────────────
    primary = diag.get('primary_diagnosis', {})
    if primary.get('icd_code'):
        parts.append(primary['description'])

        # Добавляем индексы
        parts.append(diag['fedorov_degree']['interpretation'] + '.')
        parts.append(
            f"ИРГЗ: {diag['irgz']['value']}% — {diag['irgz']['interpretation']}."
        )
        parts.append(
            f"ИИГЗ: {diag['iigz']['value']} балла — {diag['iigz']['interpretation']}."
        )
        parts.append(diag['kidchz']['interpretation'] + '.')
    else:
        parts.append('Гиперестезия дентина не выявлена.')

    # ── Сопутствующие диагнозы с МКБ-кодами ──────────────────────────────────
    secondary = diag.get('secondary_diagnoses', [])
    if secondary:
        parts.append('\nСопутствующие заболевания:')
        for sd in secondary:
            teeth_str = ', '.join(str(t) for t in sd.get('teeth', []))
            teeth_note = f' (зубы: {teeth_str})' if teeth_str else ''
            if sd.get('icd_code') and sd.get('icd_title'):
                parts.append(f"— {sd['icd_code']} {sd['icd_title']}{teeth_note}.")
            else:
                # Fallback если МКБ-код не был выбран врачом
                parts.append(f"— {sd['diagnosis']}{teeth_note}.")

    return '\n'.join(parts)


# ── Пациенты ───────────────────────────────────────────────────────────────────

class PatientListCreateView(generics.ListCreateAPIView):
    """
    GET  /patients/          — список пациентов текущего врача
    POST /patients/          — создать нового пациента
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'middle_name', 'patient_code', 'email']
    ordering_fields = ['last_name', 'patient_code', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        # Врач видит только своих пациентов
        return Patient.objects.filter(doctor=self.request.user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PatientCreateUpdateSerializer
        return PatientListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        return Response(
            PatientDetailSerializer(patient, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class PatientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /patients/<id>/   — детали пациента + список карт осмотра
    PATCH  /patients/<id>/   — обновить данные пациента
    PUT    /patients/<id>/   — полное обновление
    DELETE /patients/<id>/   — удалить пациента (и все его карты)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Patient.objects.filter(doctor=self.request.user)

    def get_object(self):
        return get_patient_for_doctor(self.kwargs['pk'], self.request.user)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return PatientCreateUpdateSerializer
        return PatientDetailSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        patient = self.get_object()
        serializer = self.get_serializer(patient, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        return Response(
            PatientDetailSerializer(patient, context={'request': request}).data
        )

    def destroy(self, request, *args, **kwargs):
        patient = self.get_object()
        patient.delete()
        return Response(
            {'message': 'Пациент удалён.'},
            status=status.HTTP_200_OK
        )


# ── Карты осмотра ──────────────────────────────────────────────────────────────

class ExaminationCardListCreateView(generics.ListCreateAPIView):
    """
    GET  /patients/<patient_id>/cards/   — все карты осмотра пациента
    POST /patients/<patient_id>/cards/   — создать новую карту (новое посещение)
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_patient(self) -> Patient:
        return get_patient_for_doctor(self.kwargs['patient_pk'], self.request.user)

    def get_queryset(self):
        patient = self._get_patient()
        return ExaminationCard.objects.filter(patient=patient)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ExaminationCardCreateSerializer
        return ExaminationCardListSerializer

    def create(self, request, *args, **kwargs):
        patient = self._get_patient()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        card = serializer.save(patient=patient)
        return Response(
            ExaminationCardDetailSerializer(card, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class ExaminationCardDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /patients/<patient_id>/cards/<id>/   — полная карта осмотра
    PATCH  /patients/<patient_id>/cards/<id>/   — обновить карту
    PUT    /patients/<patient_id>/cards/<id>/   — полное обновление
    DELETE /patients/<patient_id>/cards/<id>/   — удалить карту
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_patient(self):
        return get_patient_for_doctor(self.kwargs['patient_pk'], self.request.user)

    def get_object(self):
        patient = self._get_patient()
        try:
            return ExaminationCard.objects.get(pk=self.kwargs['pk'], patient=patient)
        except ExaminationCard.DoesNotExist:
            raise NotFound('Карта осмотра не найдена.')

    def get_serializer_class(self):
        return ExaminationCardDetailSerializer

    def destroy(self, request, *args, **kwargs):
        card = self.get_object()
        card.delete()
        return Response(
            {'message': 'Карта осмотра удалена.'},
            status=status.HTTP_200_OK
        )


class LatestExaminationCardView(generics.RetrieveUpdateAPIView):
    """
    GET   /patients/<patient_id>/cards/latest/   — последняя карта осмотра
    PATCH /patients/<patient_id>/cards/latest/   — редактировать последнюю карту
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExaminationCardDetailSerializer

    def _get_patient(self) -> Patient:
        return get_patient_for_doctor(self.kwargs['patient_pk'], self.request.user)

    def get_object(self):
        patient = self._get_patient()
        card = ExaminationCard.objects.filter(patient=patient).first()
        if not card:
            raise NotFound('У пациента ещё нет карт осмотра.')
        return card


# ── Справочник МКБ-10 ──────────────────────────────────────────────────────────

class ICD10CodesView(APIView):
    """
    GET /icd-codes/
        Возвращает полный справочник МКБ-кодов, сгруппированных по дефектам.

    GET /icd-codes/?defects=1,3,5
        Возвращает только МКБ-коды, актуальные для указанных кодов дефектов.
        Используется фронтендом: при выборе дефектов в поле 3 — фильтрует
        четвёртое поле (выбор МКБ-кода) только по релевантным кодам.

    Ответ:
    {
      "by_defect": {
        "1": [{"code": "К06.00", "title": "Рецессия десны. Локальная"}, ...],
        "3": [{"code": "К03.2",  "title": "Эрозия зубов"}, ...],
      },
      "all_codes": {
        "К06.00": {"title": "...", "defect_codes": ["1"]},
        ...
      }
    }
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        defects_param = request.query_params.get('defects', '')

        if defects_param:
            # Фильтрованный режим: только коды для выбранных дефектов
            defect_codes = [d.strip() for d in defects_param.split(',') if d.strip()]
            by_defect = get_icd_codes_for_defects(defect_codes)
        else:
            # Полный справочник
            by_defect = get_icd_codes_for_defects(
                [str(i) for i in range(1, 9)]
            )

        return Response({
            'by_defect': by_defect,
            'all_codes': {
                code: {'title': entry['title'], 'defect_codes': entry['defect_codes']}
                for code, entry in ICD10_CODES.items()
            },
        }, status=status.HTTP_200_OK)


# ── Диагностика ────────────────────────────────────────────────────────────────

class DiagnosisView(APIView):
    """
    GET /api/v1/patients/<patient_id>/cards/<card_id>/diagnosis/

    Возвращает вычисленный диагноз по карте осмотра:
      - ИРГЗ, ИИГЗ, степень по Федорову
      - КИДЧЗ (по NRS)
      - Основной диагноз: К03.8 Чувствительный дентин (с формой и зубами)
      - Сопутствующие диагнозы по МКБ-10
      - Детализация по каждому зубу
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, patient_pk: int, card_pk: int):
        patient = get_patient_for_doctor(patient_pk, request.user)
        card = get_card_for_patient(card_pk, patient)
        result = compute_diagnosis(card)
        return Response(result, status=status.HTTP_200_OK)


class DiagnosisPDFView(APIView):
    """
    GET /api/v1/patients/<patient_id>/cards/<card_id>/diagnosis/pdf/

    Генерирует и возвращает PDF-отчёт с диагнозом.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, patient_pk: int, card_pk: int):
        patient = get_patient_for_doctor(patient_pk, request.user)
        card = get_card_for_patient(card_pk, patient)

        diag = compute_diagnosis(card)

        try:
            pdf_bytes = generate_diagnosis_pdf(diag)
        except Exception as e:
            return Response(
                {'error': f'Ошибка генерации PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        filename = (
            f"diagnosis_{patient.patient_code}_{card.visit_date}.pdf"
            .replace(' ', '_')
        )
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class DiagnosisGenerateTextView(APIView):
    """
    POST /api/v1/patients/<patient_id>/cards/<card_id>/diagnosis/generate-text/

    Автоматически формирует текст заключения из вычисленных индексов.
    Формат: основной диагноз (К03.8) + сопутствующие по МКБ-10.

    Ответ: { "generated_text": "..." }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, patient_pk: int, card_pk: int):
        patient = get_patient_for_doctor(patient_pk, request.user)
        card = get_card_for_patient(card_pk, patient)

        diag = compute_diagnosis(card)
        text = generate_diagnosis_text(diag)

        return Response({'generated_text': text}, status=status.HTTP_200_OK)