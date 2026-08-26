<?php
/* ══════════════════════════════════════════════════════════════════════
   PDF_SIMPLE.PHP · UN PDF DE UNA PÁGINA, SIN NINGUNA LIBRERÍA

   QUÉ HACE ESTE ARCHIVO
   Arma un PDF de una sola página (tamaño carta) escribiendo a mano el
   formato binario que entiende cualquier lector de PDF: un puñado de
   "objetos" numerados (catálogo, página, fuente, contenido) más una
   tabla de posiciones (xref) al final que dice en qué byte empieza cada
   uno. Sirve para recibos y contratos: texto simple en Helvetica, sin
   imágenes ni tablas complejas.

   POR QUÉ NO SE USÓ TCPDF, DOMPDF NI MPDF
   Este proyecto no tiene Composer ni carpeta vendor/ (es "sin build
   step" a propósito, como el resto del admin). Sumar una librería de
   PDF de verdad son miles de líneas de código ajeno para escribir cuatro
   párrafos y una tabla — con esto alcanza y de sobra, y no hay nada que
   descargar ni mantener actualizado.

   QUÉ SE LE PUEDE PEDIR
     $pdf = new PdfSimple();
     $pdf->titulo('RECIBO DE PAGO');
     $pdf->parrafo('Texto normal…');
     $pdf->parrafo('**Negrita**', true);
     $pdf->espacio(10);
     $pdf->linea();                     // raya horizontal
     $pdf->bytes()                      // el PDF completo, listo para guardar
   ══════════════════════════════════════════════════════════════════════ */

class PdfSimple {

    /** @var array<int,string> Comandos ya armados del stream de contenido. */
    private $comandos = [];

    /** Alto de la hoja carta en puntos (72 por pulgada). Ancho: 612. */
    const ALTO  = 792;
    const ANCHO = 612;

    /** Margen izquierdo/derecho, en puntos. */
    const MARGEN = 56;

    /** Dónde está el cursor de escritura ahora mismo (desde arriba). */
    private $y;

    public function __construct() {
        $this->y = self::ALTO - self::MARGEN;
    }

    /**
     * Un texto en una sola línea, con salto de línea automático simple
     * (corta por ancho de caracter aproximado, no mide de verdad cada
     * letra — para recibos y contratos cortos alcanza).
     *
     * @param string $texto
     * @param bool   $negrita
     * @param int    $tamano   Puntos de la tipografía.
     * @return void
     */
    public function parrafo($texto, $negrita = false, $tamano = 11) {
        $anchoUtil     = self::ANCHO - self::MARGEN * 2;
        // Ancho promedio de un caracter en Helvetica ~0.5 × el tamaño.
        $caracteresPorLinea = max(10, (int) ($anchoUtil / ($tamano * 0.5)));

        foreach (explode("\n", $texto) as $parrafo) {
            $lineas = $this->partirEnLineas($parrafo, $caracteresPorLinea);
            foreach ($lineas as $linea) {
                $this->escribirLinea($linea, $negrita, $tamano);
            }
        }
    }

    /** Un título grande, en negrita, con un poco de aire abajo. */
    public function titulo($texto, $tamano = 18) {
        $this->escribirLinea($texto, true, $tamano);
        $this->espacio(6);
    }

    /** Deja un espacio en blanco vertical. */
    public function espacio($puntos) {
        $this->y -= $puntos;
    }

    /** Una raya horizontal fina, de margen a margen. */
    public function linea() {
        $x1 = self::MARGEN;
        $x2 = self::ANCHO - self::MARGEN;
        $this->comandos[] = sprintf('%.2F w', 0.6);
        $this->comandos[] = sprintf('%.2F %.2F m', $x1, $this->y);
        $this->comandos[] = sprintf('%.2F %.2F l', $x2, $this->y);
        $this->comandos[] = 'S';
        $this->y -= 12;
    }

