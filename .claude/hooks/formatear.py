"""Hook PostToolUse: formatea el archivo que Claude acaba de editar.

Solo formatea. No hace lint con --fix, porque borraría los imports recién
añadidos que todavía no se usan. El lint lo pasa la skill verify.
"""

import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
WIN = sys.platform == "win32"
EXT_FRONTEND = {".vue", ".ts", ".js", ".css", ".json"}


def ejecutar(cmd, cwd):
    try:
        subprocess.run(cmd, cwd=cwd, timeout=60, capture_output=True)
    except Exception:
        pass  # un formateador roto no debe bloquear a Claude


def main():
    try:
        datos = json.loads(sys.stdin.buffer.read().decode("utf-8"))
        ruta = Path(datos.get("tool_input", {}).get("file_path", "")).resolve()
    except Exception:
        return
    if not ruta.is_file():
        return

    backend = RAIZ / "backend"
    frontend = RAIZ / "frontend"

    if backend in ruta.parents and ruta.suffix == ".py":
        python = backend / ".venv" / ("Scripts/python.exe" if WIN else "bin/python")
        if python.exists():
            ejecutar([str(python), "-m", "ruff", "format", str(ruta)], backend)
    elif frontend in ruta.parents and ruta.suffix in EXT_FRONTEND:
        if "node_modules" in ruta.parts:
            return
        prettier = frontend / "node_modules" / "prettier" / "bin" / "prettier.cjs"
        if prettier.exists():
            ejecutar(["node", str(prettier), "--write", str(ruta)], frontend)


main()
