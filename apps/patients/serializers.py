from rest_framework import serializers
from .models import Patient, ExaminationCard


# ── Карты осмотра ──────────────────────────────────────────────────────────────

class ExaminationCardListSerializer(serializers.ModelSerializer):
    """Краткое представление карты для списка посещений пациента"""

    class Meta:
        model = ExaminationCard
        fields = (
            'id', 'visit_date', 'diagnosis',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class ExaminationCardDetailSerializer(serializers.ModelSerializer):
    """Полная карта осмотра"""

    class Meta:
        model = ExaminationCard
        fields = (
            'id', 'patient', 'visit_date',
            # Зубная карта
            'teeth_chart',
            # Диагноз
            'diagnosis',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'patient', 'created_at', 'updated_at')

    def validate_teeth_chart(self, value):
        """
        Проверяем структуру зубной карты.
        Ожидается: {"11": {"status": "...", "notes": "..."}, ...}
        """
        valid_statuses = {
            'healthy', 'caries', 'pulpitis', 'periodontitis',
            'crown', 'implant', 'missing', 'extracted', 'root',
            'filling', 'other', ''
        }
        if not isinstance(value, dict):
            raise serializers.ValidationError('teeth_chart должна быть объектом (dict).')

        for tooth_key, tooth_data in value.items():
            if not isinstance(tooth_data, dict):
                raise serializers.ValidationError(
                    f'Данные зуба "{tooth_key}" должны быть объектом.'
                )
            status = tooth_data.get('status', '')
            if status not in valid_statuses:
                raise serializers.ValidationError(
                    f'Недопустимый статус "{status}" для зуба "{tooth_key}". '
                    f'Допустимые значения: {", ".join(valid_statuses)}'
                )
        return value


class ExaminationCardCreateSerializer(ExaminationCardDetailSerializer):
    """Создание карты — patient задаётся через URL, не из тела запроса"""

    class Meta(ExaminationCardDetailSerializer.Meta):
        read_only_fields = ('id', 'patient', 'created_at', 'updated_at')


# ── Пациенты ───────────────────────────────────────────────────────────────────

class PatientListSerializer(serializers.ModelSerializer):
    """Краткое представление пациента для списка"""
    full_name = serializers.ReadOnlyField()
    last_visit = serializers.SerializerMethodField()
    cards_count = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = (
            'id', 'patient_code', 'first_name', 'last_name', 'middle_name',
            'full_name', 'email', 'phone', 'date_of_birth',
            'last_visit', 'cards_count', 'created_at'
        )
        read_only_fields = ('id', 'created_at')

    def get_last_visit(self, obj):
        last_card = obj.examination_cards.first()  # ordered by -visit_date
        return last_card.visit_date if last_card else None

    def get_cards_count(self, obj):
        return obj.examination_cards.count()


class PatientDetailSerializer(serializers.ModelSerializer):
    """Детальное представление пациента"""
    full_name = serializers.ReadOnlyField()
    examination_cards = ExaminationCardListSerializer(many=True, read_only=True)

    class Meta:
        model = Patient
        fields = (
            'id', 'patient_code', 'first_name', 'last_name', 'middle_name',
            'full_name', 'email', 'phone', 'date_of_birth',
            'examination_cards', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class PatientCreateUpdateSerializer(serializers.ModelSerializer):
    """Создание и обновление пациента"""

    class Meta:
        model = Patient
        fields = (
            'patient_code', 'first_name', 'last_name', 'middle_name',
            'email', 'phone', 'date_of_birth'
        )

    def validate_patient_code(self, value):
        """
        patient_code должен быть уникальным для данного врача.
        При обновлении исключаем текущего пациента.
        """
        request = self.context['request']
        qs = Patient.objects.filter(doctor=request.user, patient_code=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                'Пациент с таким кодом уже существует в вашей базе.'
            )
        return value

    def create(self, validated_data):
        validated_data['doctor'] = self.context['request'].user
        return super().create(validated_data)