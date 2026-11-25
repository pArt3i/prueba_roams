# Auditoría · Revisión editorial de voz y atribución (documentación sin commit, 16 archivos)

Veredicto: CAMBIOS NECESARIOS (leve: ningún hallazgo de gravedad alta; 2 medios y 4 bajos o informativos, todos de redacción o atribución)
Spec revisada: no aplica (revisión de documentación). Referencias: CLAUDE.md (reparto de papeles), ai-workspace/03-proceso/bitacora.md, ai-workspace/03-proceso/prompts/prompts-clave.md y el formato de los informes previos (el más reciente: ai-workspace/03-proceso/auditorias/006-frontend-simulador.md).

Resumen: el diff es, mecánicamente, solo cambio de nombre y de voz. No cambió ninguna cifra, CA/R, nombre de archivo, estado ni decisión, y no se tocó ningún prompt literal ni auditorias/. Lo que queda son 2 cambios de atribución que alteran quién hizo algo (H1) o dejan una frase ambigua (H2, H3), y un residuo de «Pablo» en la plantilla de la skill (H4). Cambio no solicitado: un salto de línea final añadido en la spec 003 (H5).

## Verificación mecánica
Qué comprobé y cómo (solo lectura):
1. Alcance. `git diff --name-only` da exactamente los 16 archivos del encargo. `git status` no muestra ningún archivo de `ai-workspace/03-proceso/auditorias/` modificado. Las 6 auditorías 001 a 006 están intactas.
2. Cambios solo de voz. Con un script en Python (en el scratchpad) comparé cada archivo de `HEAD` con el de trabajo línea a línea. Para cada línea distinta calculé las operaciones a nivel de carácter. Resultado:
   - Todos los archivos tienen el mismo número de líneas, salvo `003-frontend-clientes.md` (H5).
   - No hay BOM nuevo ni cambio de CRLF/LF, salvo lo anotado en H6.
   - Los únicos fragmentos que cambian son «Pablo», «de Pablo», «a Pablo», «Cambios de», «Nota original de», «Revisión de» y sus sustitutos («mí», «mía», «me», «Mis cambios», «Mi nota original», «Mi revisión», «yo apruebo», «autorizo», «Confirmo», «propuso», «mi», «He», «Ya había decidido»), más las dos frases de «a petición de la sesión».
   - Ningún carácter de espacios, tabulación ni puntuación cambió por su cuenta.
   - Total: 77 líneas modificadas, igual que en `git diff --stat`.
3. Cifras, identificadores y estados. En las operaciones de carácter de la comprobación 2 no aparece ningún dígito, ni «CA», ni «R», ni «ADR», ni «Estado», ni «Aprobada». Los números de ronda y las fechas («Primera ronda, 2026-11-15», etc.) están intactos. Los nombres de archivo, enlaces y rutas no cambian. Las líneas `Estado:` y el título de cada spec y ADR no están en el diff.
4. Prompts literales. En `prompts-clave.md` solo cambia la línea 44 (párrafo «Resultado», «Cambios de Pablo» a «Mis cambios»). Siguen sin tocar los bloques de código con los prompts (líneas 53, 93, 114, 129, 154, 187, 235, 376 y los demás), que conservan «Pablo» o «Cambios de Pablo». Eso es lo correcto por el encargo. Ver la nota en «Frases ambiguas».
5. Cabeceras renombradas. Las 4 specs, la skill spec-writer (línea 50), `bitacora.md` (líneas 36 y 39) y `prompts-clave.md` (línea 44) usan «Mis cambios». Búsqueda de «Cambios de Pablo» / «Nota original de Pablo» / «Revisión de Pablo» / «de la sesión» fuera de los bloques de prompt: sin coincidencias.
6. «Pablo» que queda en los 16 archivos: solo `.claude/skills/spec-writer/SKILL.md` (líneas 3, 7, 12, 13 y 51) y los prompts literales de `prompts-clave.md`. Las líneas 3, 7, 12 y 13 de la skill son instrucciones a la IA, así que la tercera persona es coherente. La línea 51 es el problema H4.

