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
    Карта осмотра пациента за конкретное посещение.
    Структура данных основана на методических материалах по диагностике
    гиперестезии дентина зубов (Федоров-Шторина, Дедова и др.)

    subjective (S) - субъективные данные:
    {
      "sc": {"sc01": false, "sc02": false, "sc03": false, "sc04": false},
      "scale_nrs": 5,
      "sa": {
        "sad": {"sad01": false, ..., "sad05": false},
        "sar": "", "san": "", "sam": "",
        "sap": {"sap01": false, "sap02": false, "sap03": false}
      }
    }

    objective (O) - объективные данные:
    {
      "or": {"orb": false, "oro": false, "orh": false},
      "oid_plus": {"oid_plus1": false, ..., "oid_plus7": false},
      "oid_plus_teeth": [{"tooth_number": 11, "localization": "вестибулярная"}],
      "oid_minus": {"oid_minus_n": false, "oid_minus_b": false, "oid_minus_s": false},
      "os": [
        {"tooth_number": 11, "eod": 6.0,
         "heat": false, "cold": false, "air": false, "probe": false, "osmosis": false}
      ]
    }
    """
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='examination_cards',
        verbose_name='Пациент'
    )
    visit_date = models.DateField(verbose_name='Дата посещения')

    subjective = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Субъективные данные (жалобы и анамнез)'
    )
    objective = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Объективные данные (осмотр и диагностика)'
    )
    diagnosis_text = models.TextField(
        blank=True,
        verbose_name='Заключение врача (редактируемый текст)'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'examination_cards'
        ordering = ['-visit_date', '-created_at']
        verbose_name = 'Карта осмотра'
        verbose_name_plural = 'Карты осмотра'

    def __str__(self):
        return f"{self.patient} — {self.visit_date}"

    @staticmethod
    def default_subjective():
        return {
            "sc": {"sc01": False, "sc02": False, "sc03": False, "sc04": False},
            "scale_nrs": 0,
            "sa": {
                "sad": {
                    "sad01": False, "sad02": False, "sad03": False,
                    "sad04": False, "sad05": False
                },
                "sar": "", "san": "", "sam": "",
                "sap": {"sap01": False, "sap02": False, "sap03": False}
            }
        }

    @staticmethod
    def default_objective():
        return {
            "or": {"orb": False, "oro": False, "orh": False},
            "oid_plus": {
                "oid_plus1": False, "oid_plus2": False, "oid_plus3": False,
                "oid_plus4": False, "oid_plus5": False, "oid_plus6": False,
                "oid_plus7": False
            },
            "oid_plus_teeth": [],
            "oid_minus": {
                "oid_minus_n": False, "oid_minus_b": False, "oid_minus_s": False
            },
            "os": []
        }