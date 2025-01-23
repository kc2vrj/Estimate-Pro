import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <style>{`
          @media print {
            @page {
              margin: 0;
              size: letter;
            }
            body {
              margin: 0.5in !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            /* Hide browser headers and footers */
            @page :first {
              margin-top: 0;
            }
            @page :left {
              margin-left: 0;
            }
            @page :right {
              margin-right: 0;
            }
          }
        `}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
