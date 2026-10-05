"""Convert Markdown files in capstone report materials to formatted PDF documents."""

import os
import re
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)

REPORT_DIR = Path("capstone report materials")

def clean_inline_markdown(text: str) -> str:
    """Convert common markdown inline syntax to reportlab XML syntax."""
    # Escape ampersands not part of XML entities
    text = re.sub(r"&(?!amp;|lt;|gt;|quot;|apos;)", "&amp;", text)
    # Convert bold **text** or __text__
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"__(.+?)__", r"<b>\1</b>", text)
    # Convert italics *text* or _text_
    text = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<i>\1</i>", text)
    # Convert code `code`
    text = re.sub(r"`(.+?)`", r'<font face="Courier" color="#1e293b">\1</font>', text)
    # Convert LaTeX dollar signs like $PM_{2.5}$
    text = re.sub(r"\$([^$]+)\$", r"<b>\1</b>", text)
    return text

def parse_markdown_to_flowables(md_content: str, styles):
    story = []
    lines = md_content.splitlines()
    in_code_block = False
    code_lines = []
    table_lines = []

    for line in lines:
        stripped = line.strip()

        # Handle code blocks
        if stripped.startswith("```"):
            if in_code_block:
                in_code_block = False
                code_text = "<br/>".join(
                    [
                        clean_inline_markdown(c)
                        .replace(" ", "&nbsp;")
                        .replace("<", "&lt;")
                        .replace(">", "&gt;")
                        for c in code_lines
                    ]
                )
                story.append(Paragraph(code_text, styles["CodeBlockStyle"]))
                story.append(Spacer(1, 8))
                code_lines = []
            else:
                in_code_block = True
                code_lines = []
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        # Handle table
        if stripped.startswith("|") and stripped.endswith("|"):
            table_lines.append(stripped)
            continue
        elif table_lines:
            # Process accumulated table lines
            table_data = []
            for tline in table_lines:
                # Skip markdown separator row |:---|---:|
                if re.match(r"^\|[\s\-:|]+\|$", tline):
                    continue
                cells = [c.strip() for c in tline.strip("|").split("|")]
                row_pars = [
                    Paragraph(clean_inline_markdown(c), styles["TableText"])
                    for c in cells
                ]
                table_data.append(row_pars)
            if table_data:
                col_widths = [110] * len(table_data[0]) if len(table_data[0]) > 4 else [130, 370] if len(table_data[0]) == 2 else None
                t = Table(table_data, colWidths=col_widths, hAlign="LEFT")
                t.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                            ("TOPPADDING", (0, 0), (-1, -1), 4),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
                        ]
                    )
                )
                story.append(t)
                story.append(Spacer(1, 10))
            table_lines = []

        # Horizontal rules
        if stripped in ["---", "***", "___"]:
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=10, spaceBefore=10))
            continue

        if not stripped:
            story.append(Spacer(1, 4))
            continue

        # Headings
        if stripped.startswith("# "):
            title_text = clean_inline_markdown(stripped[2:])
            story.append(Paragraph(title_text, styles["ReportTitle"]))
            story.append(Spacer(1, 6))
        elif stripped.startswith("## "):
            h2_text = clean_inline_markdown(stripped[3:])
            story.append(Paragraph(h2_text, styles["ReportH2"]))
            story.append(Spacer(1, 4))
        elif stripped.startswith("### "):
            h3_text = clean_inline_markdown(stripped[4:])
            story.append(Paragraph(h3_text, styles["ReportH3"]))
            story.append(Spacer(1, 3))
        elif stripped.startswith("- ") or stripped.startswith("* "):
            bullet_text = clean_inline_markdown(stripped[2:])
            story.append(Paragraph(f"&bull;&nbsp;&nbsp;{bullet_text}", styles["BulletText"]))
            story.append(Spacer(1, 2))
        elif re.match(r"^\d+\.\s+", stripped):
            match = re.match(r"^(\d+\.)\s+(.+)$", stripped)
            num = match.group(1)
            body = clean_inline_markdown(match.group(2))
            story.append(Paragraph(f"<b>{num}</b>&nbsp;&nbsp;{body}", styles["BulletText"]))
            story.append(Spacer(1, 2))
        else:
            p_text = clean_inline_markdown(stripped)
            story.append(Paragraph(p_text, styles["BodyTextCustom"]))
            story.append(Spacer(1, 4))

    return story

def convert_md_to_pdf(md_file: Path, pdf_file: Path):
    doc = SimpleDocTemplate(
        str(pdf_file),
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    
    base_styles = getSampleStyleSheet()
    styles = {
        "ReportTitle": ParagraphStyle(
            "ReportTitle",
            parent=base_styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0f172a"),
            alignment=0,
        ),
        "ReportH2": ParagraphStyle(
            "ReportH2",
            parent=base_styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#1e40af"),
            spaceBefore=8,
            spaceAfter=4,
        ),
        "ReportH3": ParagraphStyle(
            "ReportH3",
            parent=base_styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#334155"),
            spaceBefore=6,
            spaceAfter=2,
        ),
        "BodyTextCustom": ParagraphStyle(
            "BodyTextCustom",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor("#1e293b"),
        ),
        "BulletText": ParagraphStyle(
            "BulletText",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            leftIndent=15,
            textColor=colors.HexColor("#1e293b"),
        ),
        "TableText": ParagraphStyle(
            "TableText",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#0f172a"),
        ),
        "CodeBlockStyle": ParagraphStyle(
            "CodeBlockStyle",
            parent=base_styles["Code"],
            fontName="Courier",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#0f172a"),
            backColor=colors.HexColor("#f1f5f9"),
            borderPadding=6,
            spaceBefore=4,
            spaceAfter=4,
        ),
    }

    with open(md_file, "r", encoding="utf-8") as f:
        md_text = f.read()

    story = parse_markdown_to_flowables(md_text, styles)
    doc.build(story)
    print(f"Successfully generated: {pdf_file.name}")

def main():
    md_files = list(REPORT_DIR.glob("*.md"))
    print(f"Found {len(md_files)} markdown files in {REPORT_DIR}")
    for mf in md_files:
        pdf_out = mf.with_suffix(".pdf")
        convert_md_to_pdf(mf, pdf_out)

if __name__ == "__main__":
    main()
