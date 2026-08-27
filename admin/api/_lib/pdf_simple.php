<?php
/* ══════════════════════════════════════════════════════════════════════
   PDF_SIMPLE.PHP · UN PDF DE VARIAS PÁGINAS, SIN NINGUNA LIBRERÍA

   QUÉ HACE ESTE ARCHIVO
   Arma un PDF (tamaño carta) escribiendo a mano el formato binario que
   entiende cualquier lector de PDF: un puñado de "objetos" numerados
   (catálogo, páginas, contenido, fuente) más una tabla de posiciones
   (xref) al final que dice en qué byte empieza cada uno. Sirve para
   recibos y contratos: texto simple en Helvetica, sin imágenes ni
   tablas complejas.

   POR QUÉ NO SE USÓ TCPDF, DOMPDF NI MPDF
   Este proyecto no tiene Composer ni carpeta vendor/ (es "sin build
   step" a propósito, como el resto del admin). Sumar una librería de
   PDF de verdad son miles de líneas de código ajeno para escribir un
   puñado de párrafos y una tabla — con esto alcanza y de sobra, y no
   hay nada que descargar ni mantener actualizado.

   POR QUÉ HAY MÁS DE UNA PÁGINA
   Un recibo entra siempre en una hoja. Un contrato con comparecencia,
   declaraciones y ocho o diez cláusulas casi nunca —y el formato PDF NO
   avisa si el texto se pasó de la hoja: simplemente lo recorta y
   desaparece en silencio. Por eso cada método que escribe algo primero
   se fija si queda lugar, y si no, cierra la página actual y abre una
   nueva antes de seguir. Nunca hay que pensarlo desde afuera.

   QUÉ SE LE PUEDE PEDIR
     $pdf = new PdfSimple();
     $pdf->titulo('CONTRATO DE PRESTACIÓN DE SERVICIOS');
     $pdf->parrafo('Texto normal, tan largo como haga falta…');
     $pdf->parrafo('PRIMERA. OBJETO', true);
     $pdf->espacio(10);
     $pdf->linea();                     // raya horizontal
     $pdf->filaDeDatos('Monto', '$1,000.00');
     $pdf->bytes()                      // el PDF completo, listo para guardar
   ══════════════════════════════════════════════════════════════════════ */

class PdfSimple {

    /** Alto y ancho de la hoja carta en puntos (72 por pulgada). */
    const ALTO  = 792;
    const ANCHO = 612;

    /** Margen a los cuatro lados, en puntos. */
    const MARGEN = 56;

    /** @var array<int,array<int,string>> Una lista de comandos por página. */
    private $paginas = [];

    /** @var array<int,string> Comandos de la página que se está armando. */
    private $comandosDeLaPagina = [];

    /** Dónde está el cursor de escritura ahora mismo (desde arriba). */
    private $y;

    public function __construct() {
        $this->y = self::ALTO - self::MARGEN;
    }

