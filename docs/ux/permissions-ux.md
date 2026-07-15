# Permissions UX

Patrón dominante hoy: **ocultar** un control si falta el permiso (más simple de implementar, pero el usuario no entiende por qué no ve una opción).

Patrón recomendado, ya implementado en `PaymentPanel` (POS) para "cuenta corriente sin cliente seleccionado": **deshabilitar + tooltip explicando qué falta**. Más trabajo de implementación, mucho mejor experiencia — el usuario sabe que la capacidad existe y qué necesita para desbloquearla (en el caso del POS, seleccionar un cliente).

## Recomendación

Adoptar el patrón de deshabilitar+explicar de forma consistente en los módulos con más fricción de permisos (Purchases, Inventory, Transfers — los que además tienen la brecha de enforcement de backend documentada en `SECURITY.md`). No tiene sentido invertir en la UX de permisos sin primero cerrar la brecha de que el backend realmente los exija — ver `ROADMAP.md` P0.
