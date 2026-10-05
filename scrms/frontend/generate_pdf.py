import markdown
import codecs
from weasyprint import HTML, CSS

# Read markdown
with codecs.open('RAS_Description_Formatted.md', 'r', 'utf-8') as f:
    text = f.read()

# Convert to HTML with extensions for tables
html = markdown.markdown(text, extensions=['tables'])

# Add some professional CSS styling
css = CSS(string='''
    @page {
        size: A4;
        margin: 2.5cm;
    }
    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
    }
    h1 {
        color: #1a365d;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 0.5em;
    }
    h2 {
        color: #2d3748;
        margin-top: 1.5em;
    }
    h3 {
        color: #4a5568;
        margin-top: 1.2em;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 1.5em;
        page-break-inside: avoid;
    }
    th, td {
        border: 1px solid #cbd5e0;
        padding: 8px 12px;
        text-align: left;
    }
    th {
        background-color: #f7fafc;
        font-weight: 600;
        color: #2d3748;
    }
    tr:nth-child(even) {
        background-color: #fcfcfc;
    }
    strong {
        color: #2d3748;
    }
    p {
        margin-bottom: 1em;
    }
''')

# Combine html with body wrapper
full_html = f'''
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
{html}
</body>
</html>
'''

# Write HTML for reference
with codecs.open('RAS_Description.html', 'w', 'utf-8') as f:
    f.write(full_html)

# Generate PDF
HTML(string=full_html).write_pdf('RAS_Description.pdf', stylesheets=[css])
print("PDF generation complete!")
