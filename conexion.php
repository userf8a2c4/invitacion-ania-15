<?php
// Configuración de la base de datos de Hostinger
$host     = "localhost"; 
$db_name  = "u104000410_invitadosxv"; // Tu base de datos exacta de la captura
$username = "u164808416_lucila"; // Reemplaza con tu usuario de MySQL de Hostinger
$password = "Blucila699";    // Inscribe la contraseña que le asignaste en Hostinger

try {
    // Conexión segura usando PDO con codificación UTF-8 para admitir tildes y eñes
    $conexion = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // Si hay un error, detiene la carga por seguridad
    die("Error de conexión a la base de datos: " . $e->getMessage());
}
?>
