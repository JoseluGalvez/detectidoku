# Análisis competitivo de Murdoku Generator

## Resumen ejecutivo

Murdoku Generator ocupa una posición poco cubierta: no es únicamente un juego de misterio, ni un editor genérico de puzzles, ni un generador narrativo. Su oportunidad está en convertirse en el **estudio especializado para crear, verificar, editar, jugar y publicar Murdokus temáticos**. Los referentes actuales muestran cuatro estándares que debemos igualar: la disponibilidad online e imprimible de Murdoku, el hábito diario y la presentación de Murdle, la validación algorítmica de Summer Engine y la rapidez de personalización/exportación de PuzzleForge. Nuestra ventaja potencial es unirlos con una capa neuro-simbólica específica de mapas, habitaciones, adyacencia, víctima, asesino y pistas literarias.

## Referentes analizados

| Referente | Fortaleza principal | Debilidad frente a nuestra oportunidad | Qué debemos aprender |
|---|---|---|---|
| [Murdoku oficial][1] | Producto de género claro, casos online gratuitos, puzzles imprimibles, libros y comunidad. | Está centrado en jugar casos publicados; no se presenta como un estudio abierto para crear variaciones narrativas. | Ofrecer siempre dos salidas: tablero jugable y PDF imprimible; cuidar la identidad de género y la comunidad. |
| [Murdle][2] | Hábito diario, tutorial, pistas, exploración, eventos, libros y marca narrativa reconocible. | Es un producto de consumo y misterio deductivo, no un editor espacial de Murdokus personalizados. | Crear retos diarios, onboarding breve, colección, logros y una voz narrativa reconocible. |
| [Summer Engine][3] | Genera distintos tipos de puzzles con reglas y validator propios; declara aceptar solo tableros con una solución y graduar la dificultad por técnicas de razonamiento. | Es generalista: la narrativa criminal, las habitaciones y la semántica Murdoku no son su centro. | Separar generador y solver, medir técnicas de resolución y permitir semillas reproducibles. |
| [TeachQuill][4] | Flujo guiado, diferenciación por edad/dificultad, ejemplos y answer keys para educación. | Está optimizado para actividades de aula, no para una experiencia premium de autoría narrativa y publicación. | Añadir perfiles infantil, aula, evento y familiar; incluir guía docente y explicación de aprendizaje. |
| [PuzzleForge][5] | Rapidez, varios tipos de puzzles, plantillas, personalización, PDF/PNG y enlaces compartibles. | La amplitud reduce la especialización; no ofrece la profundidad lógica y narrativa propia del Murdoku. | Reducir fricción: plantillas, duplicación, compartir y exportar en un flujo de pocos pasos. |

## Comparación de capacidades

| Capacidad | Murdoku Generator actual | Murdoku oficial | Murdle | Summer Engine | TeachQuill | PuzzleForge |
|---|---:|---:|---:|---:|---:|---:|
| Crear variaciones narrativas | **Sí, enfoque central** | No visible | No visible | Parcial/generalista | Sí, educativo | Sí, generalista |
| Editor espacial Murdoku | En desarrollo | Juego publicado | No | No específico | No específico | No específico |
| Solver y unicidad | **Contrato y validación propios** | Casos publicados | Casos publicados | **Punto fuerte declarado** | Answer key | Algoritmos generales |
| Pistas literarias trazables | Objetivo diferencial | Sí, en casos diseñados | Sí, en formato misterio | Reglas/validator | Clues educativas | Clues de lógica general |
| Juego online | Sí | Sí | Sí | Sí, proyectos exportables | Actividades | Sí/según maker |
| Exportación imprimible | Sí, PDF en el flujo actual | Sí | Libros/impresión | Exportación de proyectos | Material educativo | PDF/PNG/enlace |
| Historial y duplicación | Base implementada | No es el foco | Progreso/colección | Proyectos y exportación | Actividades | My Puzzles |
| Comunidad y hábito diario | Oportunidad | Comunidad y casos periódicos | **Muy fuerte** | Diario/semillas | Clases | Compartir |

## Pros de Murdoku Generator

La primera ventaja es la **especialización**. La aplicación puede entender restricciones que un maker genérico no necesita representar: regiones con muros, adyacencia solo dentro de una habitación, orientación absoluta, objetos del entorno y la condición crítica de que únicamente el asesino comparta área con la víctima. Esa especialización permite que la personalización tenga consecuencias narrativas reales y no sea un simple cambio de nombres.

La segunda ventaja es la **separación entre creatividad y corrección**. La narrativa, el tono y la ambientación pueden variar, mientras que la solución, la matriz lógica y las restricciones permanecen protegidas. Es una posición más fiable que pedir a un LLM que invente un puzzle completo de una sola vez.

La tercera ventaja es la **doble experiencia**, digital e imprimible. El usuario puede generar una historia para jugar en pantalla, editarla y descargarla como caso listo para una actividad, un evento o una colección personal.

La cuarta ventaja es el potencial de **trazabilidad**. Si cada pista contiene referencias a entidades y restricciones verificadas, podemos mostrar por qué existe, qué deducción habilita y qué se mantuvo bloqueado durante la edición.

## Contras y riesgos actuales

El principal riesgo es prometer una generación formal más fuerte de la que el motor actual implementa. Para competir con referentes como Summer Engine, las pistas deben derivarse de restricciones ejecutables y no limitarse a frases plausibles. La matriz de habitaciones, puertas, objetos y posiciones debe ser una fuente de verdad única.

También existe un riesgo de **experiencia fragmentada**: cuestionario, revisión, juego, historial y PDF deben compartir el mismo objeto de caso y la misma versión. Si cada pantalla mantiene una copia local, será difícil garantizar que el PDF, el tablero y la solución correspondan al mismo estado.

