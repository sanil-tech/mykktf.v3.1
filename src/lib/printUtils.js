/**
 * Unified Print Utility for MyKKTF Official A4 Document Templates
 * Ensures the screen application shell (#root) is completely unmounted from print media,
 * preventing screenshot-like prints and rendering authentic A4 institutional documents.
 */

export function printDocument() {
  document.body.classList.add('printing-document');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-document');
  }, 1000);
}

/**
 * Creates and prints an isolated official HTML document in a dedicated print stream.
 * Useful for posters, passes, and letterheads where maximum styling control is required.
 */
export function printIsolatedDocument({ title, bodyHtml, styleExtra = '' }) {
  const printWin = window.open('', '_blank', 'width=950,height=1150');
  if (!printWin) {
    // Fallback if popup blocked by browser
    printDocument();
    return;
  }

  printWin.document.write(`<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="UTF-8">
  <title>${title || 'Dokumen Rasmi KKTF UMS'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background: #ffffff;
      color: #0f172a;
      padding: 20px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      body {
        padding: 0;
      }
    }
    ${styleExtra}
  </style>
</head>
<body>
  ${bodyHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`);
  printWin.document.close();
}
