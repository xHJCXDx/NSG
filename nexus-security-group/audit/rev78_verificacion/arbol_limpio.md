# Árbol limpio en las corridas funcionales

Devolución de quinta instancia (18/11/2026), V-B5.

- **Corrida del 17/11/2026** (`audit/rev77_verificacion/corrida_funcional_20261117-120357.log`, commit `9f24de2`): el árbol **no** estaba limpio. El bloque «Uncommitted tracked changes» lista 11 capturas modificadas (`audit/rev76_verificacion/imagenes/T23-02` a `T23-12`), que se rehicieron ese día y se commitearon después. No había ningún archivo de código modificado, así que la corrida ejercitó el código de `9f24de2`.
- **Corrida del 18/11/2026** (`audit/rev78_verificacion/corrida_funcional_20261118-105511.log`, commit `9a547b0`, con el código idéntico a `9f24de2`): el bloque «Uncommitted tracked changes» está vacío. Los demás logs de la REV78 de esta carpeta también registran el árbol limpio.
