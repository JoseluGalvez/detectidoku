# Especificación derivada de Murdokeando.md

## Flujo obligatorio

La generación debe comenzar con una entrevista que capture número de jugadores, rango de edad, dificultad (Muy fácil, Fácil, Medio, Difícil, Experto), temática, tono, número de sospechosos, localizaciones, objetos o evidencias, giros, nombres personalizados, formato de salida, ayudas y límite de tiempo. Antes de generar, el sistema debe detectar inconsistencias, ajustar parámetros con una explicación breve y pedir confirmación de la configuración final.

## Contrato de salida

Cada caso debe incluir título, introducción narrativa de 150–300 palabras con contexto, suceso y objetivo, elementos del caso, cuadrícula Markdown marcable con Sí/No/Descartado, entre 10 y 40 pistas según la dificultad, nivel justificado, solución final y resolución paso a paso. La solución solo aparece en su apartado correspondiente.

## Reglas espaciales obligatorias

Cada personaje ocupa una casilla única; no se repiten filas ni columnas. “Al lado de” significa adyacencia ortogonal de Von Neumann y además misma habitación, nunca a través de un muro. Norte, Sur, Este y Oeste son absolutos respecto a los bordes del tablero. “Enfrente de” una puerta o ventana se modela como adyacencia ortogonal al vano. El forajido es un rol de indirección que puede aparecer en restricciones de compañía. La víctima y el asesino comparten habitación, y ningún tercer sospechoso puede estar en ella; una persona sola en una habitación no puede ser el asesino.

## Arquitectura obligatoria

La generación debe ser neuro-simbólica y por capas. Primero se diseña el tablero y la asignación ideal; luego se extraen restricciones formales; después un solver externo comprueba existencia y unicidad; solo entonces se redactan las pistas y la narrativa. El LLM no debe resolver ni escribir una solución hardcodeada: debe formalizar o narrar, mientras que el motor determinista calcula. Si la validación falla, el sistema debe devolver errores al generador para reconstruir o rechazar el caso.

## Calibración

Muy fácil/Fácil debe usar tableros acotados y pistas directas. Medio debe introducir exclusiones cardinales y recuentos de habitación. Difícil/Experto puede usar cadenas indirectas, condiciones, roles especiales y reducción al absurdo; los tableros pueden crecer hasta 16×16. La dificultad se mide por profundidad de inferencia y no solo por número de casillas.

## Control de calidad

Antes de entregar, hay que comprobar coherencia narrativa, consistencia lógica, ausencia de contradicciones, solución única, correspondencia entre pistas y solución y dificultad acorde. Si una comprobación falla, no se entrega el caso: se reconstruye o se rechaza. Nunca se permiten soluciones múltiples, pistas contradictorias, revelación prematura, azar como sustituto de deducción ni nombres incoherentes con la temática.

## Riesgo de razonamiento espurio

El modelo no puede recibir una instrucción que lo incentive a adivinar la solución y luego imprimirla estáticamente. La salida debe contener restricciones declarativas, identificadores de pistas y narrativa separada; el solver es la única autoridad para calcular y certificar la solución.

## Referencia

Archivo aportado por el usuario: `/home/ubuntu/upload/Murdokeando.md`.
