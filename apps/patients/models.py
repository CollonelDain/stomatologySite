from django.db import models

from config import settings


class Patient(models.Model):
    """
    Модель пациента
    """
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patients',
        verbose_name='Врач'
    )
    first_name = models.CharField(max_length=100, verbose_name='Имя')
    last_name = models.CharField(max_length=100, verbose_name='Фамилия')
    middle_name = models.CharField(max_length=100, blank=True, verbose_name='Отчество')
    patient_code = models.CharField(max_length=50, verbose_name='Код пациента (из история болезни)')
    email = models.EmailField(blank=True, null=True, verbose_name='Email')
    date_of_birth = models.DateField(blank=True, null=True, verbose_name='Дата рождения')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    class Meta:
        db_table = 'patients'
        # Код пациента уникален в рамках одного врача
        unique_together = ('doctor', 'patient_code')
        ordering = ['-created_at']
        verbose_name = 'Пациент'
        verbose_name_plural = 'Пациенты'
 
    def __str__(self):
        return f"{self.last_name} {self.first_name} [{self.patient_code}]"
 
    @property
    def full_name(self):
        parts = [self.last_name, self.first_name, self.middle_name]
        return ' '.join(p for p in parts if p).strip()
 
 
class ExaminationCard(models.Model):
    """
    Модель карты осмотра пациента за конкретное посещение.
    Врач может создать новую или отредактировать последнюю.
    """
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='examination_cards',
        verbose_name='Пациент'
    )
 
    visit_date = models.DateField(verbose_name='Дата посещения')
 
    # ── Зубная карта (JSON) ──────────────────────────────────────────────
    # Каждый зуб: {"status": "...", "procedure": "...", "notes": ""}
    # Возможные статусы: healthy, caries, pulpitis, periodontitis,
    #   crown, implant, missing, extracted, root, filling, other
    teeth_chart = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Зубная карта'
    )
 
    # ── Диагноз ───────────────────────────────────────────────
    diagnosis = models.TextField(blank=True, verbose_name='Диагноз')
 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    class Meta:
        db_table = 'examination_cards'
        ordering = ['-visit_date', '-created_at']
        verbose_name = 'Карта осмотра'
        verbose_name_plural = 'Карты осмотра'
 
    def __str__(self):
        return f"{self.patient} — {self.visit_date}"