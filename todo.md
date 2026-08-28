# Project TODO

## Producto y experiencia

- [x] Diseñar una interfaz elegante, pulida y accesible con identidad visual propia para Murdoku Generator.
- [x] Crear una biblioteca navegable de Murdokus base con búsqueda, filtros, metadatos y estado de validación.
- [x] Crear un cuestionario guiado para nombres, temática, tono, dificultad y preferencias narrativas.
- [x] Implementar el flujo de revisión previa a la generación y mostrar qué elementos se conservarán de la plantilla.
- [x] Implementar una vista jugable con cuadrícula de deducción, pistas, progreso, ayudas y revelado controlado de solución.
- [x] Implementar historial personal con consulta, reanudación, duplicación y variaciones de Murdokus.

## Modelo lógico y biblioteca

- [x] Definir el formato estructurado de cada Murdoku: entidades, atributos, relaciones, pistas, solución, narrativa y metadatos.
- [x] Incorporar una biblioteca inicial de plantillas estructuradas sin alterar sus soluciones ni reglas.
- [x] Conservar los documentos fuente adjuntos como referencias asociadas a las plantillas, con nombre, origen y trazabilidad.
- [x] Añadir validación determinista de estructura, referencias de pistas y existencia de solución.
- [x] Añadir verificación determinista de solución única antes de publicar o guardar una variación.
- [x] Impedir que la redacción generada por IA modifique la matriz lógica, las respuestas correctas o las restricciones del puzzle.

## Generación asistida

- [x] Integrar el modelo de lenguaje del proyecto mediante salida estructurada y contrato JSON validado.
- [x] Generar nombres, ambientación, tono, historia y redacción de pistas a partir de campos narrativos aislados.
- [x] Rechazar, reparar o regenerar respuestas que incumplan el esquema, introduzcan contradicciones o pierdan pistas.
- [x] Guardar versión de plantilla, parámetros de personalización, contenido generado y resultado de validación.
- [x] Mostrar una revisión editable antes de convertir una generación en Murdoku jugable.

## Backend, datos y seguridad

- [x] Añadir tablas para plantillas, fuentes, versiones, Murdokus generados, sesiones de juego y progreso.
- [x] Crear helpers de base de datos y procedimientos tRPC tipados para biblioteca, creación, validación, historial y juego.
- [x] Aplicar control de acceso para que el historial privado pertenezca a su usuario y las fuentes administrativas estén protegidas.
- [x] Mantener timestamps persistidos en UTC y registrar auditoría mínima de generación y validación.

## Calidad

- [x] Escribir pruebas Vitest para validación de esquema, invariantes lógicas, unicidad de solución y permisos.
- [x] Escribir pruebas Vitest para el contrato de salida del modelo de lenguaje y los casos de rechazo/regeneración.
- [x] Ejecutar comprobación TypeScript, pruebas y build de producción.
- [x] Verificar visualmente escritorio y móvil, estados de carga, error, vacío, foco y navegación por teclado.
- [x] Revisar todo este archivo y marcar como completados los elementos realmente implementados antes del checkpoint final.

## Ajustes de calidad detectados

- [x] Implementar una biblioteca de plantillas con búsqueda y filtros funcionales, no solo tarjetas estáticas.
- [x] Añadir selector y validación de dificultad en el cuestionario.
- [x] Corregir el conteo de progreso del tablero para ignorar celdas desmarcadas.
- [x] Definir un contrato completo de Murdoku estructurado y validar pistas, referencias y solución.
- [x] Integrar la verificación de solución única en el flujo de revisión/guardado.
- [x] Integrar el modelo de lenguaje con salida JSON estructurada y bloqueo de cambios lógicos.
- [x] Asegurar descubrimiento de las pruebas nuevas y añadir cobertura del contrato estructurado.
- [x] Ejecutar y registrar el build de producción.

## Generación personalizada basada en Murdokeando.md

- [x] Leer y documentar todas las reglas obligatorias del prompt maestro y del enfoque neuro-simbólico.
- [x] Implementar entrevista inicial completa: jugadores, edad, dificultad de cinco niveles, temática, tono, estructura, nombres y formato.
- [x] Implementar detección de inconsistencias, ajuste seguro de parámetros y confirmación previa.
- [x] Implementar contrato de salida completo: título, introducción de 150–300 palabras, elementos, cuadrícula Markdown, 10–40 pistas, nivel, solución y explicación paso a paso.
- [x] Modelar restricciones espaciales: filas/columnas, regiones, adyacencia ortogonal dentro de habitación, orientación cardinal, puertas/ventanas y condición víctima-asesino.
- [x] Implementar generación por capas: solución/matriz primero, pistas verificables después y narrativa al final.
- [x] Implementar control automático de contradicciones, redundancia, correspondencia pista-solución, dificultad y unicidad.
- [x] Implementar reconstrucción o rechazo automático cuando falle una comprobación obligatoria.
- [x] Evitar revelar la solución antes del apartado correspondiente en la experiencia de usuario.
- [x] Añadir pruebas de entrevista, reglas espaciales, formato de salida y control de calidad.