## Hallazgos
| # | Gravedad | Archivo:línea | Problema | Arreglo sugerido |
| --- | --- | --- | --- | --- |
| H1 | Media | `ai-workspace/01-specs/001-clientes.md:237` y `ai-workspace/01-specs/002-precio-y-simulaciones.md:175` | Atribuye a la persona autora algo que lo pidió la sesión de la IA. Antes: «Redactado por el arquitecto a petición de la sesión; Pablo debe confirmarlo.» Después: «Redactado por el arquitecto a petición mía; debo confirmarlo yo.» La distinción original era deliberada: estas rondas (Séptima de la 001, Segunda de la 002) no son decisiones del autor, sino cambios que propuso la IA tras la reauditoría 002 y que quedaban pendientes de su confirmación. Las demás rondas de la 001 dicen «por decisión mía» y están respaldadas por `bitacora.md` y `prompts-clave.md` (sección 9, Sexta ronda; bitácora, Octava ronda). Para estas dos no hay ningún prompt ni nota que muestre que el autor lo pidiera. Con la nueva frase, «a petición mía» y «debo confirmarlo yo» se leen como pedir algo y aún no haberlo confirmado, y la Séptima ronda se confunde con las rondas «por decisión mía». Aplicado tal como se ordenó (cambio (d)), pero altera quién hizo qué. | Si el autor sí lo pidió, dejarlo y comprobarlo. Si no, redactar por ejemplo «a petición de la IA (sesión principal); debo confirmarlo yo» o «a propuesta de la sesión de la IA; pendiente de mi confirmación». En ambos archivos, igual. |
| H2 | Media | `ai-workspace/01-specs/004-frontend-detalle-simulador.md:76` (R15), `:176` (CA37) y `ai-workspace/02-arquitectura/007-divisas.md:26` | Voz en primera persona dentro de texto normativo, que leen los agentes. Antes: «requiere avisar a Pablo antes de añadirla» y «sin aviso a Pablo». Después: «requiere avisarme antes de añadirla» y «sin avisarme». CA37 es un criterio que ejecuta el auditor: quien lo lee (agente) puede entender «me» como sí mismo, no como el autor. Además, en la 007 la frase remite a `CLAUDE.md`, que sigue diciendo «sin avisar a Pablo» (CLAUDE.md:19). Cambio gramaticalmente correcto («avisarme», «sin avisarme»), pero ambiguo en el sujeto. | En el texto normativo usar una forma neutra («requiere aviso previo al autor del proyecto», «sin aviso previo al autor») o aclarar «(el autor del proyecto)» una vez. Si se mantiene «avisarme», dejarlo solo en las secciones «Mis cambios», no en R/CA. |
| H3 | Baja | `ai-workspace/02-arquitectura/004-almacenamiento-y-llamadas-api.md:6` y `ai-workspace/02-arquitectura/008-duplicados-409.md:6` | Sujeto omitido y tiempo verbal cambiado. Antes: «Pablo ya decidió que se persisten…» y «Pablo ya decidió que el duplicado devuelve 409, y `convenciones-backend` reserva 409…». Después: «Ya había decidido que…». La frase anterior tiene como sujeto la skill (`reglas-negocio` / `validacion-nif`), y «había decidido» vale para «yo» y para «él», así que el sujeto se puede leer como la skill. Se pierde también el matiz de que «ya» es presente a la fecha del ADR. Sentido preservado, pero ambiguo. En 008 la coordinada «y `convenciones-backend` reserva 409» queda mezclada con la oración de «Ya había decidido». | «Yo ya había decidido que…» (o «Ya lo tenía decidido: …»). En 008, separar con punto: «Yo ya había decidido que el duplicado devuelve 409. Además, `convenciones-backend` reserva 409 para duplicados.» |
| H4 | Baja | `.claude/skills/spec-writer/SKILL.md:51` | La cabecera de la plantilla pasó a «Mis cambios» (línea 50) pero la línea siguiente sigue en tercera persona: «(vacío al crear. Pablo anota aquí lo que corrige antes de aprobar.)». Cada spec nueva copiará «Pablo anota aquí…» bajo «Mis cambios». No estaba en la lista del encargo, pero queda incoherente con la cabecera. | Cambiar por «(vacío al crear. Aquí anoto lo que corrijo antes de aprobar.)» o «(vacío al crear. El autor anota aquí…)». Las líneas 3, 7, 12 y 13 de la skill pueden quedarse en tercera persona (son instrucciones a la IA). |
| H5 | Baja | `ai-workspace/01-specs/003-frontend-clientes.md:126` (final del archivo) | Cambio que no es de voz. El archivo original terminaba sin salto de línea (`\ No newline at end of file`); el nuevo termina con salto de línea. El encargo pedía cero cambios de espacios o saltos de línea. Es inocuo y es el único archivo donde ocurre (en los otros 15, ambos extremos terminan igual). | Quitar el salto final si se quiere un diff estrictamente «solo voz», o aceptarlo y anotarlo. |
| H6 | Informativa | `.claude/skills/spec-writer/SKILL.md` (todo el archivo) | En el árbol de trabajo está en CRLF (52 `\r\n`), mientras que 165 archivos versionados están en LF. `git diff` solo muestra 1 línea porque `core.autocrlf=true` lo normaliza (de ahí los avisos «LF will be replaced by CRLF» de los otros 15 archivos). No es un cambio introducido por esta edición: `.claude/skills/adr/SKILL.md`, que no está modificado, también está en CRLF en el árbol de trabajo, y el índice de ambos es LF. | Ninguna. Solo para saber que `git diff` no es una prueba de que las terminaciones de línea no cambiaron; por eso comparé `HEAD` contra el archivo de trabajo directamente. |

