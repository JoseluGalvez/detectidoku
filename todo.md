# Project TODO

## Producto y experiencia

- [ ] Diseñar una interfaz elegante, pulida y accesible con identidad visual propia para Murdoku Generator.
- [ ] Crear una biblioteca navegable de Murdokus base con búsqueda, filtros, metadatos y estado de validación.
- [ ] Crear un cuestionario guiado para nombres, temática, tono, dificultad y preferencias narrativas.
- [ ] Implementar el flujo de revisión previa a la generación y mostrar qué elementos se conservarán de la plantilla.
- [x] Implementar una vista jugable con cuadrícula de deducción, pistas, progreso, ayudas y revelado controlado de solución.
- [ ] Implementar historial personal con consulta, reanudación, duplicación y variaciones de Murdokus.

## Modelo lógico y biblioteca

- [x] Definir el formato estructurado de cada Murdoku: entidades, atributos, relaciones, pistas, solución, narrativa y metadatos.
- [ ] Incorporar una biblioteca inicial de plantillas estructuradas sin alterar sus soluciones ni reglas.
- [ ] Conservar los documentos fuente adjuntos como referencias asociadas a las plantillas, con nombre, origen y trazabilidad.
- [x] Añadir validación determinista de estructura, referencias de pistas y existencia de solución.
- [ ] Añadir verificación determinista de solución única antes de publicar o guardar una variación.
- [ ] Impedir que la redacción generada por IA modifique la matriz lógica, las respuestas correctas o las restricciones del puzzle.

## Generación asistida

- [ ] Integrar el modelo de lenguaje del proyecto mediante salida estructurada y contrato JSON validado.
- [ ] Generar nombres, ambientación, tono, historia y redacción de pistas a partir de campos narrativos aislados.
- [ ] Rechazar, reparar o regenerar respuestas que incumplan el esquema, introduzcan contradicciones o pierdan pistas.
- [ ] Guardar versión de plantilla, parámetros de personalización, contenido generado y resultado de validación.
- [ ] Mostrar una revisión editable antes de convertir una generación en Murdoku jugable.

## Backend, datos y seguridad

- [ ] Añadir tablas para plantillas, fuentes, versiones, Murdokus generados, sesiones de juego y progreso.
- [ ] Crear helpers de base de datos y procedimientos tRPC tipados para biblioteca, creación, validación, historial y juego.
- [ ] Aplicar control de acceso para que el historial privado pertenezca a su usuario y las fuentes administrativas estén protegidas.
- [ ] Mantener timestamps persistidos en UTC y registrar auditoría mínima de generación y validación.

## Calidad

- [ ] Escribir pruebas Vitest para validación de esquema, invariantes lógicas, unicidad de solución y permisos.
- [ ] Escribir pruebas Vitest para el contrato de salida del modelo de lenguaje y los casos de rechazo/regeneración.
- [x] Ejecutar comprobación TypeScript, pruebas y build de producción.
- [ ] Verificar visualmente escritorio y móvil, estados de carga, error, vacío, foco y navegación por teclado.
- [ ] Revisar todo este archivo y marcar como completados los elementos realmente implementados antes del checkpoint final.

## Ajustes de calidad detectados

- [x] Implementar una biblioteca de plantillas con búsqueda y filtros funcionales, no solo tarjetas estáticas.
- [ ] Añadir selector y validación de dificultad en el cuestionario.
- [x] Corregir el conteo de progreso del tablero para ignorar celdas desmarcadas.
- [x] Definir un contrato completo de Murdoku estructurado y validar pistas, referencias y solución.
- [ ] Integrar la verificación de solución única en el flujo de revisión/guardado.
- [ ] Integrar el modelo de lenguaje con salida JSON estructurada y bloqueo de cambios lógicos.
- [x] Asegurar descubrimiento de las pruebas nuevas y añadir cobertura del contrato estructurado.
- [x] Ejecutar y registrar el build de producción.