    /**
     * Un texto con salto de línea automático simple (corta por ancho de
     * caracter aproximado, no mide de verdad cada letra — para recibos y
     * contratos alcanza de sobra).
     *
     * @param string $texto
     * @param bool   $negrita
     * @param int    $tamano   Puntos de la tipografía.
     * @return void
     */
    public function parrafo($texto, $negrita = false, $tamano = 11) {
        $anchoUtil = self::ANCHO - self::MARGEN * 2;
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

    /** Deja un espacio en blanco vertical (nunca deja una página a medias). */
    public function espacio($puntos) {
        $this->asegurarLugar($puntos);
        $this->y -= $puntos;
    }

    /** Una raya horizontal fina, de margen a margen. */
    public function linea() {
        $this->asegurarLugar(18);
        $x1 = self::MARGEN;
        $x2 = self::ANCHO - self::MARGEN;
        $this->comandosDeLaPagina[] = sprintf('%.2F w', 0.6);
        $this->comandosDeLaPagina[] = sprintf('%.2F %.2F m', $x1, $this->y);
        $this->comandosDeLaPagina[] = sprintf('%.2F %.2F l', $x2, $this->y);
        $this->comandosDeLaPagina[] = 'S';
        $this->y -= 12;
    }

    /**
     * Dos columnas en la misma línea: una etiqueta a la izquierda y un
     * valor alineado a la derecha. Útil para "Monto: $1,000.00".
     */
    public function filaDeDatos($etiqueta, $valor, $tamano = 11) {
        $this->asegurarLugar($tamano + 6);

        $texto = $this->aLatin1($etiqueta) . ':';
        $this->comandosDeLaPagina[] = 'BT';
        $this->comandosDeLaPagina[] = "/F2 $tamano Tf";
        $this->comandosDeLaPagina[] = sprintf('%.2F %.2F Td', self::MARGEN, $this->y);
        $this->comandosDeLaPagina[] = '(' . $this->escaparPdf($texto) . ') Tj';
        $this->comandosDeLaPagina[] = 'ET';

        $textoValor = $this->aLatin1((string) $valor);
        $anchoAprox = strlen($textoValor) * $tamano * 0.5;
        $x = self::ANCHO - self::MARGEN - $anchoAprox;
        $this->comandosDeLaPagina[] = 'BT';
        $this->comandosDeLaPagina[] = "/F1 $tamano Tf";
        $this->comandosDeLaPagina[] = sprintf('%.2F %.2F Td', max(self::MARGEN + 140, $x), $this->y);
        $this->comandosDeLaPagina[] = '(' . $this->escaparPdf($textoValor) . ') Tj';
        $this->comandosDeLaPagina[] = 'ET';

        $this->y -= ($tamano + 6);
    }

    /**
     * Fuerza el salto a una página nueva aunque todavía quede lugar en
     * ésta. Sirve, por ejemplo, para que las firmas empiecen siempre en
     * hoja propia y nunca queden partidas por la mitad.
     *
     * @return void
     */
    public function nuevaPagina() {
        $this->paginas[] = $this->comandosDeLaPagina;
        $this->comandosDeLaPagina = [];
        $this->y = self::ALTO - self::MARGEN;
    }

    /**
     * Si lo que sigue no entra en lo que queda de página, cierra ésta y
     * abre una nueva ANTES de escribir nada — así ninguna línea queda
     * cortada a la mitad entre una hoja y la siguiente.
     *
     * @param float $alturaQueHaceFalta
     * @return void
     */
    private function asegurarLugar($alturaQueHaceFalta) {
        if ($this->y - $alturaQueHaceFalta < self::MARGEN) {
            $this->nuevaPagina();
        }
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
        $this->asegurarLugar($tamano * 1.35);

        $fuente = $negrita ? 'F2' : 'F1';
        $this->comandosDeLaPagina[] = 'BT';
        $this->comandosDeLaPagina[] = "/$fuente $tamano Tf";
        $this->comandosDeLaPagina[] = sprintf('%.2F %.2F Td', self::MARGEN, $this->y);
        $this->comandosDeLaPagina[] = '(' . $this->escaparPdf($this->aLatin1($texto)) . ') Tj';
        $this->comandosDeLaPagina[] = 'ET';
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
     * Arma el PDF completo (todas las páginas) y lo devuelve como string
     * binario, listo para escribir a un archivo o mandar con
     * Content-Type: application/pdf.
     *
     * @return string
     */
    public function bytes() {
        // La página que quedó abierta también cuenta, aunque no se haya
        // llamado a nuevaPagina() a propósito.
        $todasLasPaginas = $this->paginas;
        $todasLasPaginas[] = $this->comandosDeLaPagina;

        $objetos = [];

        // Objeto 1: catálogo. Objeto 2: el árbol de páginas (se completa
        // al final, cuando ya se sabe cuántas hay). El resto se numera
        // dinámicamente: cada página ocupa dos objetos (la página en sí
        // y su contenido), y las dos fuentes van al final de todo.
        $siguienteId  = 3;
        $idsDePagina  = [];
        $numeroFontes = null;

        foreach ($todasLasPaginas as $comandos) {
            $idPagina    = $siguienteId++;
            $idContenido = $siguienteId++;
            $idsDePagina[] = $idPagina;

            $contenido = implode("\n", $comandos);
            $objetos[$idContenido] = "<< /Length " . strlen($contenido) . " >>\nstream\n"
                                    . $contenido . "\nendstream";
        }

        $idFuenteNormal  = $siguienteId++;
        $idFuenteNegrita = $siguienteId++;

        $objetos[$idFuenteNormal]  = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica "
                                   . "/Encoding /WinAnsiEncoding >>";
        $objetos[$idFuenteNegrita] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold "
                                   . "/Encoding /WinAnsiEncoding >>";

        // Ahora sí, con los ids de contenido ya reservados, arma cada página
        // (su id ya se calculó arriba: es idPagina, dos menos que idContenido).
        foreach ($idsDePagina as $indice => $idPagina) {
            $idContenido = $idPagina + 1;
            $objetos[$idPagina] = "<< /Type /Page /Parent 2 0 R "
                                . "/MediaBox [0 0 " . self::ANCHO . " " . self::ALTO . "] "
                                . "/Resources << /Font << /F1 $idFuenteNormal 0 R "
                                . "/F2 $idFuenteNegrita 0 R >> >> "
                                . "/Contents $idContenido 0 R >>";
        }

        $listaDeKids = implode(' ', array_map(function ($id) { return "$id 0 R"; }, $idsDePagina));
        $objetos[1] = "<< /Type /Catalog /Pages 2 0 R >>";
        $objetos[2] = "<< /Type /Pages /Kids [$listaDeKids] /Count " . count($idsDePagina) . " >>";

        ksort($objetos);

        $pdf = "%PDF-1.4\n";
        $posiciones = [0 => 0]; // el objeto 0 es especial, siempre en 0

        foreach ($objetos as $numero => $cuerpo) {
            $posiciones[$numero] = strlen($pdf);
            $pdf .= "$numero 0 obj\n$cuerpo\nendobj\n";
        }

        $inicioXref   = strlen($pdf);
        $totalObjetos = count($objetos) + 1;
        $maximoId     = max(array_keys($objetos));

        $pdf .= "xref\n0 $totalObjetos\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= $maximoId; $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $posiciones[$i] ?? 0);
        }

        $pdf .= "trailer\n<< /Size $totalObjetos /Root 1 0 R >>\n";
        $pdf .= "startxref\n$inicioXref\n%%EOF";

        return $pdf;
    }
}
