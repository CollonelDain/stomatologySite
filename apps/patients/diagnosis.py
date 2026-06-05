"""
Модуль вычисления диагноза гиперестезии дентина зубов.

Реализованные индексы:
  - ИРГЗ  — Индекс распространённости гиперестезии зубов (Федоров–Шторина, 1988)
  - ИИГЗ  — Индекс интенсивности гиперестезии зубов (Федоров–Шторина, 1988)
  - Степень по Федорову (I, II, III)
  - ЭОД степень (по порогу электровозбудимости)
  - КИДЧЗ — по шкале NRS (Дедова, 2004)

Дополнительные диагнозы (по типам дефектов твёрдых тканей, OID+):
  Коды 1–8 соответствуют классам дефектов по таблице Дедовой.
"""


# ── Метки полей карты ─────────────────────────────────────────────────────────

SC_LABELS = {
    'sc01': 'Воздух',
    'sc02': 'Температурные факторы',
    'sc03': 'Осмотические факторы',
    'sc04': 'Тактильные/механические раздражители',
}

SAD_LABELS = {
    'sad01': 'Травма (откол, трещина)',
    'sad02': 'Повышенная стираемость',
    'sad03': 'Заболевания пародонта',
    'sad04': 'Гипоплазия эмали / дисплазия соединительной ткани',
    'sad05': 'Отсутствие цемента (генетическая предрасположенность)',
}

SAP_LABELS = {
    'sap01': 'Кислоты',
    'sap02': 'Абразивы',
    'sap03': 'Профессиональная травма',
}

OR_LABELS = {
    'orb': 'Тонкий биотип',
    'oro': 'Функциональная перегрузка',
    'orh': 'Нерациональная гигиена полости рта',
}

OID_MINUS_LABELS = {
    'oid_minus_n': 'Обнажение шейки зуба',
    'oid_minus_b': 'Отбеливание зубов',
    'oid_minus_s': 'Системная гиперестезия',
}


# ── Справочник дополнительных диагнозов (OID+) ───────────────────────────────
#
# Ключ  — код дефекта (строка "1"–"8"), который приходит с фронтенда.
# Значения:
#   letter       — буква-обозначение из таблицы
#   class_name   — класс дефекта (русское название)
#   etiology     — краткое описание этиологии
#   localization — типичная локализация обнажения дентина
#   diagnosis    — полная формулировка дополнительного диагноза