    /**
     * Dos columnas en la misma línea: una etiqueta a la izquierda y un
     * valor alineado a la derecha. Útil para "Monto: $1,000.00".
     */
    public function filaDeDatos($etiqueta, $valor, $tamano = 11) {
        $texto = $this->aLatin1($etiqueta) . ':';
        $this->comandos[] = 'BT';
        $this->comandos[] = "/F2 $tamano Tf";
        $this->comandos[] = sprintf('%.2F %.2F Td', self::MARGEN, $this->y);
        $this->comandos[] = '(' . $this->escaparPdf($texto) . ') Tj';
        $this->comandos[] = 'ET';

        $textoValor = $this->aLatin1((string) $valor);
        $anchoAprox = strlen($textoValor) * $tamano * 0.5;
        $x = self::ANCHO - self::MARGEN - $anchoAprox;
        $this->comandos[] = 'BT';
        $this->comandos[] = "/F1 $tamano Tf";
        $this->comandos[] = sprintf('%.2F %.2F Td', max(self::MARGEN + 140, $x), $this->y);
        $this->comandos[] = '(' . $this->escaparPdf($textoValor) . ') Tj';
        $this->comandos[] = 'ET';

        $this->y -= ($tamano + 6);
    }

    /**
     * @param string $texto
     * @param int    $ancho Caracteres por línea, aproximado.
     * @return array<int,string>
     */
    private function partirEnLineas($texto, $ancho) {
        $palabras = preg_split('/\s+/', trim($texto));
        $lineas   = [];
        $actual   = '';

        foreach ($palabras as $palabra) {
            $intento = $actual === '' ? $palabra : $actual . ' ' . $palabra;
            if (mb_strlen($intento) > $ancho && $actual !== '') {
                $lineas[] = $actual;
                $actual   = $palabra;
            } else {
                $actual = $intento;
            }
        }
        if ($actual !== '') $lineas[] = $actual;
        if (!$lineas) $lineas[] = '';

        return $lineas;
    }

    private function escribirLinea($texto, $negrita, $tamano) {
        $fuente = $negrita ? 'F2' : 'F1';
        $this->comandos[] = 'BT';
        $this->comandos[] = "/$fuente $tamano Tf";
        $this->comandos[] = sprintf('%.2F %.2F Td', self::MARGEN, $this->y);
        $this->comandos[] = '(' . $this->escaparPdf($this->aLatin1($texto)) . ') Tj';
        $this->comandos[] = 'ET';
        $this->y -= ($tamano * 1.35);
    }

    /**
     * El PDF solo entiende Latin-1 (o fuentes embebidas, que acá no hay).
     * El español entra entero en Latin-1 —incluye á,é,í,ó,ú,ñ,¿,¡—, así
     * que esto no pierde ningún caracter real del proyecto.
     */
    private function aLatin1($texto) {
        return @mb_convert_encoding((string) $texto, 'ISO-8859-1', 'UTF-8');
    }

    /** Escapa los tres caracteres que el formato PDF trata especial. */
    private function escaparPdf($texto) {
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $texto);
    }

    /**
     * Arma el PDF completo y lo devuelve como string binario, listo
     * para escribir a un archivo o mandar con Content-Type: application/pdf.
     *
     * @return string
     */
    public function bytes() {
        $contenido = implode("\n", $this->comandos);

        $objetos = [];
        $objetos[1] = "<< /Type /Catalog /Pages 2 0 R >>";
        $objetos[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
        $objetos[3] = "<< /Type /Page /Parent 2 0 R "
                    . "/MediaBox [0 0 " . self::ANCHO . " " . self::ALTO . "] "
                    . "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> "
                    . "/Contents 4 0 R >>";
        $objetos[4] = "<< /Length " . strlen($contenido) . " >>\nstream\n"
                    . $contenido . "\nendstream";
        $objetos[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica "
                    . "/Encoding /WinAnsiEncoding >>";
        $objetos[6] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold "
                    . "/Encoding /WinAnsiEncoding >>";

        $pdf = "%PDF-1.4\n";
        $posiciones = [0 => 0]; // el objeto 0 es especial, siempre en 0

        foreach ($objetos as $numero => $cuerpo) {
            $posiciones[$numero] = strlen($pdf);
            $pdf .= "$numero 0 obj\n$cuerpo\nendobj\n";
        }

        $inicioXref = strlen($pdf);
        $totalObjetos = count($objetos) + 1;

        $pdf .= "xref\n0 $totalObjetos\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= count($objetos); $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $posiciones[$i]);
        }

        $pdf .= "trailer\n<< /Size $totalObjetos /Root 1 0 R >>\n";
        $pdf .= "startxref\n$inicioXref\n%%EOF";

        return $pdf;
    }
}