## Lo que se pidió revisar y está bien
- (a) Sustitución por primera persona: correcta en concordancia y sentido en todas las apariciones de «de Pablo», «por Pablo», «a Pablo» y «Pablo + verbo» de los archivos, con las dos excepciones H1 y H3 de arriba.
- (b) «Cambios de Pablo» a «Mis cambios»: aplicado en las 4 specs, en la skill, en `bitacora.md:36,39` y en `prompts-clave.md:44`. En las specs también se pasó «**Nota original de Pablo**» a «**Mi nota original**» (001:184) y «Revisión de Pablo:» a «Mi revisión:» (001:247, 002:180, 003:126, 004:219). Esto último es coherente con el texto que sigue («he comprobado», «que pedía»), que ya estaba en primera persona.
- (c) 002:168: «Pablo confirma las cinco decisiones que tomó el arquitecto fuera de su lista» pasó a «Confirmo las cinco decisiones que propuso el arquitecto fuera de mi lista». Concordancia correcta («Confirmo», «mi lista») y encaja con el reparto de papeles (la IA propone, el autor decide). No cambia el contenido de las cinco decisiones que siguen.
- «Pablo autoriza» a «autorizo» (001:199): la lista de esa ronda mezcla impersonal («se valida…») con «autorizo», pero es gramatical y el sentido se conserva. 001:45 y `001-stack.md:22` («autorizada por mí») también correctos.
- «aceptado por mí» (001:104) y «(decisión mía)» (001:42): bien.
- «Pablo ha elegido» a «He elegido» (007:6) y «Pablo aprueba» a «yo apruebo» (README:140): bien. El README ya estaba en primera persona del plural impersonal («se ha desarrollado») pero la frase es correcta y no se atribuye nada a la IA.
- Atribuciones a la IA y al autor: salvo H1, no encontré ningún caso en que una acción de la IA (redactar, implementar, auditar) pase al autor ni al revés. El README sigue diciendo que el arquitecto redacta y el autor aprueba.
- Frases «sin avisarme» y «Confirmo las cinco decisiones…» del encargo: la primera aparece como «avisarme» y «sin avisarme» (H2). La segunda, ver (c).