DEFECT_TYPE_CATALOG: dict[str, dict] = {
    '1': {
        'letter': 'Р',
        'class_name': 'Рецессия десны',
        'etiology': (
            'Воспалительные заболевания пародонта, нерациональная (некорректная) '
            'гигиена, вертикальное выдвижение зубов'
        ),
        'localization': 'Шейка и корень зуба',
        'diagnosis': 'Рецессия десны (класс Р)',
    },
    '2': {
        'letter': 'П',
        'class_name': 'Повышенная стираемость твёрдых тканей зубов',
        'etiology': (
            'Естественное (возрастное) стирание эмали, аномалии прикуса, '
            'функциональная перегрузка или недостаточность твёрдых тканей зубов, '
            'парафункции, частичная потеря зубов, гипертонус жевательных мышц, '
            'профессиональные вредности, вредные привычки'
        ),
        'localization': 'Окклюзионные и контактирующие с антагонистами поверхности',
        'diagnosis': 'Повышенная стираемость твёрдых тканей зубов (класс П)',
    },
    '3': {
        'letter': 'Э',
        'class_name': 'Эрозии эмали',
        'etiology': (
            'Деминерализующее воздействие кислот, гиперфункция щитовидной железы, '
            'нерациональная гигиена'
        ),
        'localization': 'Вестибулярные поверхности коронки',
        'diagnosis': 'Эрозии эмали (класс Э)',
    },
    '4': {
        'letter': 'К',
        'class_name': 'Клиновидные дефекты',
        'etiology': (
            'Заболевания пародонта, нервно-дистрофические расстройства, '
            'нарушения органической субстанции зубов'
        ),
        'localization': 'Вестибулярные поверхности коронок, шейки и корня',
        'diagnosis': 'Клиновидные дефекты (класс К)',
    },
    '5': {
        'letter': 'Ф',
        'class_name': 'Флюороз и процедуры отбеливания зубов',
        'etiology': (
            'Интоксикация организма фтором, разрушающее действие перекиси водорода, '
            'пероксида карбамида, пербората натрия'
        ),
        'localization': 'Вестибулярные поверхности коронок',
        'diagnosis': 'Флюороз и/или последствия процедур отбеливания зубов (класс Ф)',
    },
    '6': {
        'letter': 'Т',
        'class_name': 'Травма твёрдых тканей зубов, незавершённый амелогенез',
        'etiology': (
            'Острая и хроническая экзогенная травма (откол эмали, дентина, '
            'устранение слоя цемента корня), ятрогенная травма (препарирование)'
        ),
        'localization': 'В местах травмы, при препарировании — в участках препарирования',
        'diagnosis': 'Травма твёрдых тканей зубов / незавершённый амелогенез (класс Т)',
    },
    '7': {
        'letter': 'Г',
        'class_name': 'Гипоплазия эмали зубов',
        'etiology': 'Нарушение метаболических процессов в развивающихся зубах',
        'localization': 'Разные участки коронки',
        'diagnosis': 'Гипоплазия эмали зубов (класс Г)',
    },
    '8': {
        'letter': 'Н',
        'class_name': 'Некроз эмали',
        'etiology': 'Деминерализующее воздействие кислот',
        'localization': 'В местах воздействия кислот',
        'diagnosis': 'Некроз эмали (класс Н)',
    },
}


# ── Вспомогательные функции ───────────────────────────────────────────────────

def _checked_keys(d: dict, labels: dict) -> list[str]:
    """Возвращает список меток для отмеченных (True) ключей словаря."""
    return [labels[k] for k, v in d.items() if v and k in labels]


def _tooth_iigz_score(tooth: dict) -> int:
    """
    Оценка ИИГЗ для отдельного зуба по Федорову–Шториной:
      0 — нет реакции ни на один раздражитель
      1 — реакция только на температурный (тепло / холод)
      2 — реакция на температурный + химический (осмос / воздух)
      3 — реакция на температурный + химический + тактильный (зонд)
    """
    has_temp = bool(tooth.get('heat') or tooth.get('cold'))
    has_chem = bool(tooth.get('osmosis') or tooth.get('air'))
    has_tact = bool(tooth.get('probe'))

    if not has_temp:
        return 0
    if has_temp and has_chem and has_tact:
        return 3
    if has_temp and has_chem:
        return 2
    return 1


def _eod_degree(eod_mka: float | None) -> str | None:
    """Степень гиперестезии по ЭОД (мкА)."""
    if eod_mka is None:
        return None
    if eod_mka >= 5:
        return 'I степень (5–8 мкА)'
    if eod_mka >= 3:
        return 'II степень (3–5 мкА)'
    if eod_mka >= 1.5:
        return 'III степень (1.5–2.5 мкА)'
    return 'Ниже нормального порога (<1.5 мкА)'


