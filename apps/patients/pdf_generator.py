"""
Генератор PDF-отчёта с диагнозом пациента.
Использует reportlab + DejaVu (кириллица).
"""
import io
from datetime import datetime
import pathlib

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
)

# ── Регистрация шрифтов с поддержкой кириллицы ───────────────────────────────
BASE_DIR = pathlib.Path(__file__).parent.parent.parent
# Формируем полные пути к файлам шрифтов
FONT_REGULAR = str(BASE_DIR / 'fonts' / 'DejaVuSans.ttf')
FONT_BOLD = str(BASE_DIR / 'fonts' / 'DejaVuSans-Bold.ttf')

try:
    pdfmetrics.registerFont(TTFont('DejaVu', FONT_REGULAR, 'UTF-8'))
    pdfmetrics.registerFont(TTFont('DejaVu-Bold', FONT_BOLD, 'UTF-8'))
    FONT = 'DejaVu'
    FONT_B = 'DejaVu-Bold'
except Exception:
    FONT = 'Helvetica'
    FONT_B = 'Helvetica-Bold'

# ── Цвета ─────────────────────────────────────────────────────────────────────
COLOR_PRIMARY = colors.HexColor("#2980b9")     # тёмно-синий (заголовки)
COLOR_ACCENT = colors.HexColor('#2980b9')      # синий (секции)
COLOR_LIGHT = colors.HexColor('#d6eaf8')       # светло-голубой (фон таблицы)
COLOR_RED = colors.HexColor('#c0392b')         # красный (важные значения)
COLOR_GREEN = colors.HexColor('#1e8449')       # зелёный (норма)
COLOR_GRAY = colors.HexColor('#ecf0f1')        # светло-серый (зебра)
COLOR_DARK_GRAY = colors.HexColor('#7f8c8d')   # тёмно-серый (подписи)


def _styles():
    """Набор стилей параграфов."""
    base = getSampleStyleSheet()
    def s(name, **kw):
        return ParagraphStyle(name, fontName=kw.pop('bold', False) and FONT_B or FONT, **kw)

    return {
        'title': ParagraphStyle(
            'DocTitle', fontName=FONT_B, fontSize=16,
            textColor=COLOR_PRIMARY, spaceAfter=4, leading=20,
        ),
        'subtitle': ParagraphStyle(
            'DocSubtitle', fontName=FONT, fontSize=10,
            textColor=COLOR_DARK_GRAY, spaceAfter=2,
        ),
        'section': ParagraphStyle(
            'Section', fontName=FONT_B, fontSize=12,
            textColor=COLOR_ACCENT, spaceBefore=14, spaceAfter=4,
        ),
        'body': ParagraphStyle(
            'Body', fontName=FONT, fontSize=9, leading=13, spaceAfter=3,
        ),
        'body_bold': ParagraphStyle(
            'BodyBold', fontName=FONT_B, fontSize=9, leading=13, spaceAfter=3,
        ),
        'label': ParagraphStyle(
            'Label', fontName=FONT_B, fontSize=8,
            textColor=COLOR_DARK_GRAY, spaceAfter=1,
        ),
        'index_value': ParagraphStyle(
            'IndexVal', fontName=FONT_B, fontSize=22,
            textColor=COLOR_PRIMARY, spaceAfter=0, leading=24,
        ),
        'index_label': ParagraphStyle(
            'IndexLbl', fontName=FONT, fontSize=7,
            textColor=COLOR_DARK_GRAY, leading=10,
        ),
        'footer': ParagraphStyle(
            'Footer', fontName=FONT, fontSize=7,
            textColor=COLOR_DARK_GRAY, alignment=1,
        ),
    }


def _bool_mark(val: bool) -> str:
    return '✓' if val else '—'


def _list_or_none(lst: list, empty: str = 'Не выявлено') -> str:
    return '; '.join(lst) if lst else empty


def _table_style(header_color=COLOR_PRIMARY) -> TableStyle:
    return TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), header_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), FONT_B),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), FONT),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_GRAY]),
        ('GRID', (0, 0), (-1, -1), 0.3, COLOR_DARK_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ])


# ── Секции отчёта ─────────────────────────────────────────────────────────────

