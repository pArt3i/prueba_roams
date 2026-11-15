"""Hook PreToolUse: impide editar archivos sensibles (.env y bases de datos).

Salir con código 2 bloquea la acción y el mensaje de stderr le llega a Claude.
"""

import json
import sys
from pathlib import Path

EXT_PROTEGIDAS = {".db", ".sqlite", ".sqlite3"}


def protegido(ruta):
    nombre = Path(ruta).name.lower()
    if nombre == ".env":
        return True
    if nombre.startswith(".env.") and not nombre.endswith(".example"):
        return True
    return Path(ruta).suffix.lower() in EXT_PROTEGIDAS


try:
    datos = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    ruta = datos.get("tool_input", {}).get("file_path", "")
except Exception:
    sys.exit(0)

if ruta and protegido(ruta):
    mensaje = f"Bloqueado: {ruta} es un archivo protegido (secretos o base de datos). Pidele a Pablo que lo cambie.\n"
    sys.stderr.buffer.write(mensaje.encode("utf-8"))
    sys.exit(2)