def _compute_secondary_diagnoses(oid_plus_teeth: list[dict]) -> list[dict]:
    """
    Вычисляет дополнительные диагнозы на основе типов дефектов (OID+)
    по каждому зубу. Возвращает список уникальных дополнительных диагнозов
    с указанием зубов, у которых выявлен каждый тип дефекта.

    Структура каждого элемента:
    {
        'code':         '1',
        'letter':       'Р',
        'class_name':   'Рецессия десны',
        'etiology':     '...',
        'localization': 'Шейка и корень зуба',
        'diagnosis':    'Рецессия десны (класс Р)',
        'teeth':        [11, 21, 22],   # номера зубов с данным дефектом
    }
    """
    # Собираем: код дефекта → список зубов
    defect_to_teeth: dict[str, list[int]] = {}
    for tooth_item in oid_plus_teeth:
        tooth_number = tooth_item.get('tooth_number')
        defect_types = tooth_item.get('defect_types', [])
        if not isinstance(defect_types, list):
            continue
        for code in defect_types:
            code_str = str(code)
            if code_str not in DEFECT_TYPE_CATALOG:
                continue
            defect_to_teeth.setdefault(code_str, [])
            if tooth_number is not None:
                defect_to_teeth[code_str].append(tooth_number)

    # Формируем результирующий список, сортируем по коду
    result = []
    for code in sorted(defect_to_teeth.keys(), key=lambda x: int(x)):
        catalog_entry = DEFECT_TYPE_CATALOG[code]
        teeth_list = sorted(set(defect_to_teeth[code]))
        result.append({
            'code': code,
            'letter': catalog_entry['letter'],
            'class_name': catalog_entry['class_name'],
            'etiology': catalog_entry['etiology'],
            'localization': catalog_entry['localization'],
            'diagnosis': catalog_entry['diagnosis'],
            'teeth': teeth_list,
        })
    return result


# ── Главная функция ───────────────────────────────────────────────────────────