def _build_header(st, diag: dict) -> list:
    """Шапка документа."""
    story = []
    story.append(Paragraph('Карта обследования пациента', st['title']))
    story.append(Paragraph(
        f'Гиперестезия дентина зубов — диагностическое заключение', st['subtitle']
    ))
    story.append(HRFlowable(width='100%', thickness=1.5, color=COLOR_PRIMARY, spaceAfter=8))

    # Таблица с реквизитами
    data = [
        ['Пациент', diag.get('patient_full_name', ''), 'Код', diag.get('patient_code', '')],
        ['Врач', diag.get('doctor_full_name', ''), 'Дата визита', diag.get('visit_date', '')],
        ['Дата отчёта', datetime.now().strftime('%d.%m.%Y'), '', ''],
    ]
    col_widths = [3*cm, 6.5*cm, 3*cm, 4.5*cm]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), COLOR_LIGHT),
        ('BACKGROUND', (2, 0), (2, -1), COLOR_LIGHT),
        ('FONTNAME', (0, 0), (0, -1), FONT_B),
        ('FONTNAME', (2, 0), (2, -1), FONT_B),
        ('FONTNAME', (1, 0), (1, -1), FONT),
        ('FONTNAME', (3, 0), (3, -1), FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.3, COLOR_DARK_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    return story


def _build_indices(st, diag: dict) -> list:
    """Блок с вычисленными индексами."""
    story = [Paragraph('Диагностические индексы', st['section'])]

    irgz = diag.get('irgz', {})
    iigz = diag.get('iigz', {})
    kidchz = diag.get('kidchz', {})
    fedorov = diag.get('fedorov_degree', {})

    # Блок из 4 карточек индексов
    def card(title, value, unit, interp, desc):
        return [
            Paragraph(title, st['label']),
            Paragraph(f"{value} {unit}", st['index_value']),
            Paragraph(interp, st['body_bold']),
            Paragraph(desc, st['index_label']),
        ]

    col_w = [4.2*cm, 4.2*cm, 4.2*cm, 4.2*cm]

    row1 = [
        card('ИРГЗ (%)', irgz.get('value', 0), '%',
             irgz.get('interpretation', ''), irgz.get('description', '')),
        card('ИИГЗ (баллы)', iigz.get('value', 0), 'б.',
             iigz.get('interpretation', ''), iigz.get('description', '')),
        card('NRS (КИДЧЗ)', kidchz.get('nrs_score', 0), '/10',
             kidchz.get('interpretation', ''), kidchz.get('description', '')),
        card('Степень по Федорову', '', '',
             fedorov.get('interpretation', ''), fedorov.get('description', '')),
    ]

    # Каждый "card" — список параграфов, оборачиваем в ячейки таблицы
    t = Table([[col] for col in row1[0:1]], colWidths=[4.2*cm])  # placeholder
    # Строим плоскую таблицу 1×4
    cells = [
        '\n'.join([c.text for c in col]) for col in row1
    ]

    # Используем вложенные таблицы
    inner_tables = []
    for i, col in enumerate(row1):
        inner_t = Table([[p] for p in col], colWidths=[4*cm])
        inner_t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), FONT),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        inner_tables.append(inner_t)

    outer = Table([inner_tables], colWidths=col_w)
    outer.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_ACCENT),
        ('INNERGRID', (0, 0), (-1, -1), 0.3, COLOR_DARK_GRAY),
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(outer)
    return story


def _build_subjective(st, diag: dict) -> list:
    """Секция субъективных данных."""
    story = [Paragraph('Субъективные данные (S)', st['section'])]

    rows = [
        ['Параметр', 'Значение'],
        ['Жалобы (Sc)', _list_or_none(diag.get('complaints', []))],
        ['Уровень боли NRS (0–10)', str(diag.get('scale_nrs', 0))],
        ['Причины обнажения дентина (Sad)', _list_or_none(diag.get('dentin_exposure_causes', []))],
        ['Сопутствующая патология (Sar)', diag.get('comorbidities', '') or 'Нет'],
        ['Особенности питания (San)', diag.get('dietary_features', '') or 'Нет'],
        ['Психологические особенности (Sam)', diag.get('psychological_features', '') or 'Нет'],
        ['Профессиональные вредности (Sap)', _list_or_none(diag.get('professional_hazards', []))],
    ]

    # Оборачиваем значения в Paragraph для переноса
    table_data = [[Paragraph(str(c), st['body']) for c in row] for row in rows]
    t = Table(table_data, colWidths=[6*cm, 11*cm], repeatRows=1)
    t.setStyle(_table_style(COLOR_ACCENT))
    story.append(t)
    return story


def _build_objective(st, diag: dict) -> list:
    """Секция объективных данных."""
    story = [Paragraph('Объективные данные (O)', st['section'])]

    rows = [
        ['Параметр', 'Значение'],
        ['Факторы риска (Or)', _list_or_none(diag.get('risk_factors', []))],
        ['Виды убыли тканей (Oid+)', _list_or_none(diag.get('tissue_loss_types', []))],
        ['Факторы без убыли (Oid−)', _list_or_none(diag.get('no_loss_sensitivity_factors', []))],
    ]

    oid_teeth = diag.get('oid_plus_teeth', [])
    if oid_teeth:
        teeth_str = '; '.join(
            f"зуб {t['tooth_number']} ({t.get('localization', '')})" for t in oid_teeth
        )
        rows.append(['Зубы с дефектами (Oic+)', teeth_str])

    table_data = [[Paragraph(str(c), st['body']) for c in row] for row in rows]
    t = Table(table_data, colWidths=[6*cm, 11*cm], repeatRows=1)
    t.setStyle(_table_style(COLOR_ACCENT))
    story.append(t)
    return story


