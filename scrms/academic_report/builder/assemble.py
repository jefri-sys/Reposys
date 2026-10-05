import os
import zipfile
import sys

# Add builder to path
sys.path.insert(0, os.path.dirname(__file__))

from preamble import get_preamble
from frontmatter import get_frontmatter
from chapter1 import get_chapter1
from chapter2 import get_chapter2
from chapter3 import get_chapter3
from chapter4 import get_chapter4
from chapter5 import get_chapter5
from chapter6 import get_chapter6
from chapter7 import get_chapter7
from chapter8 import get_chapter8
from chapter9 import get_chapter9

def assemble_report():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    output_tex = os.path.join(base_dir, 'main.tex')
    
    sections = [
        get_preamble(),
        get_frontmatter(),
        get_chapter1(),
        get_chapter2(),
        get_chapter3(),
        get_chapter4(),
        get_chapter5(),
        get_chapter6(),
        get_chapter7(),
        get_chapter8(),
        get_chapter9()
    ]
    
    full_content = "\n".join(sections)
    
    with open(output_tex, 'w', encoding='utf-8') as f:
        f.write(full_content)
        
    print(f"Generated {output_tex}")
    print(f"Total lines: {len(full_content.splitlines())}")
    print(f"Total words: {len(full_content.split())}")
    print(f"Total characters: {len(full_content)}")
    
    # Check figures
    fig_dir = os.path.join(base_dir, 'figures')
    print("\nVerifying figures in:", fig_dir)
    if os.path.exists(fig_dir):
        for fig in os.listdir(fig_dir):
            size = os.path.getsize(os.path.join(fig_dir, fig))
            print(f"  {fig} ({size} bytes)")
            
    # Create Overleaf ZIP Package
    zip_path = os.path.join(base_dir, 'REPOSYS_Mini_Project_Report_Overleaf.zip')
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        zipf.write(output_tex, arcname='main.tex')
        if os.path.exists(fig_dir):
            for fig in os.listdir(fig_dir):
                fig_path = os.path.join(fig_dir, fig)
                zipf.write(fig_path, arcname=f"figures/{fig}")
    print(f"\nCreated Overleaf ZIP package at: {zip_path}")
    print(f"ZIP size: {os.path.getsize(zip_path)} bytes")

if __name__ == '__main__':
    assemble_report()