def compute_diagnosis(card) -> dict:
    """
    Вычисляет все диагностические индексы по данным карты осмотра.

    Ключевое отличие от классической формулы:
      ИРГЗ = (n_sensitive / tooth_count) × 100

    где tooth_count — фактическое число зубов пациента (поле карты),
    а не просто количество осмотренных зубов. Это корректно для пациентов
    с удалёнными зубами: если у человека 28 зубов и 7 из них чувствительны,
    ИРГЗ = 25%, а не 7/7*100 = 100% при осмотре только этих зубов.
    """
    subj = card.subjective or {}
    obj = card.objective or {}

    # tooth_count — фактическое число зубов (по умолчанию 32)
    tooth_count: int = getattr(card, 'tooth_count', 32) or 32

    # ── Субъективные данные ───────────────────────────────────────────────────
    sc = subj.get('sc', {})
    scale_nrs = subj.get('scale_nrs', 0)
    sa = subj.get('sa', {})
    sad = sa.get('sad', {})
    sap = sa.get('sap', {})

    complaints = _checked_keys(sc, SC_LABELS)
    dentin_causes = _checked_keys(sad, SAD_LABELS)
    prof_hazards = _checked_keys(sap, SAP_LABELS)

    # ── Объективные данные ────────────────────────────────────────────────────
    or_data = obj.get('or', {})
    oid_plus_teeth: list[dict] = obj.get('oid_plus_teeth', [])
    oid_minus = obj.get('oid_minus', {})
    os_teeth: list[dict] = obj.get('os', [])

    risk_factors = _checked_keys(or_data, OR_LABELS)
    no_loss_factors = _checked_keys(oid_minus, OID_MINUS_LABELS)

    # ── Специальная диагностика (Os) ──────────────────────────────────────────
    sensitive_teeth = [
        t for t in os_teeth
        if any([t.get('heat'), t.get('cold'), t.get('air'),
                t.get('probe'), t.get('osmosis')])
    ]
    n_examined = len(os_teeth)      # осмотрено зубов
    n_sensitive = len(sensitive_teeth)

    # ── ИРГЗ (Федоров–Шторина) ────────────────────────────────────────────────
    irgz_denominator = max(tooth_count, n_examined)
    irgz_value = round((n_sensitive / irgz_denominator * 100), 1) if irgz_denominator > 0 else 0.0
    if irgz_value == 0:
        irgz_form = 'Гиперестезия не выявлена'
    elif irgz_value <= 25:
        irgz_form = 'Ограниченная (локализованная) форма гиперестезии'
    else:
        irgz_form = 'Генерализованная форма гиперестезии'

    # ── ИИГЗ (Федоров–Шторина) ────────────────────────────────────────────────
    tooth_scores = [_tooth_iigz_score(t) for t in sensitive_teeth]
    iigz_value = round(sum(tooth_scores) / n_sensitive, 2) if n_sensitive > 0 else 0.0
    if iigz_value == 0:
        iigz_degree = 'Гиперестезия не выявлена'
    elif iigz_value < 1.5:
        iigz_degree = 'I степень'
    elif iigz_value <= 2.2:
        iigz_degree = 'II степень'
    else:
        iigz_degree = 'III степень'

    # ── Степень по Федорову (наиболее тяжёлая среди всех зубов) ──────────────
    max_score = max(tooth_scores) if tooth_scores else 0
    fedorov_degree_map = {
        0: 'Гиперестезия не выявлена',
        1: 'I степень — реакция на температурный раздражитель',
        2: 'II степень — реакция на температурный и химический раздражители',
        3: 'III степень — реакция на все виды раздражителей',
    }
    fedorov_degree = fedorov_degree_map[max_score]

    # ── ЭОД ──────────────────────────────────────────────────────────────────
    eod_results = []
    for t in os_teeth:
        eod_val = t.get('eod')
        if eod_val is not None:
            eod_results.append({
                'tooth_number': t['tooth_number'],
                'eod_mka': eod_val,
                'degree': _eod_degree(float(eod_val)),
            })

    # ── КИДЧЗ (Дедова, по NRS) ────────────────────────────────────────────────
    if scale_nrs == 0:
        kidchz_degree = 'Болевая реакция отсутствует'
    elif scale_nrs <= 3:
        kidchz_degree = 'I степень чувствительности (лёгкая боль, 1–3 балла)'
    elif scale_nrs <= 6:
        kidchz_degree = 'II степень чувствительности (умеренная боль, 4–6 баллов)'
    else:
        kidchz_degree = 'III степень чувствительности (сильная боль, 7–10 баллов)'

    # ── Детали по каждому зубу ────────────────────────────────────────────────
    # Строим карту: tooth_number → данные из oid_plus_teeth (локализация + дефекты)
    oid_plus_map: dict[int, dict] = {
        t['tooth_number']: t
        for t in oid_plus_teeth
        if t.get('tooth_number') is not None
    }

    teeth_details = []
    for tooth in os_teeth:
        score = _tooth_iigz_score(tooth)
        tn = tooth['tooth_number']
        oid_info = oid_plus_map.get(tn, {})
        defect_types = oid_info.get('defect_types', [])
        defect_letters = [
            DEFECT_TYPE_CATALOG[str(c)]['letter']
            for c in defect_types
            if str(c) in DEFECT_TYPE_CATALOG
        ]
        teeth_details.append({
            'tooth_number': tn,
            'is_sensitive': tooth in sensitive_teeth,
            'iigz_score': score,
            'eod_mka': tooth.get('eod'),
            'localization': oid_info.get('localization', ''),
            'defect_types': defect_types,
            'defect_letters': defect_letters,
            'stimuli': {
                'heat': bool(tooth.get('heat')),
                'cold': bool(tooth.get('cold')),
                'air': bool(tooth.get('air')),
                'probe': bool(tooth.get('probe')),
                'osmosis': bool(tooth.get('osmosis')),
            }
        })

    # ── Дополнительные диагнозы (по OID+) ────────────────────────────────────
    secondary_diagnoses = _compute_secondary_diagnoses(oid_plus_teeth)

    return {
        # Общие данные
        'visit_date': str(card.visit_date),
        'patient_full_name': card.patient.full_name,
        'patient_code': card.patient.patient_code,
        'doctor_full_name': card.patient.doctor.get_full_name() or card.patient.doctor.email,

        # Жалобы (S)
        'complaints': complaints,
        'scale_nrs': scale_nrs,
        'dentin_exposure_causes': dentin_causes,
        'comorbidities': sa.get('sar', ''),
        'dietary_features': sa.get('san', ''),
        'psychological_features': sa.get('sam', ''),
        'professional_hazards': prof_hazards,

        # Объективные данные (O)
        'risk_factors': risk_factors,
        'no_loss_sensitivity_factors': no_loss_factors,
        'oid_plus_teeth': oid_plus_teeth,

        # Индексы
        'tooth_count': tooth_count,
        'n_examined_teeth': n_examined,
        'n_sensitive_teeth': n_sensitive,

        'irgz': {
            'value': irgz_value,
            'unit': '%',
            'interpretation': irgz_form,
            'description': 'Индекс распространённости гиперестезии зубов (Федоров–Шторина, 1988)',
            'formula': f'{n_sensitive} / {irgz_denominator} × 100',
        },
        'iigz': {
            'value': iigz_value,
            'unit': 'баллы',
            'interpretation': iigz_degree,
            'description': 'Индекс интенсивности гиперестезии зубов (Федоров–Шторина, 1988)',
        },
        'fedorov_degree': {
            'interpretation': fedorov_degree,
            'description': 'Степень гиперестезии по клиническому течению (Федоров Ю.А.)',
        },
        'eod_results': eod_results,
        'kidchz': {
            'nrs_score': scale_nrs,
            'interpretation': kidchz_degree,
            'description': 'Комплексный индекс дифференцированной чувствительности зубов (Дедова, 2004)',
        },

        # Детализация по зубам
        'teeth_details': teeth_details,

        # Дополнительные диагнозы по типам дефектов OID+
        'secondary_diagnoses': secondary_diagnoses,

        # Заключение врача
        'diagnosis_text': card.diagnosis_text,
    }



