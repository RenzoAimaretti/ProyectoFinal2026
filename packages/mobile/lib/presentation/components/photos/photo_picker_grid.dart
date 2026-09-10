import 'dart:io';

import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/services/photo_picker_service.dart';

const double _tileSize = 80;

enum _PhotoSource { camera, gallery }

/// Grilla de fotos del Design System Agropecuario (máx 5 por entidad, R008).
///
/// Captura fotos reales (cámara/galería) vía [PhotoPickerService], muestra
/// miniaturas con `Image.file` y notifica la lista de rutas seleccionadas por
/// [onPathsChanged]. La persistencia en drift (vía `AddPhotoUseCase`) la
/// coordina el ViewModel del formulario al guardar: esta grilla solo gestiona
/// la selección de archivos, sin tocar repositorios.
class PhotoPickerGrid extends StatefulWidget {
  const PhotoPickerGrid({
    super.key,
    this.maxPhotos = 5,
    this.photoPickerService,
    this.initialPaths = const [],
    this.onPathsChanged,
  });

  /// Máximo de fotos permitidas (R008).
  final int maxPhotos;

  /// Servicio opcional; si es null se crea uno interno.
  final PhotoPickerService? photoPickerService;

  /// Rutas ya seleccionadas (modo controlado desde el ViewModel).
  final List<String> initialPaths;

  /// Se dispara con la lista actual de rutas seleccionadas cada vez que se
  /// agrega o quita una foto.
  final ValueChanged<List<String>>? onPathsChanged;

  @override
  State<PhotoPickerGrid> createState() => _PhotoPickerGridState();
}

class _PhotoPickerGridState extends State<PhotoPickerGrid> {
  late final PhotoPickerService _service =
      widget.photoPickerService ?? PhotoPickerService();

  late final List<String> _paths = List.of(widget.initialPaths);

  Future<void> _addPhoto() async {
    final source = await showModalBottomSheet<_PhotoSource>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(
                Icons.photo_camera_outlined,
                color: AppColors.primary,
              ),
              title: const Text('Cámara'),
              onTap: () => Navigator.pop(context, _PhotoSource.camera),
            ),
            ListTile(
              leading: const Icon(
                Icons.photo_library_outlined,
                color: AppColors.primary,
              ),
              title: const Text('Galería'),
              onTap: () => Navigator.pop(context, _PhotoSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null || !mounted) return;

    final path = source == _PhotoSource.camera
        ? await _service.pickFromCamera()
        : await _service.pickFromGallery();

    // Usuario canceló la captura.
    if (path == null || !mounted) return;

    setState(() => _paths.add(path));
    widget.onPathsChanged?.call(List.unmodifiable(_paths));
  }

  void _removePhoto(String path) {
    setState(() => _paths.remove(path));
    widget.onPathsChanged?.call(List.unmodifiable(_paths));
  }

  @override
  Widget build(BuildContext context) {
    final isFull = _paths.length >= widget.maxPhotos;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // ── Encabezado con contador ──────────────────────────────────────
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Fotografías',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.onSurfaceVariant,
              ),
            ),
            Text(
              '${_paths.length}/${widget.maxPhotos}',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // ── Miniaturas + tile agregar ────────────────────────────────────
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final path in _paths)
              _PhotoTile(path: path, onRemove: () => _removePhoto(path)),
            _AddTile(enabled: !isFull, onTap: isFull ? null : _addPhoto),
          ],
        ),
      ],
    );
  }
}

/// Miniatura real (`Image.file`) con botón de quitar.
class _PhotoTile extends StatelessWidget {
  const _PhotoTile({required this.path, required this.onRemove});

  final String path;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _tileSize,
      height: _tileSize,
      decoration: BoxDecoration(
        color: AppColors.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.file(
              File(path),
              width: _tileSize,
              height: _tileSize,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stack) => const Center(
                child: Icon(
                  Icons.image_outlined,
                  size: 32,
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
          Positioned(
            top: 4,
            right: 4,
            child: GestureDetector(
              onTap: onRemove,
              child: Container(
                width: 22,
                height: 22,
                decoration: const BoxDecoration(
                  color: AppColors.offline,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.close,
                  size: 14,
                  color: AppColors.onPrimary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Tile "agregar foto" con ícono de cámara; se apaga al llegar al máximo.
class _AddTile extends StatelessWidget {
  const _AddTile({required this.enabled, this.onTap});

  final bool enabled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: _tileSize,
        height: _tileSize,
        decoration: BoxDecoration(
          color: enabled
              ? AppColors.surfaceContainer
              : AppColors.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: enabled ? AppColors.outlineVariant : AppColors.outline,
          ),
        ),
        child: Icon(
          Icons.add_a_photo_outlined,
          size: 28,
          color: enabled ? AppColors.primary : AppColors.outline,
        ),
      ),
    );
  }
}