## Frases ambiguas que se han quedado o han quedado así
1. 001:237 y 002:175: «a petición mía; debo confirmarlo yo». Se lee como contradictoria (pedí y aún no lo confirmé) hasta decidir H1.
2. Los ADR (por ejemplo `002-calculo-precio-backend.md:21,24,25,35-37`, `007-divisas.md:17-48`, `003-iva-por-pais.md`) mezclan una narración impersonal del arquitecto («Decidido: opción 1») con «decisión mía» y «Resuelta por mí». Es coherente con el encargo, pero un lector externo no sabe quién narra el resto. Opcional: una línea al inicio de `ai-workspace/README.md` aclarando que «mí» es el autor del proyecto.
3. `prompts-clave.md:93, 114, 187` (prompts literales) siguen pidiendo «Cambios de Pablo» y «por decisión de Pablo»; el párrafo de resultado (línea 44) ya dice «Mis cambios». Es lo correcto por el encargo, pero el lector verá una cabecera distinta en el prompt y en la spec. Opcional: una nota breve «(la cabecera se renombró después a «Mis cambios»)».
4. `bitacora.md:36`: «borró mi nota original de «Mis cambios»». En el momento del hecho la cabecera se llamaba «Cambios de Pablo». Anacronismo menor, sin consecuencias.
5. 007:6: «He elegido `open.er-api.com`… Había que decidir quién la llama»: mezcla primera persona con impersonal. Se entiende.
6. 002:168: «fuera de mi lista»: «mi lista» se refiere a los puntos de «Primera ronda», pero no se nombra. Se entiende.
7. 001:199: «Email: se valida con `EmailStr`…; autorizo la dependencia…»: sujeto mixto en la misma frase; correcto, pero sonará abrupto.

## Comandos ejecutados
Desde `C:\Users\pablo\Projects\saas-o-matic` (solo lectura; no se modificó ningún archivo del proyecto, el script de comprobación está en el scratchpad de la sesión):
```
git diff --stat
git diff --name-only
git diff -U0 --word-diff=plain            -> revisión palabra a palabra de los 16 archivos
git status --short
python <scratchpad>\chk.py                -> compara HEAD frente a archivo de trabajo línea a línea y a nivel de carácter (líneas, CRLF, BOM, salto final, operaciones de cada línea distinta)
git ls-files --eol                        -> terminaciones de línea del índice y del árbol (H6)
git config core.autocrlf                  -> true
git diff -- ai-workspace/01-specs/003-frontend-clientes.md | tail   -> comprobar el salto de línea final (H5)
grep -rn "Cambios de Pablo|Nota original de Pablo|Revisión de Pablo|de la sesión" (md, json, vue, ts, py, sin node_modules ni .venv)
grep -n -i "pablo" sobre los 16 archivos modificados
Lectura de contexto: 001-clientes.md:180-248, 002-precio-y-simulaciones.md:148-181, spec-writer/SKILL.md:44-53, README.md:136-144, ADR 004 y 007 (líneas 4-8), bitacora.md:28-80, prompts-clave.md:205-245, auditorias/006-frontend-simulador.md (formato)
```
No se ejecutaron tests ni lint porque el diff no toca código.

Archivos relevantes (rutas absolutas):
- C:\Users\pablo\Projects\saas-o-matic\ai-workspace\01-specs\001-clientes.md (237)
- C:\Users\pablo\Projects\saas-o-matic\ai-workspace\01-specs\002-precio-y-simulaciones.md (168, 175)
- C:\Users\pablo\Projects\saas-o-matic\ai-workspace\01-specs\003-frontend-clientes.md (126)
- C:\Users\pablo\Projects\saas-o-matic\ai-workspace\01-specs\004-frontend-detalle-simulador.md (76, 176)
- C:\Users\pablo\Projects\saas-o-matic\ai-workspace\02-arquitectura\004-almacenamiento-y-llamadas-api.md (6)
- C:\Users\pablo\Projects\saas-o-matic\ai-workspace\02-arquitectura\007-divisas.md (26)
- C:\Users\pablo\Projects\saas-o-matic\ai-workspace\02-arquitectura\008-duplicados-409.md (6)
- C:\Users\pablo\Projects\saas-o-matic\.claude\skills\spec-writer\SKILL.md (51)
