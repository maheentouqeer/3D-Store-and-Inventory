import fitz
from pathlib import Path
src = Path('attached_assets/3D_Interactive_Store_Build_Blueprint_1792863561247.pdf')
out = Path('.agents/outputs/store_blueprint')
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(src)
print(f'pages={doc.page_count}')
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3), alpha=False)
    dest = out / f'page-{i+1:02}.png'
    pix.save(dest)
    print(dest)
