/**
 * PDF di prova di una pagina con un titolo, per il seed locale e i test e2e.
 * `minBytes` aggiunge un commento di riempimento prima della fine del file
 * (per provare i limiti di dimensione con un PDF che resta valido).
 */
export function samplePdf(title: string, minBytes = 0): Buffer {
  const text = title.replace(/[^\x20-\x7e]/g, "?").replace(/[()\\]/g, "");
  const stream = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
    .join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n`;

  const end = "%%EOF\n";
  const padding = Math.max(0, minBytes - body.length - end.length);
  // il riempimento è un commento PDF dopo startxref: il file resta leggibile
  const filler =
    padding > 0 ? `%${"0".repeat(Math.max(0, padding - 2))}\n` : "";
  return Buffer.from(body + filler + end, "latin1");
}
