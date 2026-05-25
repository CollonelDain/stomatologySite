from rest_framework import serializers
from .models import Patient, ExaminationCard



# ── Валидаторы структуры JSON ─────────────────────────────────────────────────

def _validate_bool_keys(d, required_keys, section_name):
    """Проверяет, что словарь содержит нужные ключи с булевыми значениями."""
    if not isinstance(d, dict):
        raise serializers.ValidationError(f'{section_name} должен быть объектом (dict).')
    for key in required_keys:
        val = d.get(key)
        if val is not None and not isinstance(val, bool):
            raise serializers.ValidationError(
                f'{section_name}.{key} должен быть boolean (true/false).'
            )


def validate_subjective(value):
    """Валидация блока субъективных данных (S)."""
    if not isinstance(value, dict):
        raise serializers.ValidationError('subjective должен быть объектом.')

    # Sc
    sc = value.get('sc', {})
    _validate_bool_keys(sc, ['sc01', 'sc02', 'sc03', 'sc04'], 'sc')

    # scale_nrs
    nrs = value.get('scale_nrs', 0)
    if not isinstance(nrs, (int, float)) or not (0 <= nrs <= 10):
        raise serializers.ValidationError('scale_nrs должен быть числом от 0 до 10.')

    # Sa
    sa = value.get('sa', {})
    if not isinstance(sa, dict):
        raise serializers.ValidationError('sa должен быть объектом.')

    sad = sa.get('sad', {})
    _validate_bool_keys(sad, ['sad01', 'sad02', 'sad03', 'sad04', 'sad05'], 'sa.sad')

    sap = sa.get('sap', {})
    _validate_bool_keys(sap, ['sap01', 'sap02', 'sap03'], 'sa.sap')

    for field in ['sar', 'san', 'sam']:
        val = sa.get(field, '')
        if val is not None and not isinstance(val, str):
            raise serializers.ValidationError(f'sa.{field} должен быть строкой.')

    return value


def validate_objective(value):
    """Валидация блока объективных данных (O)."""
    if not isinstance(value, dict):
        raise serializers.ValidationError('objective должен быть объектом.')

    # Or
    or_data = value.get('or', {})
    _validate_bool_keys(or_data, ['orb', 'oro', 'orh'], 'or')

    # Oid+
    oid_plus = value.get('oid_plus', {})
    _validate_bool_keys(
        oid_plus,
        ['oid_plus1', 'oid_plus2', 'oid_plus3', 'oid_plus4',
         'oid_plus5', 'oid_plus6', 'oid_plus7'],
        'oid_plus'
    )

    # Oid-
    oid_minus = value.get('oid_minus', {})
    _validate_bool_keys(oid_minus, ['oid_minus_n', 'oid_minus_b', 'oid_minus_s'], 'oid_minus')

    # Oic+ — список зубов с дефектами
    oid_plus_teeth = value.get('oid_plus_teeth', [])
    if not isinstance(oid_plus_teeth, list):
        raise serializers.ValidationError('oid_plus_teeth должен быть массивом.')
    for item in oid_plus_teeth:
        if not isinstance(item, dict):
            raise serializers.ValidationError('Каждый элемент oid_plus_teeth должен быть объектом.')
        if 'tooth_number' not in item:
            raise serializers.ValidationError('Каждый зуб в oid_plus_teeth должен иметь tooth_number.')

    # Os — специальная диагностика по зубам
    os_list = value.get('os', [])
    if not isinstance(os_list, list):
        raise serializers.ValidationError('os должен быть массивом.')

    seen_teeth = set()
    for tooth in os_list:
        if not isinstance(tooth, dict):
            raise serializers.ValidationError('Каждый элемент os должен быть объектом.')
        tn = tooth.get('tooth_number')
        if tn is None:
            raise serializers.ValidationError('Каждый зуб в os должен иметь tooth_number.')
        if tn in seen_teeth:
            raise serializers.ValidationError(f'Зуб {tn} в os указан дважды.')
        seen_teeth.add(tn)

        eod = tooth.get('eod')
        if eod is not None and not isinstance(eod, (int, float)):
            raise serializers.ValidationError(f'os[{tn}].eod должен быть числом (мкА).')

        for stim in ['heat', 'cold', 'air', 'probe', 'osmosis']:
            val = tooth.get(stim)
            if val is not None and not isinstance(val, bool):
                raise serializers.ValidationError(
                    f'os[{tn}].{stim} должен быть boolean (true/false).'
                )

    return value


# ── Карты осмотра ──────────────────────────────────────────────────────────────

class ExaminationCardListSerializer(serializers.ModelSerializer):
    """Краткое представление карты для списка посещений пациента"""

    class Meta:
        model = ExaminationCard
        fields = (
            'id', 'visit_date', 'diagnosis_text',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class ExaminationCardDetailSerializer(serializers.ModelSerializer):
    """Полная карта осмотра"""

    class Meta:
        model = ExaminationCard
        fields = (
            'id', 'patient', 'visit_date',
            'subjective', 'objective',
            'diagnosis_text',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'patient', 'created_at', 'updated_at')

    def validate_subjective(self, value):
        return validate_subjective(value)

    def validate_objective(self, value):
        return validate_objective(value)



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