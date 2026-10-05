// Extrait le texte d'un PDF, page par page (macOS, PDFKit).
// Usage : swift logique-metier/outils/pdftexte.swift entree.pdf sortie.txt
import PDFKit

let args = CommandLine.arguments
guard args.count == 3, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
    print("Usage : swift pdftexte.swift entree.pdf sortie.txt")
    exit(1)
}
var out = ""
for i in 0..<doc.pageCount {
    out += "\n=====PAGE \(i + 1)\n" + (doc.page(at: i)?.string ?? "")
}
try! out.write(toFile: args[2], atomically: true, encoding: .utf8)
print(doc.pageCount)