# ── Метки полей карты ─────────────────────────────────────────────────────────

SC_LABELS = {
    'sc01': 'Воздух',
    'sc02': 'Температурные факторы',
    'sc03': 'Осмотические факторы',
    'sc04': 'Тактильные/механические раздражители',
}

SAD_LABELS = {
    'sad01': 'Травма (откол, трещина)',
    'sad02': 'Повышенная стираемость',
    'sad03': 'Заболевания пародонта',
    'sad04': 'Гипоплазия эмали / дисплазия соединительной ткани',
    'sad05': 'Отсутствие цемента (генетическая предрасположенность)',
}

SAP_LABELS = {
    'sap01': 'Кислоты',
    'sap02': 'Абразивы',
    'sap03': 'Профессиональная травма',
}

OR_LABELS = {
    'orb': 'Тонкий биотип',
    'oro': 'Функциональная перегрузка',
    'orh': 'Нерациональная гигиена полости рта',
}

OID_PLUS_LABELS = {
    'oid_plus1': 'Эрозия',
    'oid_plus2': 'Клиновидный дефект',
    'oid_plus3': 'Повышенная стираемость',
    'oid_plus4': 'Гипоплазия эмали',
    'oid_plus5': 'Некроз эмали',
    'oid_plus6': 'Травматическое повреждение',
    'oid_plus7': 'Препарирован под реставрацию',
}

OID_MINUS_LABELS = {
    'oid_minus_n': 'Обнажение шейки зуба',
    'oid_minus_b': 'Отбеливание зубов',
    'oid_minus_s': 'Системная гиперестезия',
}


# ── Вспомогательные функции ───────────────────────────────────────────────────

def _checked_keys(d: dict, labels: dict) -> list[str]:
    """Возвращает список меток для отмеченных (True) ключей словаря."""
    return [labels[k] for k, v in d.items() if v and k in labels]


def _tooth_iigz_score(tooth: dict) -> int:
    """
    Оценка ИИГЗ для отдельного зуба по Федорову–Шториной:
      0 — нет реакции ни на один раздражитель
      1 — реакция только на температурный (тепло / холод)
      2 — реакция на температурный + химический (осмос / воздух)
      3 — реакция на температурный + химический + тактильный (зонд)
    """
    has_temp = bool(tooth.get('heat') or tooth.get('cold'))
    has_chem = bool(tooth.get('osmosis') or tooth.get('air'))
    has_tact = bool(tooth.get('probe'))

    if not has_temp:
        return 0
    if has_temp and has_chem and has_tact:
        return 3
    if has_temp and has_chem:
        return 2
    return 1


