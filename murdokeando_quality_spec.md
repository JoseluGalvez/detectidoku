# Checklist de calidad de Murdoku

Este checklist deriva exclusivamente de `Murdokeando.md` y se evalúa sobre la representación estructurada antes de guardar o publicar un caso.

| ID | Requisito obligatorio | Criterio verificable | Severidad |
|---|---|---|---|
| Q01 | Caso completo | Existe misterio, objetivo del jugador, elementos, pistas, cuadrícula, solución y explicación paso a paso. | crítico |
| Q02 | Entrevista completa | Hay jugadores, edad, dificultad, temática, tono, estructura y formato definidos. | importante |
| Q03 | Narrativa | La introducción contiene entre 150 y 300 palabras y cubre contexto, suceso y objetivo. | importante |
| Q04 | Elementos | Las listas de sospechosos, lugares y objetos/evidencias no están vacías y son coherentes con la configuración. | crítico |
| Q05 | Cuadrícula | La cuadrícula está en Markdown y permite estados Sí, No y Descartado. | importante |
| Q06 | Pistas | Hay entre 10 y 40 pistas, clasificadas en tipos reconocibles. | crítico |
| Q07 | Calidad de pistas | Las pistas son inequívocas, no contradictorias, deductivas y sin redundancia evitable. | crítico |
| Q08 | Solución única | El solver encuentra exactamente una asignación completa válida. | crítico |
| Q09 | Reglas espaciales | Se respetan filas/columnas, habitaciones, muros, adyacencia ortogonal y orientación cardinal cuando aplican. | crítico |
| Q10 | Escena del crimen | Víctima y asesino comparten habitación y ningún tercer sospechoso comparte esa habitación. | crítico |
| Q11 | Correspondencia | Cada pista referencia entidades existentes y corresponde a una restricción que la solución satisface. | crítico |
| Q12 | Explicación | La resolución explica la unicidad, utiliza las pistas relevantes y no requiere adivinación. | importante |
| Q13 | Dificultad | La cantidad/profundidad de deducciones es compatible con Muy fácil, Fácil, Medio, Difícil o Experto. | importante |
| Q14 | No revelar prematuramente | La solución solo aparece en el apartado final y no en la vista de juego inicial. | crítico |
| Q15 | Separación neuro-simbólica | La creatividad puede variar narrativa y redacción, pero no la matriz, restricciones ni solución validada. | crítico |
| Q16 | Regeneración segura | Si falla un criterio crítico, el caso se rechaza o se reconstruye antes de guardarse. | crítico |

## Resultado

Un Murdoku de alta calidad debe cumplir todos los requisitos críticos y, como mínimo, todos los requisitos importantes salvo que el usuario confirme explícitamente una excepción. La aplicación debe mostrar cada criterio con estado `cumple`, `no_cumple` o `revisar`, evidencia breve y severidad.
