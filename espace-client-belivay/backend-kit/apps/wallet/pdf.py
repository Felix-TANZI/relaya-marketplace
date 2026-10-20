# backend/apps/wallet/pdf.py
# Petit générateur PDF sans dépendance (ni reportlab ni weasyprint ne sont installés chez relaya-marketplace).
# Une page A4, police Helvetica de base (une des 14 polices standard : rien à embarquer), texte seulement, encodage
# WinAnsi (cp1252 : accents français, « · », « • », « – », « € »). Assez pour une facture lisible et imprimable ;
# à remplacer par un vrai gabarit si le porteur veut le logo et la mise en page du prototype.
#
#     pdf = document([Ligne("Facture BLV-52018", taille=16, gras=True), Ligne("Total", droite="23 900 F")])
#     pdf.startswith(b"%PDF")

from dataclasses import dataclass

LARGEUR, HAUTEUR = 595, 842  # A4 en points
MARGE = 56


@dataclass(frozen=True)
class Ligne:
    texte: str = ""
    droite: str = ""  # texte aligné à droite sur la même ligne (montant)
    taille: int = 10
    gras: bool = False
    gris: bool = False
    filet: bool = False  # trait horizontal au-dessus


def _encoder(texte: str) -> bytes:
    """Texte → chaîne PDF littérale en WinAnsi ; espaces insécables en espaces ordinaires (Helvetica de base)."""
    t = texte.replace(" ", " ").replace(" ", " ").replace("−", "-")
    brut = t.encode("cp1252", errors="replace")
    return brut.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


# Largeur moyenne d'un caractère Helvetica (en millièmes de la taille) : assez pour aligner les montants à droite.
_LARGEURS = {c: 556 for c in "0123456789"}
_LARGEURS.update({" ": 278, ".": 278, ",": 278, "F": 611, "-": 333, "·": 278, "€": 556})


def _largeur(texte: str, taille: int, gras: bool) -> float:
    base = sum(_LARGEURS.get(c, 600 if gras else 556) for c in texte.replace(" ", " "))
    return base * taille / 1000


def document(lignes: list[Ligne], titre: str = "Facture BelivaY") -> bytes:
    flux = []
    y = HAUTEUR - MARGE
    for li in lignes:
        y -= li.taille + 6
        if y < MARGE:
            break  # une page : le reste ne tient pas (une facture BelivaY tient sur une page)
        if li.filet:
            flux.append(f"0.8 G 0.5 w {MARGE} {y + li.taille + 2} m {LARGEUR - MARGE} {y + li.taille + 2} l S".encode())
        police = b"/F2" if li.gras else b"/F1"
        couleur = b"0.45 g" if li.gris else b"0 g"
        if li.texte:
            flux.append(couleur + b" BT " + police + f" {li.taille} Tf {MARGE} {y} Td (".encode() + _encoder(li.texte) + b") Tj ET")
        if li.droite:
            x = LARGEUR - MARGE - _largeur(li.droite, li.taille, li.gras)
            flux.append(couleur + b" BT " + police + f" {li.taille} Tf {x:.1f} {y} Td (".encode() + _encoder(li.droite) + b") Tj ET")
    contenu = b"\n".join(flux)

    objets = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {LARGEUR} {HAUTEUR}] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>".encode(),
        f"<< /Length {len(contenu)} >>\nstream\n".encode() + contenu + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        b"<< /Title (" + _encoder(titre) + b") /Producer (BelivaY) >>",
    ]
    sortie = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    positions = []
    for i, obj in enumerate(objets, start=1):
        positions.append(len(sortie))
        sortie += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(sortie)
    sortie += f"xref\n0 {len(objets) + 1}\n0000000000 65535 f \n".encode()
    for pos in positions:
        sortie += f"{pos:010d} 00000 n \n".encode()
    sortie += f"trailer\n<< /Size {len(objets) + 1} /Root 1 0 R /Info {len(objets)} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(sortie)
