import 'package:flutter/material.dart';

import '../../domain/errors.dart';

/// Cierra la sesión; si quedan registros sin sincronizar, pide confirmar el
/// descarte antes de salir (nunca se envían con otro usuario).
class LogoutButton extends StatelessWidget {
  const LogoutButton({super.key, required this.onLogout});

  final Future<void> Function({required bool discardPending}) onLogout;

  Future<void> _logout(BuildContext context) async {
    try {
      await onLogout(discardPending: false);
    } on PendingSyncOnLogoutException catch (e) {
      if (!context.mounted) return;
      final discard = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Datos sin sincronizar'),
          content: Text(_pendingMessage(e.pendingCount)),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancelar'),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: TextButton.styleFrom(
                foregroundColor: Theme.of(dialogContext).colorScheme.error,
              ),
              child: const Text('Descartar y salir'),
            ),
          ],
        ),
      );
      if (discard == true) {
        await onLogout(discardPending: true);
      }
    }
  }

  static String _pendingMessage(int count) => count == 1
      ? 'Hay 1 registro sin sincronizar. Si cierra la sesión ahora, se '
          'descartará y no se enviará.'
      : 'Hay $count registros sin sincronizar. Si cierra la sesión ahora, se '
          'descartarán y no se enviarán.';

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.logout_rounded),
      tooltip: 'Cerrar sesión',
      onPressed: () => _logout(context),
    );
  }
}
