"""Regenera os PDFs dos Markdown (dependência: reportlab). Execute na raiz."""
import re
from html import escape
from pathlib import Path
from urllib.parse import urljoin

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
STYLES = getSampleStyleSheet()
STYLES.add(ParagraphStyle(name='Cell', fontName='Helvetica', fontSize=8, leading=11, alignment=TA_LEFT))
STYLES['BodyText'].fontSize = 10
STYLES['BodyText'].leading = 14
STYLES['BodyText'].spaceAfter = 7
for heading in ['Heading1', 'Heading2', 'Heading3']:
    STYLES[heading].keepWithNext = True


def inline(text, source):
    text = escape(text.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-'))
    base = 'https://github.com/joaovitorregis/Mappia/blob/main/' + source.relative_to(ROOT).as_posix()
    text = re.sub(r'\[([^]]+)\]\(([^)]+)\)', lambda m: '<a color="#1755a6" href="' + escape(urljoin(base, m[2]), quote=True) + '">' + m[1] + '</a>', text)
    text = re.sub(r'`([^`]+)`', r'<font name="Courier">\1</font>', text)
    return re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#667085'))
    canvas.drawString(36, 23, 'Mappia | revisão documental 22/10/2026 | estimativas históricas')
    canvas.drawRightString(A4[0]-36, 23, str(doc.page))
    canvas.restoreState()


def generate(source):
    lines = source.read_text(encoding='utf-8').splitlines()
    story = []
    i = 0
    width = A4[0] - 72
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', c) for c in cells):
                    rows.append([Paragraph(inline(c, source), STYLES['Cell']) for c in cells])
                i += 1
            count = len(rows[0])
            ratios = {5: [.07,.23,.09,.08,.53], 4: [.08,.64,.15,.13], 3: [.19,.40,.41], 2: [.26,.74]}
            # Requirements tables have compact ID/priority/points columns.
            if count == 4 and rows[0][0].getPlainText() == 'ID':
                ratios = {4: [.08,.64,.15,.13]}
            elif count == 5 and rows[0][0].getPlainText() == 'Épico':
                ratios = {5: [.09,.52,.13,.13,.13]}
            table = Table(rows, colWidths=[width*x for x in ratios.get(count,[1/count]*count)], repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e8effa')),
                ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f7f8fa')]),
                ('GRID',(0,0),(-1,-1),.35,colors.HexColor('#d0d5dd')),
                ('VALIGN',(0,0),(-1,-1),'TOP'),
                ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
                ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
            ]))
            story.extend([table,Spacer(1,10)])
            continue
        level = len(line) - len(line.lstrip('#'))
        if level:
            story.append(Paragraph(inline(line[level:].strip(), source), STYLES['Heading'+str(min(level,3))]))
        else:
            story.append(Paragraph(inline(line, source), STYLES['BodyText']))
        i += 1
    SimpleDocTemplate(str(source.with_suffix('.pdf')), pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=40, title=source.stem, author='Equipe Mappia').build(story,onFirstPage=footer,onLaterPages=footer)
    print(source.with_suffix('.pdf').relative_to(ROOT))


if __name__ == '__main__':
    for file in ['docs/prd/PRD_Mappia.md', 'docs/product-backlog/Product_Backlog_Mappia.md']:
        generate(ROOT / file)
