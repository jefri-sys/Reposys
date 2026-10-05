import os
import sys
import base64
import subprocess
import json

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
fig_dir = os.path.join(base_dir, 'figures')

def get_base64_image(filename):
    path = os.path.join(fig_dir, filename)
    if os.path.exists(path):
        ext = os.path.splitext(filename)[1].lower().replace('.', '')
        if ext == 'jpg': ext = 'jpeg'
        with open(path, 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('utf-8')
        return f"data:image/{ext};base64,{b64}"
    return ""

print("Image helper initialized.")
