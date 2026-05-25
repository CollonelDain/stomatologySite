from django.contrib import admin
from .models import Patient, ExaminationCard


class ExaminationCardInline(admin.TabularInline):
    model = ExaminationCard
    extra = 0
    fields = ('visit_date', 'diagnosis_text', 'created_at')
    readonly_fields = ('created_at',)
    ordering = ('-visit_date',)
    show_change_link = True


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('patient_code', 'full_name', 'email', 'phone', 'doctor', 'created_at')
    list_filter = ('doctor', 'created_at')
    search_fields = ('first_name', 'last_name', 'patient_code', 'email')
    ordering = ('-created_at',)
    inlines = [ExaminationCardInline]

    fieldsets = (
        ('Идентификация', {'fields': ('doctor', 'patient_code')}),
        ('Личные данные', {'fields': ('last_name', 'first_name', 'middle_name', 'date_of_birth')}),
        ('Контакты', {'fields': ('email', 'phone')}),
        ('Метаданные', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ExaminationCard)
class ExaminationCardAdmin(admin.ModelAdmin):
    list_display = ('patient', 'visit_date', 'diagnosis_text', 'created_at')
    list_filter = ('visit_date',)
    search_fields = ('patient__first_name', 'patient__last_name', 'patient__patient_code')
    ordering = ('-visit_date',)

    fieldsets = (
        ('Основное', {'fields': ('patient', 'visit_date')}),
        ('Субъективные данные (S)', {'fields': ('subjective',)}),
        ('Объективные данные (O)', {'fields': ('objective',)}),
        ('Заключение врача', {'fields': ('diagnosis_text',)}),
        ('Метаданные', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ('created_at', 'updated_at')