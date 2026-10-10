"""Робота з PDF підручника: текст параграфа, рендер сторінок, вирізання малюнків.

Запуск з кореня проєкту (PDF лежить там же, у git не входить):

  python course/tools/pdf.py text 109 111            -> tmp/text/s109-111.txt  (книжкові сторінки)
  python course/tools/pdf.py pages 109 111           -> tmp/pages/s109.png …   (подивитися очима)
  python course/tools/pdf.py list 110                -> xref, рамка, розмір кожного растрового малюнка
  python course/tools/pdf.py x 110 905 nazva.jpg     -> course/img/nazva.jpg із растра (без водяного знака)
  python course/tools/pdf.py clip 110 34 40 214 300 nazva.jpg
                                                    -> рендер шматка сторінки 3× (карти, схеми з векторними підписами)

У цьому PDF індекс сторінки = номер сторінки книжки. Порядок xref НЕ збігається з порядком підписів:
перед назвою файлу звір малюнок із відрендереною сторінкою.
"""
import io
import os
import sys

import fitz
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PDF = os.path.join(ROOT, "6-klas-istoriya-gisem-2023.pdf")
IMG = os.path.join(ROOT, "course", "img")
TMP = os.path.join(ROOT, "tmp")


def save(im, name):
    im = im.convert("RGB")
    im.thumbnail((1000, 1000))
    im.save(os.path.join(IMG, name), "JPEG", quality=86)
    print(name, im.size)


def strip_watermark(doc, page):
    # Водяний знак «Підручник Видавництво „Ранок“» — окремий form XObject з рамкою ≈ 470.8 × 87.
    # Підміняємо його порожнім потоком лише в пам’яті; файл PDF не змінюється.
    for xref, _name, _inv, bbox in page.get_xobjects():
        if abs(bbox[2] - 470.805) < 0.1 and abs(bbox[1] + 79.2) < 0.1:
            doc.update_stream(xref, b" ")


def main(argv):
    doc = fitz.open(PDF)
    mode = argv[1]
    if mode == "text":
        a, b = int(argv[2]), int(argv[3])
        os.makedirs(os.path.join(TMP, "text"), exist_ok=True)
        out = os.path.join(TMP, "text", f"s{a}-{b}.txt")
        with io.open(out, "w", encoding="utf-8") as f:
            for book in range(a, b + 1):
                f.write(f"\n=== стор. {book} ===\n" + doc[book].get_text())
        print(out)
    elif mode == "pages":
        a, b = int(argv[2]), int(argv[3])
        os.makedirs(os.path.join(TMP, "pages"), exist_ok=True)
        for book in range(a, b + 1):
            doc[book].get_pixmap(matrix=fitz.Matrix(1.3, 1.3)).save(os.path.join(TMP, "pages", f"s{book:03d}.png"))
        print(os.path.join(TMP, "pages"))
    elif mode == "list":
        for info in doc[int(argv[2])].get_image_info(xrefs=True):
            print(info["xref"], [round(v) for v in info["bbox"]], info["width"], info["height"])
    elif mode == "x":
        pix = fitz.Pixmap(doc, int(argv[3]))
        if pix.colorspace is None:  # трафаретна маска: чорнило там, де альфа
            im = Image.frombytes("L", (pix.width, pix.height), pix.samples)
            save(Image.eval(im, lambda v: 255 - v), argv[4])
            return
        if pix.n - pix.alpha >= 4:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        if pix.alpha:
            pix = fitz.Pixmap(pix, 0)
        save(Image.open(io.BytesIO(pix.tobytes("png"))), argv[4])
    elif mode == "clip":
        page = doc[int(argv[2])]
        strip_watermark(doc, page)
        x0, y0, x1, y1 = map(float, argv[3:7])
        pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=fitz.Rect(x0, y0, x1, y1))
        save(Image.open(io.BytesIO(pix.tobytes("png"))), argv[7])
    else:
        print(__doc__)


if __name__ == "__main__":
    main(sys.argv if len(sys.argv) > 1 else [sys.argv[0], "help"])