La aplicación todavía debe resolver la **calibración de dificultad** de manera medible. Elegir “Difícil” no debe significar solo producir más pistas; debe implicar mayor profundidad de deducción, menos pistas directas, más relaciones cruzadas y una explicación que refleje las técnicas necesarias.

Por último, existe un coste de producto: un editor potente puede intimidar a usuarios que solo quieren jugar. Será necesario separar claramente los modos **Jugar**, **Crear** y **Revisar**, con valores predeterminados seguros y una ruta rápida basada en plantillas.

## Opciones que darían un salto de calidad

| Prioridad | Opción | Impacto | Esfuerzo | Justificación |
|---|---|---:|---:|---|
| P0 | Solver espacial completo con modelo de habitaciones, muros, objetos, roles y contador de soluciones | Muy alto | Alto | Es la garantía que convierte la promesa de coherencia en una propiedad verificable. Debe bloquear publicación si hay cero o más de una solución. |
| P0 | Inspector de pistas | Muy alto | Medio/alto | Cada pista debería mostrar tipo, entidades referenciadas, restricción formal, posiciones eliminadas y si es redundante. Esto diferencia el producto de los generadores narrativos. |
| P0 | Revisión por versiones | Alto | Medio | Guardar “borrador”, “revisado” y “publicado”, con comparación y restauración. Evita perder una edición válida y permite auditar cambios. |
| P1 | Calibración por técnicas de resolución | Muy alto | Alto | Medir pasos, profundidad, número de candidatos y técnicas: directa, fila/columna, habitación, cardinal, adyacencia, cadena y absurdo. Mostrar una tarjeta de dificultad explicable. |
| P1 | Modo diario y semillas compartibles | Alto | Medio | Un código de caso debe reproducir exactamente tablero, pistas y narrativa. Facilita retos familiares, eventos y competición amistosa. |
| P1 | Modo anfitrión para aula y eventos | Alto | Medio | Crear enlace de participante, panel de progreso sin revelar solución, temporizador opcional, pistas desbloqueables y PDF con nombre del grupo. |
| P1 | Biblioteca de temas y paquetes narrativos | Medio/alto | Medio | Halloween, hospital, taller, escuela, fantasía y ciencia ficción con vocabulario coherente, objetos válidos y reglas de estilo. |
| P2 | Explicación interactiva del razonamiento | Alto | Alto | Al pulsar una deducción, el sistema explica qué pista y qué restricciones eliminan cada candidato. Convierte el juego en una experiencia de aprendizaje. |
| P2 | Accesibilidad y localización desde el modelo | Alto | Medio | Contraste, teclado, lector de pantalla, texto alternativo, tamaño de letra, español claro y traducciones sin modificar identificadores lógicos. |
| P2 | Galería pública con remix controlado | Medio/alto | Medio/alto | Compartir solo casos validados, conservar atribución y permitir duplicar una versión sin tocar la original. |
| P2 | Analítica de dificultad anonimizada | Medio | Medio | Detectar dónde abandonan los jugadores y recalibrar pistas sin recopilar contenido sensible ni revelar soluciones. |

## Recomendación de posicionamiento

La aplicación no debería competir como “otro generador de puzzles con IA”. El mensaje diferencial debe ser: **“Crea un misterio a tu medida; la historia cambia, la deducción sigue siendo justa.”** Esa promesa debe sostenerse con una insignia de validación que no sea decorativa: número de soluciones, cobertura de pistas, dificultad medida, versión del solver y fecha de validación.

El producto debería tener tres recorridos. **Jugar** debe abrir rápidamente una plantilla validada con tutorial y ayudas. **Crear** debe guiar al usuario por entrevista, ajustes seguros y generación. **Revisar** debe permitir editar únicamente la capa creativa, regenerar redacción, inspeccionar la lógica, guardar una versión y exportar. La complejidad avanzada debe estar disponible, pero no ser obligatoria.

## Hoja de ruta recomendada

Durante la siguiente iteración conviene priorizar el solver espacial y el inspector de pistas antes de ampliar el catálogo visual. Después hay que consolidar el caso como entidad versionada y hacer que revisión, juego, historial y PDF consuman exactamente el mismo snapshot validado. En una tercera etapa se pueden añadir diario, semillas, aula y galería. Solo cuando esas garantías estén asentadas conviene invertir en más estilos narrativos, traducciones y personalización visual avanzada.

## Conclusión

Murdoku Generator puede superar a los competidores generalistas no por generar más texto, sino por **hacer verificable la unión entre mapa, lógica, pista y relato**. La prioridad estratégica es construir confianza: el usuario debe poder editar la historia sin miedo a romper el puzzle, comprender por qué cada pista es válida y obtener el mismo caso en pantalla, PDF y enlace compartido. Esa combinación de rigor simbólico, narrativa personalizada y acabado editorial constituye una ventaja defendible.

## Referencias

[1]: https://murdoku.com/ "Murdoku oficial — Sudoku meets murder mystery"
[2]: https://murdle.com/ "Murdle — Daily mystery puzzles by G. T. Karber"
[3]: https://www.summerengine.com/ai-logic-puzzle-maker "Summer Engine — AI Logic Puzzle Maker"
[4]: https://teachquill.com/logic-puzzle-maker "TeachQuill — Logic Puzzle Maker"
[5]: https://puzzleforge.app/ "PuzzleForge — Create Custom Puzzles in Minutes"
[6]: https://murdoku.fans/en/how-to-play/ "Murdoku Online Guide — How to Play"