def _eod_degree(eod_mka: float | None) -> str | None:
    """Степень гиперестезии по ЭОД (мкА)."""
    if eod_mka is None:
        return None
    if eod_mka >= 5:
        return 'I степень (5–8 мкА)'
    if eod_mka >= 3:
        return 'II степень (3–5 мкА)'
    if eod_mka >= 1.5:
        return 'III степень (1.5–2.5 мкА)'
    return 'Ниже нормального порога (<1.5 мкА)'


# ── Главная функция ───────────────────────────────────────────────────────────

def compute_diagnosis(card) -> dict:
    """
    Вычисляет все диагностические индексы по данным карты осмотра.

    Ключевое отличие от классической формулы:
      ИРГЗ = (n_sensitive / tooth_count) × 100

    где tooth_count — фактическое число зубов пациента (поле карты),
    а не просто количество осмотренных зубов. Это корректно для пациентов
    с удалёнными зубами: если у человека 28 зубов и 7 из них чувствительны,
    ИРГЗ = 25%, а не 7/7*100 = 100% при осмотре только этих зубов.
    """
    subj = card.subjective or {}
    obj = card.objective or {}

    # tooth_count — фактическое число зубов (по умолчанию 32)
    tooth_count: int = getattr(card, 'tooth_count', 32) or 32

    # ── Субъективные данные ───────────────────────────────────────────────────
    sc = subj.get('sc', {})
    scale_nrs = subj.get('scale_nrs', 0)
    sa = subj.get('sa', {})
    sad = sa.get('sad', {})
    sap = sa.get('sap', {})

    complaints = _checked_keys(sc, SC_LABELS)
    dentin_causes = _checked_keys(sad, SAD_LABELS)
    prof_hazards = _checked_keys(sap, SAP_LABELS)

    # ── Объективные данные ────────────────────────────────────────────────────
    or_data = obj.get('or', {})
    oid_plus = obj.get('oid_plus', {})
    oid_minus = obj.get('oid_minus', {})
    os_teeth: list[dict] = obj.get('os', [])

    risk_factors = _checked_keys(or_data, OR_LABELS)
    tissue_loss_types = _checked_keys(oid_plus, OID_PLUS_LABELS)
    no_loss_factors = _checked_keys(oid_minus, OID_MINUS_LABELS)

    # ── Специальная диагностика (Os) ──────────────────────────────────────────
    sensitive_teeth = [
        t for t in os_teeth
        if any([t.get('heat'), t.get('cold'), t.get('air'),
                t.get('probe'), t.get('osmosis')])
    ]
    n_examined = len(os_teeth)      # осмотрено зубов
    n_sensitive = len(sensitive_teeth)

    # ── ИРГЗ (Федоров–Шторина) ────────────────────────────────────────────────
    irgz_denominator = max(tooth_count, n_examined)
    irgz_value = round((n_sensitive / irgz_denominator * 100), 1) if irgz_denominator > 0 else 0.0
    if irgz_value == 0:
        irgz_form = 'Гиперестезия не выявлена'
    elif irgz_value <= 25:
        irgz_form = 'Ограниченная (локализованная) форма гиперестезии'
    else:
        irgz_form = 'Генерализованная форма гиперестезии'

    # ── ИИГЗ (Федоров–Шторина) ────────────────────────────────────────────────
    tooth_scores = [_tooth_iigz_score(t) for t in sensitive_teeth]
    iigz_value = round(sum(tooth_scores) / n_sensitive, 2) if n_sensitive > 0 else 0.0
    if iigz_value == 0:
        iigz_degree = 'Гиперестезия не выявлена'
    elif iigz_value < 1.5:
        iigz_degree = 'I степень'
    elif iigz_value <= 2.2:
        iigz_degree = 'II степень'
    else:
        iigz_degree = 'III степень'

    # ── Степень по Федорову (наиболее тяжёлая среди всех зубов) ──────────────
    max_score = max(tooth_scores) if tooth_scores else 0
    fedorov_degree_map = {
        0: 'Гиперестезия не выявлена',
        1: 'I степень — реакция на температурный раздражитель',
        2: 'II степень — реакция на температурный и химический раздражители',
        3: 'III степень — реакция на все виды раздражителей',
    }
    fedorov_degree = fedorov_degree_map[max_score]

    # ── ЭОД ──────────────────────────────────────────────────────────────────
    eod_results = []
    for t in os_teeth:
        eod_val = t.get('eod')
        if eod_val is not None:
            eod_results.append({
                'tooth_number': t['tooth_number'],
                'eod_mka': eod_val,
                'degree': _eod_degree(float(eod_val)),
            })

    # ── КИДЧЗ (Дедова, по NRS) ────────────────────────────────────────────────
    if scale_nrs == 0:
        kidchz_degree = 'Болевая реакция отсутствует'
    elif scale_nrs <= 3:
        kidchz_degree = 'I степень чувствительности (лёгкая боль, 1–3 балла)'
    elif scale_nrs <= 6:
        kidchz_degree = 'II степень чувствительности (умеренная боль, 4–6 баллов)'
    else:
        kidchz_degree = 'III степень чувствительности (сильная боль, 7–10 баллов)'

    # ── Детали по каждому зубу ────────────────────────────────────────────────
    teeth_details = []
    for tooth in os_teeth:
        score = _tooth_iigz_score(tooth)
        teeth_details.append({
            'tooth_number': tooth['tooth_number'],
            'is_sensitive': tooth in sensitive_teeth,
            'iigz_score': score,
            'eod_mka': tooth.get('eod'),
            'stimuli': {
                'heat': bool(tooth.get('heat')),
                'cold': bool(tooth.get('cold')),
                'air': bool(tooth.get('air')),
                'probe': bool(tooth.get('probe')),
                'osmosis': bool(tooth.get('osmosis')),
            }
        })

    return {
        # Общие данные
        'visit_date': str(card.visit_date),
        'patient_full_name': card.patient.full_name,
        'patient_code': card.patient.patient_code,
        'doctor_full_name': card.patient.doctor.get_full_name() or card.patient.doctor.email,

        # Жалобы (S)
        'complaints': complaints,
        'scale_nrs': scale_nrs,
        'dentin_exposure_causes': dentin_causes,
        'comorbidities': sa.get('sar', ''),
        'dietary_features': sa.get('san', ''),
        'psychological_features': sa.get('sam', ''),
        'professional_hazards': prof_hazards,

        # Объективные данные (O)
        'risk_factors': risk_factors,
        'tissue_loss_types': tissue_loss_types,
        'no_loss_sensitivity_factors': no_loss_factors,
        'oid_plus_teeth': obj.get('oid_plus_teeth', []),

        # Индексы
        'tooth_count': tooth_count,
        'n_examined_teeth': n_examined,
        'n_sensitive_teeth': n_sensitive,

        'irgz': {
            'value': irgz_value,
            'unit': '%',
            'interpretation': irgz_form,
            'description': 'Индекс распространённости гиперестезии зубов (Федоров–Шторина, 1988)',
            'formula': f'{n_sensitive} / {irgz_denominator} × 100',
        },
        'iigz': {
            'value': iigz_value,
            'unit': 'баллы',
            'interpretation': iigz_degree,
            'description': 'Индекс интенсивности гиперестезии зубов (Федоров–Шторина, 1988)',
        },
        'fedorov_degree': {
            'interpretation': fedorov_degree,
            'description': 'Степень гиперестезии по клиническому течению (Федоров Ю.А.)',
        },
        'eod_results': eod_results,
        'kidchz': {
            'nrs_score': scale_nrs,
            'interpretation': kidchz_degree,
            'description': 'Комплексный индекс дифференцированной чувствительности зубов (Дедова, 2004)',
        },

        # Детализация по зубам
        'teeth_details': teeth_details,

        # Заключение врача
        'diagnosis_text': card.diagnosis_text,
    }