def _build_teeth_table(st, diag: dict) -> list:
    """Таблица специальной диагностики по зубам (Os)."""
    story = [Paragraph('Специальная диагностика (Os) — данные по зубам', st['section'])]

    teeth = diag.get('teeth_details', [])
    if not teeth:
        story.append(Paragraph('Данные специальной диагностики не введены.', st['body']))
        return story

    header = ['Зуб', 'Тепло', 'Холод', 'Воздух', 'Зонд', 'Осмос', 'ЭОД (мкА)', 'ИИГЗ', 'Чув-ть']
    rows = [header]
    for t in teeth:
        stim = t.get('stimuli', {})
        rows.append([
            str(t['tooth_number']),
            _bool_mark(stim.get('heat')),
            _bool_mark(stim.get('cold')),
            _bool_mark(stim.get('air')),
            _bool_mark(stim.get('probe')),
            _bool_mark(stim.get('osmosis')),
            str(t['eod_mka']) if t.get('eod_mka') is not None else '—',
            str(t.get('iigz_score', 0)),
            '+ ' if t.get('is_sensitive') else '—',
        ])

    col_w = [1.5*cm, 1.3*cm, 1.3*cm, 1.3*cm, 1.3*cm, 1.3*cm, 2.5*cm, 1.5*cm, 1.5*cm]
    table_data = [[Paragraph(str(c), st['body']) for c in row] for row in rows]
    t = Table(table_data, colWidths=col_w, repeatRows=1)
    ts = _table_style(COLOR_PRIMARY)
    # Выделяем чувствительные зубы
    for i, tooth in enumerate(teeth, start=1):
        if tooth.get('is_sensitive'):
            ts.add('BACKGROUND', (0, i), (-1, i), colors.HexColor('#fef9e7'))
    t.setStyle(ts)
    story.append(t)
    story.append(Paragraph(
        '* Жёлтым выделены зубы с выявленной повышенной чувствительностью.',
        st['label']
    ))
    return story


def _build_conclusion(st, diag: dict) -> list:
    """Блок заключения врача."""
    story = [
        Spacer(1, 0.3*cm),
        HRFlowable(width='100%', thickness=0.5, color=COLOR_DARK_GRAY, spaceAfter=6),
        Paragraph('Заключение врача', st['section']),
    ]
    text = diag.get('diagnosis_text', '').strip()
    if text:
        story.append(Paragraph(text, st['body']))
    else:
        story.append(Paragraph(
            '(Заключение не заполнено)', st['body']
        ))

    # Подпись
    story.append(Spacer(1, 1.5*cm))
    sig_data = [
        [Paragraph('Врач:', st['body_bold']),
         Paragraph('____________________________', st['body']),
         Paragraph('Дата:', st['body_bold']),
         Paragraph(datetime.now().strftime('%d.%m.%Y'), st['body'])],
    ]
    sig_t = Table(sig_data, colWidths=[2*cm, 7*cm, 2*cm, 6*cm])
    sig_t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(sig_t)
    return story


# ── Публичная функция ─────────────────────────────────────────────────────────

def generate_diagnosis_pdf(diag: dict) -> bytes:
    """
    Принимает словарь диагноза (из compute_diagnosis) и возвращает PDF как bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.8*cm, rightMargin=1.8*cm,
        topMargin=1.5*cm, bottomMargin=1.5*cm,
        title='Диагностическое заключение',
        author=diag.get('doctor_full_name', ''),
    )

    st = _styles()
    story = []

    story += _build_header(st, diag)
    story.append(Spacer(1, 0.4*cm))
    story += _build_indices(st, diag)
    story.append(Spacer(1, 0.3*cm))
    story += _build_subjective(st, diag)
    story.append(Spacer(1, 0.3*cm))
    story += _build_objective(st, diag)
    story.append(Spacer(1, 0.3*cm))
    story += _build_teeth_table(st, diag)
    story += _build_conclusion(st, diag)

    # Колонтитул
    def on_page(canvas, doc_ref):
        canvas.saveState()
        canvas.setFont(FONT, 7)
        canvas.setFillColor(COLOR_DARK_GRAY)
        canvas.drawCentredString(
            A4[0] / 2, 1*cm,
            f'Стоматологическая система диагностики гиперестезии — стр. {doc_ref.page}'
        )
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buffer.getvalue()
